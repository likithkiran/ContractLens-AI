// Idea 6 — Contract Comparison AI ("Compare Before You Accept")
// Extracts structured key terms side-by-side (Rent, Deposit, Notice, Late Fee, Renewal, APR, Payout)
// supporting both ₹ (INR) and $ (USD), plus AI explanation of every unfavorable shift!

import { analyzeContractLocal, detectCurrency, formatCurrencyAmount } from '../ai/analyzer.js';
import { analyzeContractHybrid } from '../ai/llmProvider.js';
import { parseUploadedDocument } from '../documents/documentParser.js';

function extractTermValue(text, patterns, fallback = 'Not specified') {
  for (const rx of patterns) {
    const m = rx.exec(text);
    if (m) return (m[1] || m[0]).replace(/\s+/g, ' ').trim();
  }
  return fallback;
}

function extractNumeric(str) {
  const m = String(str || '').match(/(\d+(?:,\d{2,3})*(?:\.\d+)?)/);
  return m ? parseFloat(m[1].replace(/,/g, '')) : null;
}

function extractStructuredTerms(text) {
  const currency = detectCurrency(text);
  const rent = extractTermValue(text, [
    /(?:monthly\s+(?:base\s+)?rent(?:\s+is|\s*:)?\s*)([₹$]\s?[\d,]+(?:\.\d{2})?)/i,
    /rent\s+of\s+([₹$]\s?[\d,]+)/i
  ]);
  const deposit = extractTermValue(text, [
    /(?:security\s+deposit(?:\s+of|\s+is|\s*:)?\s*)([₹$]\s?[\d,]+(?:\.\d{2})?)/i,
    /(?:deposit\s+of\s+)([₹$]\s?[\d,]+)/i
  ]);
  const notice = extractTermValue(text, [
    /notice\s+period(?:\s+is|\s+of|\s*:)?\s*(\d+\s*(?:days?|months?))/i,
    /(?:at\s+least|minimum|providing)\s+(\d+|thirty|sixty|ninety|one|two|three)\s*\(?\d*\)?\s*(days?|months?)\s+(?:written\s+)?notice/i,
    /(\d+\s*(?:days?|months?))\s+(?:prior\s+)?(?:written\s+)?notice/i
  ]);
  const lateFee = extractTermValue(text, [
    /(?:late\s+(?:fee|charge)(?:\s+of|\s+is|\s*:)?\s*)([₹$]\s?[\d,]+(?:\s*\+\s*[₹$][\d,]+\/day|\s+plus\s+[₹$][\d,]+\s+per\s+day)?|\d+%)/i
  ]);
  const renewal = /automatically\s+renew|auto[- ]?renew/i.test(text)
    ? 'Automatic Renewal'
    : /manual\s+renewal|renewal\s+(?:is\s+)?manual|month-to-month|mutual\s+written\s+consent|opt-in/i.test(text)
    ? 'Manual / Mutual Opt-In'
    : 'Not specified';

  const apr = extractTermValue(text, [
    /(?:apr|interest\s+rate)(?:\s+is|\s+of|\s*:)?\s*(\d+(?:\.\d+)?%)/i
  ]);
  const payout = extractTermValue(text, [
    /(net[- ]?\d+\s*basis|weekly\s+payout|monthly\s+salary|bi-weekly)/i,
    /(?:pay|rate)(?:\s+is|\s+of)?\s*([₹$]\s?[\d,]+(?:\.\d{2})?\s*(?:per\s+hour|\/\s*(?:hr|order|month)))/i
  ]);
  const hiddenFees = extractTermValue(text, [
    /(?:mandatory\s+(?:recurring\s+)?(?:monthly\s+)?(?:charges|fees)[^.\n]{0,80})/i,
    /(?:origination[^.\n]{0,55})/i,
    /no\s+hidden\s+(?:fees|charges)|fee-free/i
  ], 'None detected');

  return { currency, rent, deposit, notice, lateFee, renewal, apr, payout, hiddenFees };
}

