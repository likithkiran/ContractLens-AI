// STEP 1 & STEP 3 & STEP 4 — Accuracy Pipeline + Smooth Scoring + Legal Notes Loader
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LAWS_FILE = path.join(__dirname, '..', 'shared', 'laws.json');

let cachedLaws = null;
function loadLawsCatalog() {
  if (cachedLaws) return cachedLaws;
  try {
    cachedLaws = JSON.parse(fs.readFileSync(LAWS_FILE, 'utf8'));
  } catch {
    cachedLaws = {};
  }
  return cachedLaws;
}

/**
 * Attaches a "Legal note" from shared/laws.json ONLY when contractType + category match.
 * Every note is explicitly marked "Verify before relying".
 */
export function attachLegalNotesFromJson(findings = [], contractType = 'rental') {
  const catalog = loadLawsCatalog();
  const domainMap = catalog[contractType] || {};
  return findings.map((f) => {
    const match = domainMap[f.category];
    if (!match) return { ...f, legal_note: null };
    return {
      ...f,
      legal_note: {
        law_name: match.law_name,
        generally_covers: match.generally_covers,
        placeholder: Boolean(match.placeholder),
        verification_label: 'Verify before relying'
      }
    };
  });
}

/**
 * 1. Splits contract text into numbered clauses in code, preserving exact offsets & page numbers
 */
export function splitIntoNumberedClauses(text = '') {
  const clean = String(text || '').trim();
  if (!clean) return [];

  const clauses = [];
  const lines = clean.split(/\r?\n/);
  let currentSection = 'Preamble & General Terms';
  let sectionIndex = 0;
  let cursor = 0;
  let clauseNum = 0;

  for (const line of lines) {
    const lineStart = cursor;
    const trimmed = line.trim();
    cursor += line.length + 1;

    if (!trimmed) continue;

    // Detect numbered section headings OR standalone ALL-CAPS headings (e.g., "PAYMENT DEMANDS", "TERM AND RENEWAL")
    const isNumberedHeading =
      /^(?:\d+\.|section\s+\d+|article\s+[ivx\d]+)\s+[A-Z0-9 ,&\-/()₹$]+$/i.test(trimmed) &&
      trimmed.length > 4 &&
      trimmed.length < 105;
    const isAllCapsHeading =
      /^[A-Z][A-Z0-9 &/\-]{3,58}$/.test(trimmed) &&
      !/[.!?]$/.test(trimmed) &&
      trimmed.split(/\s+/).length <= 7;

    if (isNumberedHeading || isAllCapsHeading) {
      currentSection = trimmed;
      sectionIndex++;
      continue;
    }

    // Split paragraph into sentence-level clauses while keeping exact character offsets
    const sentenceRegex = /[^.!?\n]+(?:[.!?]+|$)/g;
    let sm;
    while ((sm = sentenceRegex.exec(line)) !== null) {
      const sentence = sm[0].trim();
      if (sentence.length < 18) continue;

      const offsetInLine = line.indexOf(sentence, sm.index);
      const start = lineStart + Math.max(0, offsetInLine);
      const end = start + sentence.length;
      clauseNum++;

      clauses.push({
        clause_id: `C${clauseNum}`,
        index: clauseNum,
        sectionTitle: currentSection,
        page: Math.max(1, Math.ceil(Math.max(1, sectionIndex) / 2)),
        text: sentence,
        start,
        end
      });
    }
  }

  // Fallback if entire contract had no standard punctuation
  if (clauses.length === 0 && clean.length >= 20) {
    clauses.push({
      clause_id: 'C1',
      index: 1,
      sectionTitle: 'Full Agreement',
      page: 1,
      text: clean.slice(0, 600),
      start: 0,
      end: Math.min(clean.length, 600)
    });
  }

  return clauses;
}

/**
 * 2. Contract-Type Rules-Based Checklist
 * Covers: lock-in, deposit deductions, auto-renewal, notice period, processing/hidden fees,
 * prepayment/foreclosure charges, unilateral termination, penalties, non-compete
 */
