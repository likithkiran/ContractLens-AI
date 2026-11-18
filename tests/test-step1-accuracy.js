// Comprehensive Verification for Steps 1, 2, 3, and 4
import assert from 'node:assert/strict';
import { SAMPLE_CONTRACTS } from '../sample_contracts/samples.js';
import {
  splitIntoNumberedClauses,
  verifyFindingsAgainstSource,
  calculateDeterministicRiskScore,
  checkMissingProtections
} from '../ai/accuracyPipeline.js';
import { analyzeContractHybrid } from '../ai/llmProvider.js';
import { compareManyContracts } from '../backend/comparisonEngine.js';

async function run() {
  // 1. Numbered clause splitter
  const rental = SAMPLE_CONTRACTS[0];
  const clauses = splitIntoNumberedClauses(rental.text);
  assert.ok(clauses.length >= 6);
  assert.equal(clauses[0].clause_id, 'C1');
  console.log(`✓ Step 1: Clause splitter produced ${clauses.length} numbered clauses`);

  // 2. Verification gate drops hallucinated findings
  const { verified, stats } = verifyFindingsAgainstSource(
    [
      { clause_id: 'C1', original_text: clauses[0].text, risk_level: 'Low' },
      { clause_id: 'C99', original_text: 'Hallucinated penalty clause not in contract.', risk_level: 'High' },
      { clause_id: 'C98', original_text: 'Invented ₹99,999 fee not in document.', risk_level: 'Medium' }
    ],
    rental.text
  );
  assert.equal(verified.length, 1);
  assert.equal(stats.droppedUnverifiedCount, 2);
  console.log('✓ Step 1: Verification gate dropped 2/2 hallucinated findings');

  // 3. Step 3: Smooth non-capping Safety Score curve (5 High vs 12 High get distinct scores!)
  const sZero = calculateDeterministicRiskScore([]);
  const s5High = calculateDeterministicRiskScore(Array(5).fill({ risk_level: 'High' }));
  const s12High = calculateDeterministicRiskScore(Array(12).fill({ risk_level: 'High' }));
  assert.equal(sZero.safetyScore, 100);
  assert.equal(sZero.overall_risk_score, 0);
  assert.ok(s5High.safetyScore > s12High.safetyScore, `Expected 5 High (${s5High.safetyScore}) > 12 High (${s12High.safetyScore})`);
  assert.ok(s12High.safetyScore > 0, `Expected smooth non-zero floor, got ${s12High.safetyScore}`);
  console.log(`✓ Step 3: Smooth curve verified — 0 risks=${sZero.safetyScore}, 5 High=${s5High.safetyScore}, 12 High=${s12High.safetyScore} (distinct!)`);

  // 4. Step 4: shared/laws.json matching legal_note with "Verify before relying"
  const analyzedRental = await analyzeContractHybrid({ title: rental.title, text: rental.text });
  assert.ok(analyzedRental.findings.some((f) => f.legal_note && f.legal_note.verification_label === 'Verify before relying'));
  console.log('✓ Step 4: shared/laws.json legal notes attached with "Verify before relying"');

  // 5. Missing protections check
  const fairRental = `Monthly rent is ₹15,000 with a 5-day grace period. Landlord shall refund the security deposit within 21 days of vacating excluding normal wear and tear. Landlord shall provide 24 hours advance written notice before entry. Landlord remains solely responsible for structural, plumbing, electrical, and major appliance repairs.`;
  assert.equal(checkMissingProtections(fairRental, 'rental').length, 0);
  console.log('✓ Step 1: Missing protections check returns 0 on fully protected rental');

  // 6. Step 2: Multi-document comparison (3 rental offers + mismatch guard)
  const cmp3 = await compareManyContracts({
    documents: [
      { title: 'Offer A (Clean)', text: fairRental },
      { title: 'Offer B (Mid)', text: 'Monthly Rent is ₹22,000. Security deposit of ₹66,000 returned within 90 days after vacating with deductions for wear and tear. Notice period is 60 days written notice.' },
      { title: 'Offer C (Predatory)', text: rental.text }
    ]
  });
  assert.equal(cmp3.comparable, true);
  assert.equal(cmp3.documents.length, 3);
  assert.equal(cmp3.ranking.safest.title, 'Offer A (Clean)');
  assert.ok(cmp3.ranking.safest.reason.includes('least risky based on our analysis'));
  assert.ok(!cmp3.ranking.safest.reason.toLowerCase().includes('legally correct'));
  assert.ok(cmp3.combinedNegotiationList.length >= 1);
  console.log(`✓ Step 2: 3-doc comparison ranked Safest="${cmp3.ranking.safest.title}", Lowest Cost="${cmp3.ranking.lowestCost.title}", Balanced="${cmp3.ranking.mostBalanced.title}"`);

  // Mismatch test: Rental (₹) vs Loan (₹) must warn and NOT rank
  const cmpMismatch = await compareManyContracts({
    documents: [
      { title: 'Rental Doc', text: rental.text },
      { title: 'Loan Doc', text: SAMPLE_CONTRACTS[2].text }
    ]
  });
  assert.equal(cmpMismatch.comparable, false);
  assert.equal(cmpMismatch.ranking, null);
  assert.ok(cmpMismatch.warning && cmpMismatch.warning.includes('different contract types'));
  console.log('✓ Step 2: Contract type mismatch properly warned and refused ranking');

  console.log('\nALL STEPS 1-4 BACKEND VERIFICATION PASSED 100%!');
}

run().catch((err) => { console.error(err); process.exit(1); });