function buildComparisonTable(textA, textB) {
  const a = extractStructuredTerms(textA);
  const b = extractStructuredTerms(textB);
  const rows = [];

  const addRow = (category, valA, valB, lowerIsBetter = true) => {
    if (valA === 'Not specified' && valB === 'Not specified') return;
    let verdict = 'same';
    if (valA !== valB) {
      const numA = extractNumeric(valA);
      const numB = extractNumeric(valB);
      if (category === 'Renewal') {
        verdict = valB === 'Automatic Renewal' && valA !== 'Automatic Renewal'
          ? 'worse_b'
          : valA === 'Automatic Renewal' && valB !== 'Automatic Renewal'
          ? 'better_b'
          : 'changed';
      } else if (numA !== null && numB !== null && lowerIsBetter) {
        verdict = numB > numA ? 'worse_b' : numB < numA ? 'better_b' : 'same';
      } else {
        verdict = 'changed';
      }
    }
    rows.push({ category, valueA: valA, valueB: valB, verdict });
  };

  addRow('Monthly Rent', a.rent, b.rent, true);
  addRow('Security Deposit', a.deposit, b.deposit, true);
  addRow('Notice Period', a.notice, b.notice, true);
  addRow('Late Fee', a.lateFee, b.lateFee, true);
  addRow('Renewal', a.renewal, b.renewal, true);
  addRow('Interest Rate / APR', a.apr, b.apr, true);
  addRow('Pay / Payout Cycle', a.payout, b.payout, false);

  return rows;
}

export function compareContracts({ contractA, contractB }) {
  const resultA = analyzeContractLocal({
    text: contractA.text,
    title: contractA.title || 'Contract A',
    requestedType: contractA.contractType || 'auto'
  });
  const resultB = analyzeContractLocal({
    text: contractB.text,
    title: contractB.title || 'Contract B',
    requestedType: contractB.contractType || 'auto'
  });

  const tableRows = buildComparisonTable(contractA.text, contractB.text);
  const rulesA = new Map(resultA.findings.map((f) => [f.ruleId, f]));
  const rulesB = new Map(resultB.findings.map((f) => [f.ruleId, f]));

  const resolvedRisks = [...rulesA.values()].filter((f) => !rulesB.has(f.ruleId));
  const newRisks = [...rulesB.values()].filter((f) => !rulesA.has(f.ruleId));
  const remainingRisks = [...rulesB.values()].filter((f) => rulesA.has(f.ruleId));

  // Build plain-English change narrative
  const worseItems = tableRows.filter((r) => r.verdict === 'worse_b').map((r) => `${r.category.toLowerCase()} (${r.valueA} → ${r.valueB})`);
  const betterItems = tableRows.filter((r) => r.verdict === 'better_b').map((r) => `${r.category.toLowerCase()} (${r.valueA} → ${r.valueB})`);

  let aiNarrative = '';
  if (worseItems.length > 0) {
    aiNarrative += `${resultB.title} is stricter or costlier on: ${worseItems.join(', ')}. `;
  }
  if (betterItems.length > 0) {
    aiNarrative += `${resultB.title} improves on: ${betterItems.join(', ')}. `;
  }
  if (resultB.safetyScore > resultA.safetyScore) {
    aiNarrative += `Overall, ${resultB.title} is safer by +${resultB.safetyScore - resultA.safetyScore} points (${resolvedRisks.length} risks eliminated).`;
  } else if (resultA.safetyScore > resultB.safetyScore) {
    aiNarrative += `Overall, ${resultA.title} is significantly safer by +${resultA.safetyScore - resultB.safetyScore} points (${newRisks.length} new risk traps appear in ${resultB.title}).`;
  } else {
    aiNarrative += `Both contracts carry a similar overall safety score (${resultA.safetyScore}/100). Review the side-by-side table carefully before accepting.`;
  }

  return {
    currency: resultA.currency || resultB.currency || '₹',
    scoreDelta: resultB.safetyScore - resultA.safetyScore,
    exposureDelta: (resultA.financialExposure?.totalAtRisk || 0) - (resultB.financialExposure?.totalAtRisk || 0),
    winner: resultB.safetyScore > resultA.safetyScore ? 'B' : resultA.safetyScore > resultB.safetyScore ? 'A' : 'tie',
    aiNarrative: aiNarrative.trim(),
    tableRows,
    resolvedRisks,
    newRisks,
    remainingRisks,
    contractA: resultA,
    contractB: resultB
  };
}