const CHECKLIST_RULES = {
  rental: [
    {
      ruleId: 'rental-lock-in',
      checklistTopic: 'lock-in',
      category: 'termination',
      dashboardGroup: 'penalties',
      risk_level: 'High',
      confidence: 0.94,
      title: 'Lock-In Period & Early Exit Forfeiture',
      patterns: [
        /lock[- ]?in\s+period/i,
        /early\s+termination[^.\n]{0,90}(?:forfeiture|forfeit|liquidated\s+damages)/i
      ],
      simple_explanation: 'Leaving before the lock-in period ends triggers security deposit forfeiture or multiple months of penalty rent.',
      why_it_matters: 'Life events like a job transfer or emergency can cost you several months of rent.',
      question_to_ask: 'Can we cap early exit after the lock-in (or during lock-in) to 1 month rent once a replacement tenant is found?',
      negotiation_suggestion: 'Request a 1-month capped break fee or allow tenant replacement without forfeiting the deposit.'
    },
    {
      ruleId: 'rental-deposit-deductions',
      checklistTopic: 'deposit deductions',
      category: 'unfair_clause',
      dashboardGroup: 'penalties',
      risk_level: 'High',
      confidence: 0.95,
      title: 'Unfair Security Deposit Deductions & Delayed Refund',
      patterns: [
        /security\s+deposit\s+shall\s+be\s+retained|wear\s+and\s+tear,\s+repainting/i,
        /returned\s+within\s+(?:sixty|ninety|60|90)\s*\(?(?:60|90)?\)?\s*days\s+after\s+vacating/i
      ],
      simple_explanation: 'Allows the landlord to hold your deposit for 60–90 days and deduct for normal wear and tear, repainting, or vague "other obligations."',
      why_it_matters: 'Vague deduction wording makes it easy to lose a large share of your refundable deposit.',
      question_to_ask: 'Will you exclude normal wear and tear, require itemized receipts, and refund the deposit within 15–21 days?',
      negotiation_suggestion: 'Specify itemized receipts only for actual damage beyond normal wear and tear, refunded within 21 days.'
    },
    {
      ruleId: 'rental-auto-renewal',
      checklistTopic: 'auto-renewal',
      category: 'auto_renewal',
      dashboardGroup: 'renewals',
      risk_level: 'High',
      confidence: 0.96,
      title: 'Automatic Renewal & Lock-In Trap',
      patterns: [
        /(?<!no\s)(?<!not\s)(?<!never\s)automatically\s+renews?\s+for\s+(?:an\s+additional\s+)?(?:\d+|one|two|three|four|five|six|twelve)/i,
        /(?<!no\s)(?<!not\s)auto[- ]?renews?\s+unless/i,
        /automatically\s+renew[^.\n]{0,90}unless[^.\n]{0,80}(?:cancels?|notice|days?|hours?)/i,
        /automatically\s+increased\s+by\s+[\d.]+%|with\s+a\s+(?:1[0-9]|[2-9]\d)%\s+increase/i
      ],
      simple_explanation: 'Automatically locks you into another long term (or higher rent) unless you cancel within a strict, short, or difficult notice window.',
      why_it_matters: 'Missing the cancellation cutoff traps you into an extended multi-year or inflated commitment you did not actively opt into.',
      question_to_ask: 'Can we replace automatic renewal with mutual written opt-in renewal and reasonable 30-day email notice?',
      negotiation_suggestion: 'Convert to opt-in renewal or month-to-month after initial term with email notice.'
    },
    {
      ruleId: 'rental-notice-period',
      checklistTopic: 'notice period',
      category: 'auto_renewal',
      dashboardGroup: 'renewals',
      risk_level: 'Medium',
      confidence: 0.9,
      title: 'Long or Rigid Notice Period Requirement',
      patterns: [
        /(?:ninety|90|sixty|60|3\s+months?)\s*\(?(?:90|60)?\)?\s*(?:days?)?\s+(?:prior|written\s+notice)/i,
        /via\s+(?:registered\s+post|certified\s+mail)/i
      ],
      simple_explanation: 'Requires 60–90 days advance notice or formal registered post instead of standard 30-day email notice.',
      why_it_matters: 'Long notice windows and postal technicalities make moving out unnecessarily hard.',
      question_to_ask: 'Can we shorten the notice period to 30 days and accept written notice via email?',
      negotiation_suggestion: 'Request mutual 30-day notice deliverable via email or messaging.'
    },
    {
      ruleId: 'rental-hidden-fees',
      checklistTopic: 'processing/hidden fees',
      category: 'hidden_fee',
      dashboardGroup: 'fees',
      risk_level: 'High',
      confidence: 0.93,
      title: 'Mandatory, Non-Refundable or Uncapped Add-On Fees',
      patterns: [
        /(?:mandatory|non-optional)\s+(?:recurring\s+)?(?:monthly\s+)?(?:charges|.*fee)/i,
        /non-refundable\s+(?:move-in|administrative|mandatory\s+painting|deep[- ]?cleaning|verification\s+deposit|deposit|fee)/i,
        /(?:processing|administrative|additional|service)\s+fee[^.\n]{0,75}(?:added\s+later|without\s+(?:a\s+)?(?:stated\s+)?limit|at\s+(?:landlord|company)'?s\s+discretion|uncapped)/i
      ],
      simple_explanation: 'Adds mandatory charges, non-refundable deposits/fees, or lets unspecified processing and administrative fees be added later with no cap.',
      why_it_matters: 'Inflates your true cost unpredictably and creates sunk costs you can never recover.',
      question_to_ask: 'Can you remove non-refundable deposits/fees and cap every charge in writing with zero unstated add-on fees?',
      negotiation_suggestion: 'Roll all mandatory costs into base rent, keep deposits refundable, and ban unstated future fees.'
    },
    {
      ruleId: 'rental-penalties',
      checklistTopic: 'penalties',
      category: 'hidden_fee',
      dashboardGroup: 'fees',
      risk_level: 'Medium',
      confidence: 0.91,
      title: 'Punitive Daily Late Fees & Tiny Grace Period',
      patterns: [
        /late\s+(?:fee|charge)\s+of\s+[₹$][\d,]+\s+plus\s+[₹$][\d,]+\s+per\s+(?:day|delayed)/i,
        /late\s+(?:fee|charge)\s+of\s+(?:1[0-9]|[2-9]\d)%/i
      ],
      simple_explanation: 'Charges heavy immediate late fines plus daily stacking penalties after barely 1–2 days.',
      why_it_matters: 'A minor weekend bank delay triggers disproportionate financial penalties.',
      question_to_ask: 'Can we include a 5-day grace period and a modest flat cap on late fees without daily accrual?',
      negotiation_suggestion: 'Add a 5-calendar-day grace period and remove per-day compounding late charges.'
    },
    {
      ruleId: 'rental-repairs-entry',
      checklistTopic: 'unilateral termination',
      category: 'unfair_clause',
      dashboardGroup: 'penalties',
      risk_level: 'High',
      confidence: 0.94,
      title: 'Repair Shifting, Habitability Waiver or Unannounced Entry',
      patterns: [
        /waives?\s+(?:any\s+)?implied\s+warranty\s+of\s+habitability|solely\s+responsible\s+for\s+all\s+interior\s+repairs/i,
        /enter\s+the\s+premises\s+at\s+any\s+time\s+without\s+prior\s+notice/i
      ],
      simple_explanation: 'Shifts major plumbing/electrical/AC repairs onto the tenant or lets the landlord enter without advance notice.',
      why_it_matters: 'Exposes you to unexpected repair bills for landlord property and removes home privacy.',
      question_to_ask: 'Will you confirm landlord covers structural/plumbing/electrical/AC repairs and gives 24 hours entry notice?',
      negotiation_suggestion: 'Strike habitability waivers, keep structural repairs on landlord, and mandate 24h written notice.'
    }
  ],

  loan: [
    {
      ruleId: 'loan-processing-fees',
      checklistTopic: 'processing/hidden fees',
      category: 'hidden_fee',
      dashboardGroup: 'fees',
      risk_level: 'High',
      confidence: 0.96,
      title: 'Upfront Origination Deduction & Recurring Junk Fees',
      patterns: [
        /origination\s+(?:&\s+(?:underwriting|processing)\s+)?fee\s+of\s+[\d.]+%|deducted\s+directly\s+from\s+(?:the\s+)?loan\s+proceeds/i,
        /(?:account\s+maintenance|convenience)\s+fee/i
      ],
      simple_explanation: 'Deducts heavy origination/processing fees from your loan before disbursement while charging full interest on the total amount, plus monthly/payment fees.',
      why_it_matters: 'You receive less cash on Day 1 while paying high interest on fees you never received.',
      question_to_ask: 'What is the exact net amount disbursed to my bank and the true all-in APR including all fees?',
      negotiation_suggestion: 'Request a Key Fact Statement (KFS), cap processing fee at 1%–2%, and remove UPI/ACH convenience fees.'
    },
    {
      ruleId: 'loan-prepayment',
      checklistTopic: 'prepayment/foreclosure charges',
      category: 'auto_renewal',
      dashboardGroup: 'renewals',
      risk_level: 'High',
      confidence: 0.95,
      title: 'Prepayment / Foreclosure Lock-In Penalty',
      patterns: [
        /prepayment\s+penalty|foreclosure\s+(?:penalty|charge)/i,
        /prior\s+to\s+completing\s+\d+\s+installments/i
      ],
      simple_explanation: 'Penalizes you with extra foreclosure fees and unearned interest if you pay off the loan early.',
      why_it_matters: 'Prevents you from becoming debt-free early or refinancing at a lower rate.',
      question_to_ask: 'Can you waive foreclosure/prepayment charges so I can prepay principal without penalty?',
      negotiation_suggestion: 'Insist on 0% prepayment/foreclosure fees as offered by prime banks and RBI floating-rate rules.'
    },
    {
      ruleId: 'loan-apr-unilateral',
      checklistTopic: 'unilateral termination',
      category: 'hidden_fee',
      dashboardGroup: 'fees',
      risk_level: 'High',
      confidence: 0.95,
      title: 'High Daily-Compounded APR & Unilateral Rate Hike',
      patterns: [
        /(?:apr|annual\s+percentage\s+rate)[^.\n]{0,35}(?:[2-9]\d|1\d\d)(?:\.\d+)?%|compounded\s+daily/i,
        /increase\s+the\s+interest\s+rate\s+up\s+to/i
      ],
      simple_explanation: 'Extremely high APR compounded daily, plus the lender can raise your interest rate unilaterally on short notice.',
      why_it_matters: 'Debt snowballs rapidly and monthly payments can jump unpredictably.',
      question_to_ask: 'Is the interest rate fixed on a monthly reducing balance, and can unilateral rate hikes be removed?',
      negotiation_suggestion: 'Switch to a fixed reducing-balance rate and strike unilateral rate-increase clauses.'
    },
    {
      ruleId: 'loan-penalties-default',
      checklistTopic: 'penalties',
      category: 'rights_liability',
      dashboardGroup: 'penalties',
      risk_level: 'High',
      confidence: 0.96,
      title: 'Cross-Default, Bounce Retries, Wage Assignment & Confession of Judgment',
      patterns: [
        /cross-default|confession\s+of\s+judgment|wage\s+assignment|irrevocable\s+authorization\s+to\s+debit/i,
        /default\s+penalty\s+interest\s+rate/i
      ],
      simple_explanation: 'Lets the lender recall the full loan over unrelated bills, repeatedly retry bank debits (causing bounce fees), garnish wages, or bypass court hearings.',
      why_it_matters: 'Severe borrower risk that strips standard financial and legal protections.',
      question_to_ask: 'Will you remove cross-default, confession of judgment, wage assignment, and repeated auto-debit retries?',
      negotiation_suggestion: 'Demand removal of cross-default & confession of judgment and require a 15-day written cure notice.'
    }
  ],

  employment: [
    {
      ruleId: 'emp-unilateral-termination-pay',
      checklistTopic: 'unilateral termination',
      category: 'unfair_clause',
      dashboardGroup: 'fees',
      risk_level: 'High',
      confidence: 0.95,
      title: 'Unilateral Pay/Incentive Cuts & Instant Deactivation Without Payment',
      patterns: [
        /unilaterally\s+(?:modify|reduce|recalculate)|adjust\s+incentives,\s+deduct\s+applicable\s+charges/i,
        /(?:permanently\s+deactivate|terminate\s+immediately)\s+[^.\n]{0,90}without\s+(?:notice|payment)/i
      ],
      simple_explanation: 'Allows the company/platform to cut your incentives or pay rates at will and terminate/deactivate you instantly without paying pending milestones.',
      why_it_matters: 'Your income and completed work are never safely guaranteed.',
      question_to_ask: 'Will you confirm pay/incentives cannot change retroactively and all completed work is paid upon termination?',
      negotiation_suggestion: 'Require 15–30 days advance notice for rate changes and guaranteed payment for completed work.'
    },
    {
      ruleId: 'emp-hidden-deductions',
      checklistTopic: 'processing/hidden fees',
      category: 'hidden_fee',
      dashboardGroup: 'fees',
      risk_level: 'High',
      confidence: 0.94,
      title: 'Long Payout Holdbacks (Net-60/90), Clawbacks & Platform Fees',
      patterns: [
        /net[- ]?(?:60|90|120)\s+basis|withhold\s+or\s+claw\s+back\s+up\s+to\s+100%/i,
        /deduct\s+[₹$][\d,]+\s+per\s+cancelled\s+slot|platform\s+technology\s+&\s+kit/i
      ],
      simple_explanation: 'Delays payouts 60–90 days, deducts monthly platform/cancellation fees, and allows 100% clawbacks on subjective complaints.',
      why_it_matters: 'Creates cash-flow strain and unpredictable deductions from earned income.',
      question_to_ask: 'Can payouts be weekly or Net-15/30 with a transparent, documented appeal process before any deduction?',
      negotiation_suggestion: 'Move to weekly or Net-15/30 payouts and require objective proof + 7-day dispute window for deductions.'
    },
    {
      ruleId: 'emp-non-compete',
      checklistTopic: 'non-compete',
      category: 'unfair_clause',
      dashboardGroup: 'penalties',
      risk_level: 'High',
      confidence: 0.96,
      title: 'Post-Exit Non-Compete & Strict Exclusivity Lock-In',
      patterns: [
        /(?:twenty-four|24|eighteen|18)\s*\(?(?:24|18)?\)?\s*months\s+following\s+termination[^.\n]{0,140}(?:competing|not\s+work)/i,
        /strict\s+exclusivity[^.\n]{0,120}may\s+not\s+perform\s+work\s+for\s+any\s+other/i
      ],
      simple_explanation: 'Bans you from working on other platforms during the contract or joining competing companies for 18–24 months after leaving.',
      why_it_matters: 'Directly restricts your ability to earn a living despite having no guaranteed employee benefits.',
      question_to_ask: 'Can we remove the post-exit non-compete and exclusivity ban, relying on a standard NDA instead?',
      negotiation_suggestion: 'Strike post-termination non-compete and replace with a focused confidentiality clause.'
    },
    {
      ruleId: 'emp-notice-lockin',
      checklistTopic: 'notice period',
      category: 'termination',
      dashboardGroup: 'penalties',
      risk_level: 'High',
      confidence: 0.92,
      title: 'Asymmetric Notice Period & Unpaid Wage Forfeiture',
      patterns: [
        /(?:sixty|ninety|60|90)\s*\(?(?:60|90)?\)?\s*days\s+written\s+notice[^.\n]{0,90}forfeits?/i
      ],
      simple_explanation: 'Forces you to give 60 days notice or lose all accrued unpaid earnings, while they can exit instantly.',
      why_it_matters: 'Earned pay should never be forfeited and notice obligations should be balanced.',
      question_to_ask: 'Can we make termination notice mutual (14–30 days) and remove wage forfeiture?',
      negotiation_suggestion: 'Set equal notice periods for both sides and confirm earned compensation is always paid.'
    },
    {
      ruleId: 'emp-penalties-ip',
      checklistTopic: 'penalties',
      category: 'unfair_clause',
      dashboardGroup: 'penalties',
      risk_level: 'High',
      confidence: 0.94,
      title: 'Sweeping Personal IP Grab, Liquidated Fines or Uncapped Indemnity',
      patterns: [
        /immediate\s+liquidated\s+damages\s+of\s+[₹$][\d,]+|penalty\s+per\s+post/i,
        /personal\s+time.*personal\s+equipment|trailer\s+clause/i,
        /indemnify[^.\n]{0,110}without\s+any\s+cap/i
      ],
      simple_explanation: 'Imposes steep fixed penalty fines, claims ownership of personal off-hours work, or exposes you to uncapped legal indemnity.',
      why_it_matters: 'Endangers your personal projects and savings far beyond the value of the contract.',
      question_to_ask: 'Can we remove fixed liquidated damages, carve out personal off-hours projects, and cap indemnity to fees paid?',
      negotiation_suggestion: 'Limit IP to paid work deliverables, cap liability at 3 months fees, and delete liquidated fines.'
    }
  ]
};

/**
 * Normalizes whitespace for reliable substring verification without losing fidelity
 */
function normalizeWs(s = '') {
  return String(s).replace(/\s+/g, ' ').trim();
}

/**
 * 3. STRICT VERIFICATION GATE:
 * Verifies every finding's `original_text` exists inside the source contract text.
 * Drops unverified findings and logs exact count dropped!
 */
export function verifyFindingsAgainstSource(findings = [], sourceText = '') {
  const normSource = normalizeWs(sourceText).toLowerCase();
  const verified = [];
  let droppedCount = 0;

  for (const f of findings) {
    const candidateQuote = String(f.original_text || f.excerpt || '').trim();
    if (candidateQuote.length < 8) {
      droppedCount++;
      continue;
    }

    const normQuote = normalizeWs(candidateQuote).toLowerCase();
    const directIdx = sourceText.indexOf(candidateQuote);
    const ciIdx = directIdx !== -1 ? directIdx : sourceText.toLowerCase().indexOf(candidateQuote.toLowerCase());
    const normFound = ciIdx !== -1 || normSource.includes(normQuote);

    if (!normFound) {
      droppedCount++;
      continue;
    }

    const start = ciIdx !== -1 ? ciIdx : Math.max(0, f.start || 0);
    const end = ciIdx !== -1 ? start + candidateQuote.length : Math.min(sourceText.length, f.end || start + candidateQuote.length);

    verified.push({
      ...f,
      original_text: candidateQuote,
      excerpt: candidateQuote,
      start,
      end,
      verified_in_source: true
    });
  }

  console.log(
    `[ContractLens Verification] Checked ${findings.length} finding(s): ${verified.length} verified in source text, ${droppedCount} dropped.`
  );

  return {
    verified,
    stats: {
      totalCandidateFindings: findings.length,
      verifiedFindings: verified.length,
      droppedUnverifiedCount: droppedCount
    }
  };
}

/**
 * 4. DETERMINISTIC CODE-ONLY SMOOTH RISK SCORING (STEP 3):
 * Raw Risk Points: High = 20, Medium = 8, Low = 3 (no flat cap at 100!)
 * Smooth curve: safetyScore = round(100 * exp(-rawPoints / 115)), strictly monotonic so
 * 5 High risks (raw 100 -> Safety 42) and 12 High risks (raw 240 -> Safety 12) remain clearly distinct!
 * The AI must NEVER decide the score.
 */
export function calculateDeterministicRiskScore(findings = []) {
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  for (const f of findings) {
    const lvl = String(f.risk_level || '').toLowerCase();
    if (lvl === 'high' || f.severity === 'critical' || f.trafficLight === 'red') {
      highCount++;
    } else if (lvl === 'medium' || f.severity === 'medium' || f.trafficLight === 'yellow') {
      mediumCount++;
    } else {
      lowCount++;
    }
  }

  const rawRiskPoints = highCount * 20 + mediumCount * 8 + lowCount * 3;
  const safetyScore =
    rawRiskPoints === 0
      ? 100
      : Math.max(1, Math.min(99, Math.round(100 * Math.exp(-rawRiskPoints / 115))));
  const overall_risk_score = 100 - safetyScore;

  let grade = 'A';
  let verdict = 'Generally Fair — Low Risk';
  let verdictTone = 'safe';
  if (safetyScore < 30) {
    grade = 'F';
    verdict = 'Very High Risk — Clarify & Negotiate Before Signing';
    verdictTone = 'critical';
  } else if (safetyScore < 50) {
    grade = 'D';
    verdict = 'Significant Risks — Major Revisions Recommended';
    verdictTone = 'critical';
  } else if (safetyScore < 68) {
    grade = 'C';
    verdict = 'Moderate Risk — Review Attention Clauses';
    verdictTone = 'warning';
  } else if (safetyScore < 85) {
    grade = 'B';
    verdict = 'Low-Moderate Risk — Minor Clarifications Suggested';
    verdictTone = 'info';
  }

  return {
    overall_risk_score,
    rawRiskPoints,
    safetyScore,
    grade,
    verdict,
    verdictTone,
    formula: 'Smooth exponential curve from code-only points (High=20, Medium=8, Low=3; no flat cap)',
    breakdown: { highCount, mediumCount, lowCount }
  };
}

/**
 * Universal Real-World Contract Risks, Contradictions & Fraud-Indicator Rules
 * Evaluated across ALL contract types (rental, loan, employment, gig, general)
 */
const UNIVERSAL_RULES = [
  {
    ruleId: 'univ-unilateral-price-change',
    checklistTopic: 'unilateral modification',
    category: 'unfair_clause',
    dashboardGroup: 'fees',
    risk_level: 'High',
    confidence: 0.95,
    title: 'Unilateral Power to Change Rent, Fees, Pay or Terms Without Notice',
    patterns: [
      /(?:may|can|reserves?\s+the\s+right\s+to)\s+(?:change|increase|alter|modify|raise)\s+(?:the\s+)?(?:rent|fees?|charges?|rate|price|terms|payment)[^.\n]{0,70}(?:at\s+any\s+time|without\s+(?:prior\s+)?notice|sole\s+discretion)/i,
      /change\s+the\s+rent\s+or\s+fees\s+at\s+any\s+time/i,
      /payment\s+destination\s+may\s+be\s+changed\s+by\s+(?:text|sms|whatsapp|phone)/i
    ],
    simple_explanation: 'Allows the other party to raise rent, add fees, or change payment destinations unilaterally at any time without advance written notice.',
    why_it_matters: 'You have zero price certainty and could be forced to pay higher amounts or send money to unverified accounts mid-contract.',
    question_to_ask: 'Will you confirm in writing that rent, fees, and verified payment account details are fixed for the full term and require signed mutual consent to change?',
    negotiation_suggestion: 'Lock all rates, fees, and verified payment details for the full contract term; require signed written addendum for any change.'
  },
  {
    ruleId: 'univ-waiver-dispute-rights',
    checklistTopic: 'waiver of rights',
    category: 'rights_liability',
    dashboardGroup: 'penalties',
    risk_level: 'High',
    confidence: 0.96,
    title: 'Sweeping Waiver of Dispute Rights & Penalty for Asking Questions',
    patterns: [
      /waives?\s+(?:every|all|any)\s+rights?\s+to\s+(?:dispute|contest|challenge|sue|claim|appeal)/i,
      /penalty\s+for\s+asking\s+questions/i,
      /forfeits?\s+all\s+(?:legal\s+)?rights/i,
      /waives?\s+(?:any|all)\s+claims?\s+against/i
    ],
    simple_explanation: 'Forces you to give up your right to dispute incorrect charges or even penalizes you for asking clarifying questions.',
    why_it_matters: 'If you are overcharged or treated unfairly, this clause tries to block you from challenging the bill or asserting legal rights.',
    question_to_ask: 'Will you remove the waiver of dispute rights and any penalty for asking questions so I retain full billing dispute and statutory rights?',
    negotiation_suggestion: 'Delete all blanket dispute waivers and question penalties; preserve full statutory rights and a written billing-dispute process.'
  },
  {
    ruleId: 'univ-wire-advance-payment-scam',
    checklistTopic: 'advance payment / wire transfer red flag',
    category: 'hidden_fee',
    dashboardGroup: 'fees',
    risk_level: 'High',
    confidence: 0.97,
    title: 'Urgent Wire Transfer, Unrelated Recipient or Pay-Before-Viewing Demand',
    patterns: [
      /wire\s+transfer[^.\n]{0,80}(?:unrelated|personal\s+account|immediately|secure\s+the\s+keys)/i,
      /pay\s+before\s+(?:viewing|inspecting|seeing)/i,
      /no\s+receipt\s+will\s+be\s+issued/i,
      /non-refundable\s+verification\s+deposit/i
    ],
    simple_explanation: 'Demands immediate irreversible payment (such as a wire transfer to an unrelated personal account or paying before viewing the property) with no receipt.',
    why_it_matters: 'Irreversible transfers to unverified third-party accounts before inspection—with no receipt—are major financial and fraud warning signs.',
    question_to_ask: 'Why is payment requested before inspection or to an unrelated personal account without a receipt? Can we inspect first and pay only to the verified owner with an official receipt?',
    negotiation_suggestion: 'Never wire money before verifying ownership and inspecting in person; require traceable payment directly to the verified contracting party with a written receipt.'
  },
  {
    ruleId: 'univ-coercion-isolation-pressure',
    checklistTopic: 'coercive pressure / anti-verification',
    category: 'unfair_clause',
    dashboardGroup: 'penalties',
    risk_level: 'High',
    confidence: 0.96,
    title: 'Coercive Pressure & Prohibition on Verification or Independent Advice',
    patterns: [
      /(?:told|instructed|prohibited|forbidden)\s+not\s+to\s+(?:contact|verify|seek|consult)/i,
      /not\s+to\s+contact[^.\n]{0,90}(?:building\s+manager|verify|independent\s+advice)/i,
      /waives?\s+(?:the\s+)?right\s+to\s+(?:seek\s+)?(?:independent\s+)?(?:legal\s+)?advice/i,
      /must\s+sign\s+immediately\s+without\s+(?:reading|review|advice)/i
    ],
    simple_explanation: 'Pressures you NOT to contact the building manager, verify the other party’s identity, or seek independent advice before paying or signing.',
    why_it_matters: 'Legitimate landlords, lenders, and employers welcome verification and independent review; blocking verification is a critical red flag.',
    question_to_ask: 'Why does the document discourage verifying ownership or seeking independent advice? Please provide verifiable ownership and contact details before any signature.',
    negotiation_suggestion: 'Do not sign under pressure or anti-verification restrictions; independently verify identity, property/company records, and take time to review.'
  },
  {
    ruleId: 'univ-identity-payee-conflict',
    checklistTopic: 'identity & payee mismatch',
    category: 'unfair_clause',
    dashboardGroup: 'penalties',
    risk_level: 'High',
    confidence: 0.96,
    title: 'Conflicting Party Names, Payee Mismatch or Missing Ownership Proof',
    patterns: [
      /(?:names?|lists?)\s+[^.\n]{2,45}\s+as\s+(?:the\s+)?(?:landlord|owner|lender|employer)[^.\n]{0,90}(?:but|however)[^.\n]{0,80}(?:payment|owner|recipient)/i,
      /no\s+proof\s+of\s+ownership|no\s+identification[^.\n]{0,60}provided/i,
      /signature\s+page\s+names?\s+a\s+different|signature\s+appears\s+copied|dates?\s+on\s+the\s+signature\s+page\s+do\s+not\s+match/i
    ],
    simple_explanation: 'Party names, payment recipients, signatures, or dates contradict each other across the document, and no proof of ownership or authorization is attached.',
    why_it_matters: 'A contract with mismatched party identities, copied signatures, or unverified payees creates severe enforceability and fraud exposure.',
    question_to_ask: 'Why do the landlord/tenant names, payee account, signature, and dates differ across pages? Can you attach verified ID and proof of ownership/authorization?',
    negotiation_suggestion: 'Verify legal identity and ownership documents before signing; ensure exact matching names, dates, and original signatures on every page.'
  },
  {
    ruleId: 'univ-conflicting-amounts',
    checklistTopic: 'contradictory financial terms',
    category: 'hidden_fee',
    dashboardGroup: 'fees',
    risk_level: 'High',
    confidence: 0.95,
    title: 'Conflicting Rent / Price Amounts Inside the Same Agreement',
    patterns: [
      /(?:rent|fee|price|salary|amount|payment)[^.\n]{0,50}[₹$][\d,]+[^.\n]{0,45}in\s+one\s+section\s+and\s+[₹$][\d,]+/i,
      /(?:listed|stated)\s+as\s+[₹$][\d,]+[^.\n]{0,40}and\s+[₹$][\d,]+\s+in\s+another/i
    ],
    simple_explanation: 'The agreement states two different payment amounts in different sections of the same document.',
    why_it_matters: 'Contradictory figures let the other party later demand the higher amount.',
    question_to_ask: 'Which exact figure is the agreed amount, and will you correct every section so the contract states one consistent price?',
    negotiation_suggestion: 'Reconcile all contradictory numbers in a single clean, consistent fee schedule before signing.'
  },
  {
    ruleId: 'univ-uncapped-fees',
    checklistTopic: 'uncapped future fees',
    category: 'hidden_fee',
    dashboardGroup: 'fees',
    risk_level: 'High',
    confidence: 0.93,
    title: 'Uncapped Processing / Administrative Fees Added Later',
    patterns: [
      /(?:additional|extra|further)\s+(?:processing|administrative|service|handling|maintenance)\s+fee[^.\n]{0,70}(?:added\s+later|without\s+(?:a\s+)?(?:stated\s+)?limit|at\s+discretion)/i,
      /without\s+a\s+stated\s+limit/i
    ],
    simple_explanation: 'Allows extra processing or administrative fees to be added later with no stated dollar/rupee cap.',
    why_it_matters: 'Open-ended fee clauses hand the other party a blank check to tack on surprise charges after you sign.',
    question_to_ask: 'Will you list every applicable fee upfront and confirm no additional unstated or uncapped fees can be added later?',
    negotiation_suggestion: 'Add an explicit "All-In Fee Cap" stating zero fees apply beyond those itemized in the signed schedule.'
  },
  {
    ruleId: 'univ-broad-auto-renewal',
    checklistTopic: 'auto-renewal',
    category: 'auto_renewal',
    dashboardGroup: 'renewals',
    risk_level: 'High',
    confidence: 0.94,
    title: 'Automatic Renewal With Restrictive Cancellation Window',
    patterns: [
      /(?<!no\s)(?<!not\s)(?<!never\s)automatically\s+renews?\s+(?:for|unless)/i,
      /cancels?\s+within\s+(?:24|48)\s+hours\s+of\s+signing/i
    ],
    simple_explanation: 'Automatically extends the agreement (sometimes for years) unless you cancel within an unusually strict or tiny deadline.',
    why_it_matters: 'Locks you into a long ongoing financial obligation if you miss a narrow cancellation cutoff.',
    question_to_ask: 'Can we remove automatic renewal so the agreement only renews if both parties agree in writing?',
    negotiation_suggestion: 'Replace automatic renewal with mutual written opt-in renewal and standard 30-day email notice.'
  }
];

/**
 * Runs both per-contract-type rules AND universal real-world risk/contradiction rules across numbered clauses
 */
export function runChecklistRulesOnClauses(clauses = [], contractType = 'rental') {
  const domainRules = CHECKLIST_RULES[contractType] || CHECKLIST_RULES.employment;
  const rules = [...domainRules, ...UNIVERSAL_RULES];
  const hits = [];
  const matchedRuleIds = new Set();
  const matchedClauseTexts = new Set();

  for (const rule of rules) {
    for (const clause of clauses) {
      if (matchedRuleIds.has(rule.ruleId)) break;
      const isHit = rule.patterns.some((rx) => rx.test(clause.text));
      if (isHit) {
        // Avoid duplicating the exact same clause + category if already matched by a domain rule
        const dedupKey = `${clause.clause_id}::${rule.category}`;
        if (matchedClauseTexts.has(dedupKey)) continue;
        matchedRuleIds.add(rule.ruleId);
        matchedClauseTexts.add(dedupKey);
        hits.push({
          id: `finding-${rule.ruleId}`,
          ruleId: rule.ruleId,
          clause_id: clause.clause_id,
          original_text: clause.text,
          excerpt: clause.text,
          title: rule.title,
          checklistTopic: rule.checklistTopic,
          category: rule.category,
          dashboardGroup: rule.dashboardGroup,
          risk_level: rule.risk_level,
          trafficLight: rule.risk_level === 'High' ? 'red' : rule.risk_level === 'Medium' ? 'yellow' : 'green',
          severity: rule.risk_level === 'High' ? 'critical' : rule.risk_level === 'Medium' ? 'medium' : 'low',
          confidence: rule.confidence,
          sectionTitle: clause.sectionTitle,
          page: clause.page,
          start: clause.start,
          end: clause.end,
          simple_explanation: rule.simple_explanation,
          plainEnglish: rule.simple_explanation,
          why_it_matters: rule.why_it_matters,
          whyItMatters: rule.why_it_matters,
          question_to_ask: rule.question_to_ask,
          question: rule.question_to_ask,
          negotiation_suggestion: rule.negotiation_suggestion,
          fairRedline: rule.negotiation_suggestion,
          negotiationPoint: rule.negotiation_suggestion,
          unclearWording: 'Check whether exact caps, verified party details, and written limits are clearly specified.',
          worstCase: rule.why_it_matters,
          benchmark: 'Standard balanced market protection.',
          source: 'checklist_rule'
        });
      }
    }
  }

  return hits;
}

/**
 * Merges base analyzer findings, checklist rule hits, and Gemini AI batch findings without duplicates
 */
export function mergeFindings({ baseFindings = [], checklistHits = [], aiFindings = [], clauses = [] }) {
  const clauseById = new Map(clauses.map((c) => [c.clause_id, c]));
  const merged = [];

  // Normalize existing base findings into the Step 1 strict schema as well
  const normalizeItem = (item, fallbackSource) => {
    const riskLevel =
      item.risk_level ||
      (item.severity === 'critical' || item.severity === 'high' || item.trafficLight === 'red'
        ? 'High'
        : item.severity === 'medium' || item.trafficLight === 'yellow'
        ? 'Medium'
        : 'Low');

    // Find best matching numbered clause_id if missing
    let clauseObj = item.clause_id ? clauseById.get(item.clause_id) : null;
    if (!clauseObj && item.original_text) {
      const needle = normalizeWs(item.original_text).toLowerCase().slice(0, 40);
      clauseObj = clauses.find((c) => normalizeWs(c.text).toLowerCase().includes(needle));
    }
    if (!clauseObj && typeof item.start === 'number') {
      clauseObj = clauses.find((c) => item.start >= c.start - 10 && item.start <= c.end + 10);
    }

    const origText = item.original_text || item.excerpt || clauseObj?.text || '';
    return {
      ...item,
      id: item.id || `finding-${clauseObj?.clause_id || merged.length + 1}-${(item.category || 'risk').replace(/\W+/g, '')}`,
      clause_id: clauseObj?.clause_id || item.clause_id || 'C1',
      original_text: origText,
      excerpt: origText,
      category: item.category || 'unfair_clause',
      dashboardGroup:
        item.dashboardGroup ||
        (/fee|deduct|apr|charge/i.test(item.category || '') ? 'fees' : /renew|notice|lock/i.test(item.category || '') ? 'renewals' : 'penalties'),
      risk_level: riskLevel,
      trafficLight: riskLevel === 'High' ? 'red' : riskLevel === 'Medium' ? 'yellow' : 'green',
      severity: riskLevel === 'High' ? 'critical' : riskLevel === 'Medium' ? 'medium' : 'low',
      confidence: typeof item.confidence === 'number' ? Math.max(0, Math.min(1, Number(item.confidence.toFixed(2)))) : 0.88,
      title: item.title || `${item.category || 'Contract Risk'} (${clauseObj?.clause_id || 'Clause'})`,
      simple_explanation: item.simple_explanation || item.plainEnglish || '',
      plainEnglish: item.simple_explanation || item.plainEnglish || '',
      why_it_matters: item.why_it_matters || item.whyItMatters || '',
      whyItMatters: item.why_it_matters || item.whyItMatters || '',
      question_to_ask: item.question_to_ask || item.question || '',
      question: item.question_to_ask || item.question || '',
      negotiation_suggestion: item.negotiation_suggestion || item.fairRedline || item.negotiationPoint || '',
      fairRedline: item.fairRedline || item.negotiation_suggestion || '',
      negotiationPoint: item.negotiationPoint || item.negotiation_suggestion || '',
      sectionTitle: item.sectionTitle || clauseObj?.sectionTitle || 'General Clauses',
      page: item.page || clauseObj?.page || 1,
      start: typeof item.start === 'number' ? item.start : clauseObj?.start || 0,
      end: typeof item.end === 'number' ? item.end : clauseObj?.end || origText.length,
      source: item.source || fallbackSource
    };
  };

  const allIncoming = [
    ...baseFindings.map((f) => normalizeItem(f, 'rules_engine')),
    ...checklistHits.map((f) => normalizeItem(f, 'checklist_rule')),
    ...aiFindings.map((f) => normalizeItem(f, 'gemini_ai'))
  ];

  const rank = { High: 3, Medium: 2, Low: 1 };

  for (const cand of allIncoming) {
    const normCand = normalizeWs(cand.original_text).toLowerCase().slice(0, 60);
    const existingIdx = merged.findIndex((m) => {
      const sameClause = m.clause_id === cand.clause_id && m.category === cand.category;
      const closeSpan = Math.abs((m.start || 0) - (cand.start || 0)) < 35 && Math.abs((m.end || 0) - (cand.end || 0)) < 45;
      const sameText = normalizeWs(m.original_text).toLowerCase().slice(0, 60) === normCand;
      return sameClause || closeSpan || sameText;
    });

    if (existingIdx === -1) {
      merged.push(cand);
    } else {
      const prev = merged[existingIdx];
      // Merge: keep higher risk level, highest confidence, and mark as merged if AI + Rules both confirmed!
      const isBoth = prev.source !== cand.source;
      const pick = rank[cand.risk_level] > rank[prev.risk_level] ? cand : prev;
      merged[existingIdx] = {
        ...pick,
        confidence: Math.min(0.99, Math.max(prev.confidence, cand.confidence) + (isBoth ? 0.04 : 0)),
        source: isBoth ? 'merged (rules + AI)' : pick.source
      };
    }
  }

  merged.sort((a, b) => rank[b.risk_level] - rank[a.risk_level] || (a.start || 0) - (b.start || 0));
  return merged;
}

/**
 * 5. MISSING PROTECTIONS CHECK PER CONTRACT TYPE
 */
const PROTECTION_CHECKLISTS = {
  rental: [
    {
      id: 'mp-rental-deposit-timeline',
      title: 'Prompt Security Deposit Refund Timeline (≤30 Days)',
      presentRegex: /(?:14|15|21|30)\s*days?\s*(?:of\s+vacating|after\s+vacating|refund|return)/i,
      antiRegex: /(?:60|90|sixty|ninety)\s*\(?(?:60|90)?\)?\s*days\s+after\s+vacating/i,
      why_it_matters: 'Without a clear 15–30 day refund timeline, landlords can delay returning your deposit for months.',
      suggested_clause: 'Landlord shall refund the security deposit within 21 days of key handover with itemized bills.',
      question_to_ask: 'Can we write a fixed 15–21 day security deposit refund timeline into the agreement?'
    },
    {
      id: 'mp-rental-wear-tear',
      title: 'Normal Wear-and-Tear Exclusion',
      presentRegex: /exclud(?:ing|es)\s+normal\s+wear\s+and\s+tear|beyond\s+normal\s+wear\s+and\s+tear/i,
      antiRegex: /deductions?.*for\s+wear\s+and\s+tear|adjustment\s+for\s+.*wear\s+and\s+tear/i,
      why_it_matters: 'Protects your deposit from being charged for routine aging, minor paint scuffs, or faded walls.',
      suggested_clause: 'Ordinary wear and tear from reasonable residential living shall not be deducted from the security deposit.',
      question_to_ask: 'Will you explicitly exclude ordinary wear and tear from deposit deductions?'
    },
    {
      id: 'mp-rental-entry-notice',
      title: '24-Hour Advance Notice Before Landlord Entry',
      presentRegex: /(?:24|48)\s*hours?\s+(?:advance|prior)\s+(?:written\s+)?notice/i,
      antiRegex: /without\s+prior\s+notice/i,
      why_it_matters: 'Protects your personal privacy and peaceful possession of your home.',
      suggested_clause: 'Except in genuine emergencies, Landlord shall provide at least 24 hours advance written notice before entry.',
      question_to_ask: 'Can we add a standard 24-hour advance notice requirement for non-emergency visits?'
    },
    {
      id: 'mp-rental-structural-repairs',
      title: 'Landlord Responsibility for Structural & Utility Repairs',
      presentRegex: /landlord\s+(?:shall\s+)?(?:remains?\s+)?(?:solely\s+)?responsible\s+for\s+.*(?:structural|plumbing|electrical)/i,
      antiRegex: /tenant\s+shall\s+be\s+solely\s+responsible\s+for\s+all\s+interior\s+repairs/i,
      why_it_matters: 'Ensures you are not billed for aging pipes, electrical wiring, roof seepage, or landlord appliances.',
      suggested_clause: 'Landlord shall be responsible for all structural, plumbing, electrical, and major appliance repairs.',
      question_to_ask: 'Can you confirm in writing that major plumbing, electrical, and structural repairs are covered by the landlord?'
    },
    {
      id: 'mp-rental-grace-period',
      title: 'Rent Payment Grace Period (5 Days)',
      presentRegex: /5[- ]?(?:calendar[- ]?)?day\s+grace\s+period/i,
      antiRegex: null,
      why_it_matters: 'Prevents sudden late fees caused by weekend holidays or salary/bank transfer delays.',
      suggested_clause: 'Tenant shall have a 5-calendar-day grace period from the rent due date before any late charge applies.',
      question_to_ask: 'Is there a 5-day grace period before late fees kick in?'
    }
  ],

  loan: [
    {
      id: 'mp-loan-kfs-apr',
      title: 'Clear All-In APR & Key Fact Statement (KFS) Disclosure',
      presentRegex: /key\s+fact\s+statement|monthly\s+reducing\s+balance|total\s+interest\s+payable/i,
      antiRegex: /compounded\s+daily/i,
      why_it_matters: 'Without a clear total-repayment and reducing-balance disclosure, hidden fees mask the true loan cost.',
      suggested_clause: 'Lender shall provide a signed Key Fact Statement detailing net disbursed amount, reducing-balance APR, and total repayment.',
      question_to_ask: 'Can you share the Key Fact Statement showing net disbursed amount and exact total interest over the tenure?'
    },
    {
      id: 'mp-loan-zero-prepay',
      title: 'Penalty-Free Early Prepayment / Foreclosure Right',
      presentRegex: /prepay[^.\n]{0,60}(?:zero|without|no)\s+penalty|0%\s+foreclosure/i,
      antiRegex: /prepayment\s+penalty/i,
      why_it_matters: 'Lets you close your loan early or make extra principal payments to save interest.',
      suggested_clause: 'Borrower may prepay part or all of the unpaid principal at any time with zero foreclosure penalty.',
      question_to_ask: 'Can I make extra principal payments or foreclose early without penalty?'
    },
    {
      id: 'mp-loan-cure-notice',
      title: 'Written Notice & Cure Period Before Default Acceleration',
      presentRegex: /(?:15|30)[- ]?day\s+(?:written\s+)?cure\s+(?:notice|period)|written\s+notice\s+before\s+acceleration/i,
      antiRegex: /immediately\s+due\s+(?:and\s+payable\s+)?without\s+notice/i,
      why_it_matters: 'Prevents a single missed EMI from immediately triggering full loan recall and collection penalties.',
      suggested_clause: 'Lender shall provide 15 days written notice and opportunity to cure before declaring default or acceleration.',
      question_to_ask: 'Will you add a written cure notice period before any default acceleration?'
    },
    {
      id: 'mp-loan-revocable-autopay',
      title: 'Revocable Auto-Debit Mandate & Bounce-Retry Cap',
      presentRegex: /revocable\s+(?:ach|e-nach|mandate)|max(?:imum)?\s+one\s+(?:debit\s+)?attempt/i,
      antiRegex: /irrevocable\s+authorization\s+to\s+debit/i,
      why_it_matters: 'Protects your bank account from repeated bounce fees if an EMI date shifts.',
      suggested_clause: 'Auto-debit mandates remain revocable by Borrower upon 3 business days notice with maximum 1 debit attempt per cycle.',
      question_to_ask: 'Can we confirm auto-debit retries are capped at 1 attempt per EMI cycle and the mandate is revocable?'
    }
  ],

  employment: [
    {
      id: 'mp-emp-payout-cycle',
      title: 'Timely Payout Schedule (Weekly or Net-15 / Net-30)',
      presentRegex: /weekly\s+payout|net[- ]?(?:7|15|30)\b|paid\s+(?:weekly|bi-weekly)/i,
      antiRegex: /net[- ]?(?:60|90|120)/i,
      why_it_matters: 'Prevents waiting 2–3 months to receive money you already worked for.',
      suggested_clause: 'All undisputed earnings/invoices shall be paid on a weekly or Net-15/Net-30 schedule.',
      question_to_ask: 'Can we lock in weekly or Net-15/30 payout timing in writing?'
    },
    {
      id: 'mp-emp-dispute-appeal',
      title: 'Objective Acceptance Criteria & Deduction Appeal Process',
      presentRegex: /(?:7|14)[- ]?day\s+(?:written\s+)?(?:dispute|appeal)\s+(?:window|process)|objective\s+acceptance\s+criteria/i,
      antiRegex: /subjective\s+(?:complaint|quality\s+metrics)/i,
      why_it_matters: 'Protects your earnings from arbitrary clawbacks or unverified customer/manager complaints.',
      suggested_clause: 'Any payout deduction requires documented evidence and a 7-day written appeal process before withholding funds.',
      question_to_ask: 'What objective evidence is required before any deduction, and how can I appeal an unfair deduction?'
    },
    {
      id: 'mp-emp-personal-ip',
      title: 'Personal Off-Hours Side-Project IP Carve-Out',
      presentRegex: /retains?\s+(?:full\s+)?ownership\s+of\s+.*(?:personal|pre-existing|off-hours)/i,
      antiRegex: /personal\s+time.*personal\s+equipment|trailer\s+clause/i,
      why_it_matters: 'Protects your own weekend apps, open-source work, and portfolio from being seized.',
      suggested_clause: 'IP assignment covers only paid work deliverables; unrelated off-hours creations on personal equipment remain solely Worker’s property.',
      question_to_ask: 'Can we add a clear carve-out protecting my unrelated personal side projects and pre-existing tools?'
    },
    {
      id: 'mp-emp-mutual-notice',
      title: 'Mutual Termination Notice & Pro-Rata Pay Guarantee',
      presentRegex: /either\s+party\s+may\s+terminate\s+with\s+(?:14|30)\s+days|completed\s+hours\s+shall\s+be\s+paid/i,
      antiRegex: /without\s+payment\s+for\s+(?:partially\s+completed|completed\s+pending)/i,
      why_it_matters: 'Ensures both sides follow fair exit notice and you are paid for all work completed up to your last day.',
      suggested_clause: 'Either party may terminate with mutual 14–30 days notice, and all completed work/incentives shall be paid in full.',
      question_to_ask: 'Can we make termination notice mutual and guarantee payout for all completed work upon exit?'
    },
    {
      id: 'mp-emp-liability-cap',
      title: 'Reasonable Cap on Worker/Contractor Liability',
      presentRegex: /liability\s+is\s+(?:mutually\s+)?capped|cap\s+on\s+liability\s+equal\s+to/i,
      antiRegex: /without\s+any\s+cap\s+on\s+liability/i,
      why_it_matters: 'Prevents a business dispute from putting your personal savings at unlimited risk.',
      suggested_clause: 'Total aggregate liability under this Agreement is capped at fees actually paid in the preceding 3 months.',
      question_to_ask: 'Can we add a reasonable cap on my liability limited to fees actually paid?'
    }
  ]
};

export function checkMissingProtections(text = '', contractType = 'employment') {
  const list = PROTECTION_CHECKLISTS[contractType] || PROTECTION_CHECKLISTS.employment;
  const missing = [];

  for (const item of list) {
    const hasProtection = item.presentRegex.test(text);
    const hasAnti = item.antiRegex ? item.antiRegex.test(text) : false;
    if (!hasProtection || hasAnti) {
      missing.push({
        id: item.id,
        title: item.title,
        status: hasAnti ? 'contradicted' : 'missing',
        why_it_matters: item.why_it_matters,
        suggested_clause: item.suggested_clause,
        question_to_ask: item.question_to_ask
      });
    }
  }
  return missing;
}
