// STEP 1 — Accuracy Hybrid Engine:
// - Splits contract into numbered clauses in code
// - Analyzes clauses in batches with Gemini (temperature: 0.1) returning strict structured JSON
// - Runs per-contract-type rules checklist & merges rule hits with AI findings
// - Verifies every finding against source text (drops unverified & logs count)
// - Computes overall_risk_score strictly in code (High=20, Medium=8, Low=3, cap 100)
// - Runs per-contract-type Missing Protections check

import { analyzeContractLocal } from './analyzer.js';
import {
  splitIntoNumberedClauses,
  runChecklistRulesOnClauses,
  mergeFindings,
  verifyFindingsAgainstSource,
  calculateDeterministicRiskScore,
  checkMissingProtections,
  attachLegalNotesFromJson
} from './accuracyPipeline.js';

const BATCH_SIZE = 6;

function buildBatchPrompt(batchClauses, contractTypeLabel, jurisdictionLabel = '') {
  const formatted = batchClauses.map((c) => `[${c.clause_id}] (Page ${c.page} — ${c.sectionTitle}): ${c.text}`).join('\n');
  return `You are ContractLens AI analyzing numbered clauses of a ${contractTypeLabel}${jurisdictionLabel ? ` (Jurisdiction context: ${jurisdictionLabel})` : ''}.
Identify ONLY clauses that pose genuine risk (hidden/processing fees, lock-in, deposit deductions, auto-renewal, long/asymmetric notice period, prepayment/foreclosure charges, unilateral termination/rate changes, penalties, non-compete, unfair liability waivers).
CRITICAL RULES:
- Copy "original_text" VERBATIM from the clause text below. Do NOT paraphrase or invent text.
- Do NOT compute an overall score.
- Return ONLY valid JSON matching this exact schema:
{
  "findings": [
    {
      "clause_id": "C1",
      "original_text": "exact verbatim sentence from the clause",
      "category": "hidden_fee | auto_renewal | unfair_clause | termination | rights_liability",
      "risk_level": "High | Medium | Low",
      "confidence": 0.92,
      "simple_explanation": "Plain-language explanation",
      "why_it_matters": "Practical impact on the user",
      "question_to_ask": "Direct question to ask before signing",
      "negotiation_suggestion": "Fair alternative or revision to request"
    }
  ]
}

CLAUSES TO ANALYZE:
${formatted}`;
}

async function callGeminiBatch(apiKey, prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      }),
      signal: AbortSignal.timeout(20000)
    }
  );
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = await res.json();
  const parsed = JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
  return Array.isArray(parsed.findings) ? parsed.findings : [];
}

async function callOpenAIBatch(apiKey, prompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.1,
      messages: [
        { role: 'system', content: 'Return strict JSON only. Quote original_text verbatim.' },
        { role: 'user', content: prompt }
      ]
    }),
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
  const data = await res.json();
  const parsed = JSON.parse(data?.choices?.[0]?.message?.content || '{}');
  return Array.isArray(parsed.findings) ? parsed.findings : [];
}