// ==================== STEP 2: MULTI-DOCUMENT COMPARISON (2 TO 5 DOCUMENTS) ====================

function parseDurationToDays(str = '') {
  const m = String(str).match(/(\d+|one|two|three|thirty|sixty|ninety)\s*(days?|months?|years?)/i);
  if (!m) return null;
  const wordMap = { one: 1, two: 2, three: 3, thirty: 30, sixty: 60, ninety: 90 };
  const n = wordMap[m[1].toLowerCase()] ?? parseFloat(m[1]);
  if (Number.isNaN(n)) return null;
  const unit = m[2].toLowerCase();
  if (unit.startsWith('year')) return n * 365;
  if (unit.startsWith('month')) return n * 30;
  return n;
}

function extractNormalizedKeyTerms(text, analysis) {
  const cur = analysis.currency || detectCurrency(text);
  const s = extractStructuredTerms(text);

  const amountVal = extractTermValue(text, [
    /(?:monthly\s+(?:base\s+)?rent(?:\s+is|\s*:)?\s*)([₹$]\s?[\d,]+(?:\.\d{2})?)/i,
    /(?:principal\s+loan\s+amount(?:\s+is|\s*:)?\s*)([₹$]\s?[\d,]+(?:\.\d{2})?)/i,
    /(?:shall\s+pay|rate\s+is|salary\s+is)\s*([₹$]\s?[\d,]+(?:\.\d{2})?(?:\s*(?:per\s+hour|\/\s*hr|\/\s*month))?)/i
  ]);

  const duration = extractTermValue(text, [
    /(?:tenure|term)(?:\s+is|\s*:)?\s*(\d+\s*(?:months?|years?))/i,
    /(?:initial\s+lease\s+term|for\s+an\s+additional)\s+[^.\n]{0,40}?(\d+\s*(?:months?|years?))/i,
    /(11[- ]?months?|12[- ]?months?|24[- ]?months?|36[- ]?months?|48[- ]?months?)/i
  ]);

  const lockIn = extractTermValue(text, [
    /lock[- ]?in(?:\s+period)?(?:\s+of|\s+is|\s*:)?\s*(\d+\s*(?:months?|days?|years?))/i,
    /before\s+(\d+\s*months?)\s+results\s+in/i,
    /prior\s+to\s+completing\s+(\d+\s+installments)/i
  ], 'None stated');

  const feesNumeric = analysis.financialExposure?.estimatedExtraAnnualCost || 0;
  const penaltiesNumeric = analysis.financialExposure?.maxPenaltyExposure || 0;
  const baseNumeric = extractNumeric(amountVal) || 0;
  const depositNumeric = extractNumeric(s.deposit) || 0;

  // Deterministic code-computed total estimated 12-month cost / exposure
  let estimatedTotalCost = feesNumeric + penaltiesNumeric;
  if (analysis.contractType.type === 'rental' && baseNumeric > 0) {
    estimatedTotalCost = baseNumeric * 12 + feesNumeric + depositNumeric;
  } else if (analysis.contractType.type === 'loan' && baseNumeric > 0) {
    const aprNum = extractNumeric(s.apr) || 0;
    const estAnnualInterest = Math.round(baseNumeric * (aprNum / 100));
    estimatedTotalCost = baseNumeric + estAnnualInterest + feesNumeric;
  }

  return {
    amount: { display: amountVal, numeric: baseNumeric || null },
    deposit: { display: s.deposit, numeric: depositNumeric || null },
    fees: {
      display: feesNumeric > 0 ? formatCurrencyAmount(feesNumeric, cur) : 'None detected',
      numeric: feesNumeric
    },
    duration: { display: duration, numeric: parseDurationToDays(duration) },
    noticePeriod: { display: s.notice, numeric: parseDurationToDays(s.notice) },
    lockIn: { display: lockIn, numeric: lockIn === 'None stated' ? 0 : parseDurationToDays(lockIn) },
    autoRenewal: {
      display: s.renewal,
      numeric: s.renewal === 'Automatic Renewal' ? 2 : s.renewal === 'Manual / Mutual Opt-In' ? 0 : 1
    },
    penalties: {
      display:
        penaltiesNumeric > 0
          ? formatCurrencyAmount(penaltiesNumeric, cur)
          : s.lateFee !== 'Not specified'
          ? s.lateFee
          : 'None detected',
      numeric: penaltiesNumeric > 0 ? penaltiesNumeric : extractNumeric(s.lateFee) || 0
    },
    estimatedTotalCost: {
      display: estimatedTotalCost > 0 ? formatCurrencyAmount(estimatedTotalCost, cur) : formatCurrencyAmount(0, cur),
      numeric: estimatedTotalCost
    }
  };
}

function buildMultiDocTable(docs) {
  const rowDefs = [
    { key: 'amount', label: 'Base Amount / Rent / Rate', lowerIsBetter: true },
    { key: 'deposit', label: 'Security Deposit', lowerIsBetter: true },
    { key: 'fees', label: 'Extra / Hidden Fees (Annualized)', lowerIsBetter: true },
    { key: 'duration', label: 'Duration / Tenure', lowerIsBetter: false },
    { key: 'noticePeriod', label: 'Notice Period', lowerIsBetter: true },
    { key: 'lockIn', label: 'Lock-In Period', lowerIsBetter: true },
    { key: 'autoRenewal', label: 'Auto-Renewal', lowerIsBetter: true },
    { key: 'penalties', label: 'Penalties / Late Charges', lowerIsBetter: true },
    { key: 'estimatedTotalCost', label: 'Est. Total Cost / Exposure', lowerIsBetter: true }
  ];

  const rows = [];
  for (const def of rowDefs) {
    const cells = docs.map((d) => d.terms[def.key]);
    const numericVals = cells.map((c) => (typeof c.numeric === 'number' ? c.numeric : null));
    const validNums = numericVals.filter((n) => n !== null);
    const hasDifference = validNums.length >= 2 && Math.min(...validNums) !== Math.max(...validNums);

    let bestIndexes = [];
    let worstIndexes = [];
    if (hasDifference && def.lowerIsBetter) {
      const minVal = Math.min(...validNums);
      const maxVal = Math.max(...validNums);
      numericVals.forEach((n, idx) => {
        if (n === minVal) bestIndexes.push(idx);
        if (n === maxVal) worstIndexes.push(idx);
      });
    }

    rows.push({
      key: def.key,
      label: def.label,
      values: cells.map((c) => c.display),
      bestIndexes,
      worstIndexes
    });
  }
  return rows;
}