export async function analyzeContractHybrid({
  text,
  title,
  requestedType = 'auto',
  fileName = null,
  jurisdiction = '',
  llmConfig = {}
}) {
  // 1. Run base deterministic analyzer & split into numbered clauses in code
  const base = analyzeContractLocal({ text, title, requestedType, fileName });
  const clauses = splitIntoNumberedClauses(base.originalText);

  // 2. Run contract-type rules-based checklist on numbered clauses
  const checklistHits = runChecklistRulesOnClauses(clauses, base.contractType.type);

  // 3. Optionally analyze clauses in batches with Gemini (temperature 0.1) or OpenAI
  const provider =
    llmConfig.provider || (process.env.GEMINI_API_KEY ? 'gemini' : process.env.OPENAI_API_KEY ? 'openai' : 'local');
  const apiKey =
    llmConfig.apiKey ||
    (provider === 'gemini' ? process.env.GEMINI_API_KEY : provider === 'openai' ? process.env.OPENAI_API_KEY : '');

  let aiFindings = [];
  let batchesProcessed = 0;

  if (apiKey && provider !== 'local') {
    try {
      const batches = [];
      for (let i = 0; i < clauses.length; i += BATCH_SIZE) {
        batches.push(clauses.slice(i, i + BATCH_SIZE));
      }

      for (const batch of batches) {
        const prompt = buildBatchPrompt(batch, base.contractType.label, jurisdiction);
        const batchRes = provider === 'gemini' ? await callGeminiBatch(apiKey, prompt) : await callOpenAIBatch(apiKey, prompt);
        aiFindings.push(...batchRes);
        batchesProcessed++;
      }

      base.engine =
        provider === 'gemini'
          ? `ContractLens Hybrid + Gemini 2.5 Flash (temp 0.1 · ${batchesProcessed} batch${batchesProcessed === 1 ? '' : 'es'})`
          : `ContractLens Hybrid + OpenAI GPT-4o-mini (temp 0.1 · ${batchesProcessed} batch${batchesProcessed === 1 ? '' : 'es'})`;
    } catch (err) {
      base.llmFallbackNote = `Live ${provider} batch analysis unavailable (${err.message}); completed with deterministic Rules Checklist.`;
    }
  } else {
    base.engine = 'ContractLens Verified Rules & Clause Engine v3.1';
  }

  // 4. Merge rule hits + base findings + Gemini AI findings
  const mergedCandidates = mergeFindings({
    baseFindings: base.findings,
    checklistHits,
    aiFindings,
    clauses
  });

  // 5. Verify EVERY finding against source text (drops unverified & logs exact count!)
  const { verified: verifiedRaw, stats: verificationStats } = verifyFindingsAgainstSource(mergedCandidates, base.originalText);
  const verified = attachLegalNotesFromJson(verifiedRaw, base.contractType.type);

  // 6. Compute smooth non-capping Safety Score & Risk strictly in code
  const scoreObj = calculateDeterministicRiskScore(verified);

  // 7. Run per-contract-type Missing Protections check
  const missing_protections = checkMissingProtections(base.originalText, base.contractType.type);

  // Sync updated verified findings, deterministic scores, and dashboard counters back onto analysis object
  const highCount = scoreObj.breakdown.highCount;
  const mediumCount = scoreObj.breakdown.mediumCount;
  const lowCount = scoreObj.breakdown.lowCount;

  base.clauses = clauses;
  base.findings = verified;
  base.overall_risk_score = scoreObj.overall_risk_score;
  base.rawRiskPoints = scoreObj.rawRiskPoints;
  base.riskScoreFormula = scoreObj.formula;
  base.safetyScore = scoreObj.safetyScore;
  base.grade = scoreObj.grade;
  base.verdict = scoreObj.verdict;
  base.verdictTone = scoreObj.verdictTone;
  base.verificationStats = {
    ...verificationStats,
    clausesAnalyzed: clauses.length,
    aiBatchesProcessed: batchesProcessed
  };
  base.missing_protections = missing_protections;

  // Sync trafficLightSections & financialExposure with all merged/verified findings
  if (Array.isArray(base.trafficLightSections) && base.trafficLightSections.length) {
    base.trafficLightSections = base.trafficLightSections.map((sec) => {
      const secFindings = verified.filter((f) => f.start >= sec.start - 5 && f.start < sec.end);
      if (!secFindings.length) return sec;
      const hasRed = secFindings.some((f) => f.trafficLight === 'red');
      return {
        ...sec,
        trafficLight: hasRed ? 'red' : 'yellow',
        findingCount: secFindings.length,
        plainSummary: secFindings[0].simple_explanation || secFindings[0].plainEnglish || sec.plainSummary,
        whyItMatters: secFindings[0].why_it_matters || secFindings[0].whyItMatters || sec.whyItMatters,
        actionHint: secFindings[0].question_to_ask || secFindings[0].question || sec.actionHint
      };
    });
  }

  // Recompute financialExposure if verified findings mention dollar/rupee amounts missed by base
  if (verified.length > 0 && (!base.financialExposure || base.financialExposure.totalAtRisk === 0)) {
    let extraRisk = 0;
    const breakdown = [];
    const seen = new Set();
    for (const f of verified) {
      const rx = /[₹$]\s?(\d{1,3}(?:,\d{2,3})*(?:\.\d{2})?)/g;
      let m;
      while ((m = rx.exec(f.original_text || '')) !== null) {
        const val = parseFloat(m[1].replace(/,/g, '')) || 0;
        if (val <= 0 || seen.has(`${f.id}-${val}`)) continue;
        seen.add(`${f.id}-${val}`);
        extraRisk += val;
        breakdown.push({ label: f.title, amount: val, period: 'at risk' });
      }
    }
    if (extraRisk > 0) {
      base.financialExposure = {
        currency: base.currency || '$',
        estimatedExtraAnnualCost: 0,
        maxPenaltyExposure: Math.round(extraRisk),
        totalAtRisk: Math.round(extraRisk),
        breakdown
      };
    }
  }

  base.counts = {
    total: verified.length,
    high: highCount,
    medium: mediumCount,
    low: lowCount,
    critical: highCount
  };
  base.trafficLightCounts = {
    red: highCount,
    yellow: mediumCount,
    green: Math.max(0, (base.trafficLightSections || []).filter((s) => s.trafficLight === 'green').length)
  };

  // Update smart dashboard bucket counts to match verified merged findings
  const feesCount = verified.filter((f) => f.dashboardGroup === 'fees').length;
  const renewalsCount = verified.filter((f) => f.dashboardGroup === 'renewals').length;
  const penaltiesCount = verified.filter((f) => f.dashboardGroup === 'penalties').length;
  base.smartDashboard.clausesNeedingAttention = verified.length;
  base.smartDashboard.cards = [
    {
      id: 'fees',
      title: 'Fees & Deductions',
      count: feesCount,
      tone: feesCount > 0 ? 'red' : 'green',
      subtitle: feesCount > 0 ? 'Additional charges or deductions may apply' : 'No hidden fee traps detected'
    },
    {
      id: 'renewals',
      title: 'Renewal & Deadlines',
      count: renewalsCount,
      tone: renewalsCount > 0 ? 'yellow' : 'green',
      subtitle: renewalsCount > 0 ? 'Automatic renewal or notice lock-in found' : 'No auto-renewal trap detected'
    },
    {
      id: 'penalties',
      title: 'Responsibilities & Penalties',
      count: penaltiesCount,
      tone: penaltiesCount > 0 ? 'red' : 'green',
      subtitle: penaltiesCount > 0 ? 'Review obligations, waivers & penalties' : 'Balanced obligations'
    }
  ];

  // Refresh executive summary with code-computed overall_risk_score
  base.executiveSummary =
    verified.length === 0
      ? `Analyzed ${clauses.length} numbered clauses. Overall Risk Score: 0/100 (Grade A). No high-risk traps detected; review the ${missing_protections.length} missing protection check(s) before signing.`
      : `Analyzed ${clauses.length} numbered clauses. Overall Risk Score: ${scoreObj.overall_risk_score}/100 (${highCount} High, ${mediumCount} Medium, ${lowCount} Low verified findings; ${verificationStats.droppedUnverifiedCount} unverified dropped). ${missing_protections.length} recommended protection(s) missing.`;

  // Rebuild questionsToAsk from verified findings
  base.questionsToAsk = verified.map((f, i) => ({
    priority: i + 1,
    severity: f.severity,
    trafficLight: f.trafficLight,
    clause_id: f.clause_id,
    clauseTitle: f.title,
    sectionTitle: f.sectionTitle,
    page: f.page,
    question: f.question_to_ask || f.question,
    whyItMatters: f.why_it_matters || f.whyItMatters,
    benchmark: f.benchmark || 'Standard fair contract benchmark.'
  }));

  return base;
}