export async function compareManyContracts({ documents = [], llmConfig = {} }) {
  if (!Array.isArray(documents) || documents.length < 2 || documents.length > 5) {
    throw new Error('Please provide between 2 and 5 documents to compare.');
  }

  const analyzedDocs = [];
  for (let i = 0; i < documents.length; i++) {
    const rawDoc = documents[i];
    const parsed = parseUploadedDocument({
      fileName: rawDoc.fileName || `document-${i + 1}.txt`,
      contentBase64: rawDoc.contentBase64,
      text: rawDoc.text
    });
    const title = (rawDoc.title && rawDoc.title.trim()) || `Document ${String.fromCharCode(65 + i)}`;
    const analysis = await analyzeContractHybrid({
      text: parsed.text,
      title,
      requestedType: rawDoc.contractType || 'auto',
      fileName: rawDoc.fileName || null,
      llmConfig
    });

    const terms = extractNormalizedKeyTerms(parsed.text, analysis);
    analyzedDocs.push({
      id: `cmp-doc-${i + 1}`,
      title,
      contractType: analysis.contractType,
      currency: analysis.currency,
      wordCount: analysis.wordCount,
      safetyScore: analysis.safetyScore,
      overall_risk_score: analysis.overall_risk_score,
      grade: analysis.grade,
      verdict: analysis.verdict,
      riskCounts: {
        high: analysis.counts.high ?? analysis.counts.critical ?? 0,
        medium: analysis.counts.medium ?? 0,
        low: analysis.counts.low ?? 0,
        total: analysis.counts.total ?? 0
      },
      financialExposure: analysis.financialExposure,
      terms,
      findings: analysis.findings
    });
  }

  // Check comparability: different contract types OR different currencies => warn and do NOT rank!
  const uniqueTypes = [...new Set(analyzedDocs.map((d) => d.contractType.type))];
  const uniqueCurrencies = [...new Set(analyzedDocs.map((d) => d.currency))];
  const typeMismatch = uniqueTypes.length > 1;
  const currencyMismatch = uniqueCurrencies.length > 1;
  const comparable = !typeMismatch && !currencyMismatch;

  const tableRows = buildMultiDocTable(analyzedDocs);

  // Unique risks per document & risks common to ALL documents (keyed by ruleId/title)
  const riskKey = (f) => f.ruleId || f.title.toLowerCase();
  const docRiskMaps = analyzedDocs.map((d) => new Map(d.findings.map((f) => [riskKey(f), f])));

  const allKeys = new Set();
  docRiskMaps.forEach((m) => m.forEach((_, k) => allKeys.add(k)));

  const commonRisks = [];
  for (const k of allKeys) {
    if (docRiskMaps.every((m) => m.has(k))) {
      const sample = docRiskMaps[0].get(k);
      commonRisks.push({ key: k, title: sample.title, risk_level: sample.risk_level, question: sample.question_to_ask || sample.question });
    }
  }

  const uniqueRisksPerDocument = analyzedDocs.map((d, idx) => {
    const unique = [];
    for (const [k, f] of docRiskMaps[idx].entries()) {
      const inOthers = docRiskMaps.some((m, j) => j !== idx && m.has(k));
      if (!inOthers) {
        unique.push({ key: k, title: f.title, risk_level: f.risk_level, plainEnglish: f.simple_explanation || f.plainEnglish });
      }
    }
    return { title: d.title, risks: unique };
  });

  // Combined cross-document negotiation list ("Ask Document A to remove X, as Document B has none")
  const combinedNegotiationList = [];
  for (let i = 0; i < analyzedDocs.length; i++) {
    const docA = analyzedDocs[i];
    for (const [k, f] of docRiskMaps[i].entries()) {
      const cleanerPeer = analyzedDocs.find((other, j) => j !== i && !docRiskMaps[j].has(k));
      if (cleanerPeer) {
        combinedNegotiationList.push({
          targetDoc: docA.title,
          benchmarkDoc: cleanerPeer.title,
          clauseTitle: f.title,
          risk_level: f.risk_level,
          suggestion: `Ask ${docA.title} to remove or revise "${f.title}", as ${cleanerPeer.title} does not include this risk.`
        });
      }
    }
  }

  if (!comparable) {
    const reasons = [];
    if (typeMismatch) reasons.push(`different contract types detected (${uniqueTypes.join(' vs. ')})`);
    if (currencyMismatch) reasons.push(`different currencies detected (${uniqueCurrencies.join(' vs. ')})`);
    return {
      comparable: false,
      warning: `These documents cannot be ranked side-by-side because ${reasons.join(' and ')}. Upload contracts of the same type and currency to enable ranking.`,
      currency: uniqueCurrencies[0] || '₹',
      documents: analyzedDocs,
      tableRows,
      ranking: null,
      commonRisks,
      uniqueRisksPerDocument,
      combinedNegotiationList: combinedNegotiationList.slice(0, 12)
    };
  }

  // Ranking: Safest, Lowest Cost, Most Balanced
  const bySafety = [...analyzedDocs].sort((a, b) => b.safetyScore - a.safetyScore || a.terms.estimatedTotalCost.numeric - b.terms.estimatedTotalCost.numeric);
  const byCost = [...analyzedDocs].sort((a, b) => a.terms.estimatedTotalCost.numeric - b.terms.estimatedTotalCost.numeric || b.safetyScore - a.safetyScore);

  const maxCost = Math.max(1, ...analyzedDocs.map((d) => d.terms.estimatedTotalCost.numeric));
  const minCost = Math.min(...analyzedDocs.map((d) => d.terms.estimatedTotalCost.numeric));
  const costSpan = Math.max(1, maxCost - minCost);

  const byBalanced = [...analyzedDocs]
    .map((d) => {
      const costScore = maxCost === minCost ? 100 : Math.round(100 * (1 - (d.terms.estimatedTotalCost.numeric - minCost) / costSpan));
      const balancedScore = Math.round(d.safetyScore * 0.6 + costScore * 0.4);
      return { ...d, balancedScore };
    })
    .sort((a, b) => b.balancedScore - a.balancedScore);

  const safest = bySafety[0];
  const lowestCost = byCost[0];
  const balanced = byBalanced[0];

  const safetyGap = bySafety.length > 1 ? bySafety[0].safetyScore - bySafety[1].safetyScore : 0;
  const safetyConfidence = safetyGap >= 15 ? 'High' : safetyGap >= 6 ? 'Medium' : 'Low';
  const costGapPct =
    byCost.length > 1 && byCost[1].terms.estimatedTotalCost.numeric > 0
      ? ((byCost[1].terms.estimatedTotalCost.numeric - byCost[0].terms.estimatedTotalCost.numeric) /
          byCost[1].terms.estimatedTotalCost.numeric) *
        100
      : 0;
  const costConfidence = costGapPct >= 12 ? 'High' : costGapPct >= 4 ? 'Medium' : 'Low';
  const balancedConfidence = safetyConfidence === 'High' || costConfidence === 'High' ? 'High' : 'Medium';

  return {
    comparable: true,
    warning: null,
    contractType: uniqueTypes[0],
    currency: uniqueCurrencies[0],
    documents: analyzedDocs,
    tableRows,
    ranking: {
      safest: {
        title: safest.title,
        safetyScore: safest.safetyScore,
        confidence: safetyConfidence,
        reason: `${safest.title} is least risky based on our analysis (Safety Score ${safest.safetyScore}/100 with ${safest.riskCounts.high} High-risk clause${safest.riskCounts.high === 1 ? '' : 's'}).`
      },
      lowestCost: {
        title: lowestCost.title,
        estimatedTotalCost: lowestCost.terms.estimatedTotalCost.display,
        confidence: costConfidence,
        reason: `${lowestCost.title} has the lowest estimated total cost/exposure (${lowestCost.terms.estimatedTotalCost.display}).`
      },
      mostBalanced: {
        title: balanced.title,
        balancedScore: balanced.balancedScore,
        confidence: balancedConfidence,
        reason: `${balanced.title} offers the strongest combined balance of safety (${balanced.safetyScore}/100) and cost (${balanced.terms.estimatedTotalCost.display}), making it least risky overall for the price based on our analysis.`
      }
    },
    commonRisks,
    uniqueRisksPerDocument,
    combinedNegotiationList: combinedNegotiationList.slice(0, 12)
  };
}
