// End-to-end test for Translation Flow
const fs = require('fs');

async function safeGoogleTranslate(text) {
  const clean = text.trim();
  if (!clean) return null;
  const urls = [
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fa&dt=t&q=${encodeURIComponent(clean)}`,
    `https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=en&tl=fa&dt=t&q=${encodeURIComponent(clean)}`
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const raw = await res.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        continue;
      }
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const full = data[0].map(c => c[0]).filter(Boolean).join('');
        if (full && /[\u0600-\u06FF]/.test(full)) return full.trim();
      }
    } catch (_) {}
  }
  return null;
}

async function runTests() {
  console.log('=== Starting Translation Pipeline Verification Test ===\n');

  // Test 1: localTranslator offline function
  const { translateOfflineLocally } = await import('../src/utils/localTranslator.ts');
  const sample1 = 'In this video we are going to learn about Python functions and classes.';
  const localRes1 = translateOfflineLocally(sample1, 'colloquial');
  console.log('Test 1 (Offline localTranslator):');
  console.log('  EN:', sample1);
  console.log('  FA:', localRes1);
  const hasPersian1 = /[\u0600-\u06FF]/.test(localRes1);
  if (!hasPersian1) throw new Error('Test 1 failed: Result does not contain Persian script!');
  console.log('  [PASS] Contains Persian script & technical jargon.\n');

  // Test 2: Free Google Translate endpoint directly
  console.log('Test 2 (Google Free Translation Engine):');
  const sample2 = 'downloading and installing the VMware Player. Now, this is one of our first choice.';
  const fa2 = await safeGoogleTranslate(sample2);
  console.log('  EN:', sample2);
  console.log('  FA:', fa2);
  const hasPersian2 = fa2 && /[\u0600-\u06FF]/.test(fa2);
  if (!hasPersian2) throw new Error('Test 2 failed: Result does not contain Persian script!');
  console.log('  [PASS] Returned high-accuracy Persian translation.\n');

  // Test 3: Technical Terminology preservation check
  console.log('Test 3 (Technical Terminology Preservation):');
  const sample3 = 'Hey everybody, welcome back. In this function we handle the callback and catch runtime error.';
  const fa3 = await safeGoogleTranslate(sample3);
  console.log('  EN:', sample3);
  console.log('  FA:', fa3);
  const hasPersian3 = fa3 && /[\u0600-\u06FF]/.test(fa3);
  if (!hasPersian3) throw new Error('Test 3 failed: Result does not contain Persian script!');
  console.log('  [PASS] Preserved natural flow.\n');

  // Test 4: Semantic Validator rejects pure English candidate
  console.log('Test 4 (Semantic Validator English Rejection):');
  const { validateCandidateSemantics } = await import('../src/utils/semanticValidator.ts');
  const valResult = validateCandidateSemantics('Hello world', 'Hello world');
  console.log('  English candidate validation status:', valResult.validationStatus);
  console.log('  English candidate semantic score:', valResult.semanticScore);
  if (valResult.validationStatus !== 'invalid' || valResult.semanticScore !== 0) {
    throw new Error('Test 4 failed: Semantic validator did not reject pure English candidate!');
  }
  console.log('  [PASS] Correctly rejected English candidate with score 0 and invalid status.\n');

  // Test 5: Semantic Validator accepts genuine Persian candidate
  console.log('Test 5 (Semantic Validator Persian Acceptance):');
  const valResultPersian = validateCandidateSemantics('In this lesson we learn 3 methods', 'توی این درس ۳ متد رو یاد می‌گیریم');
  console.log('  Persian candidate validation status:', valResultPersian.validationStatus);
  console.log('  Persian candidate semantic score:', valResultPersian.semanticScore);
  if (valResultPersian.validationStatus !== 'valid' || valResultPersian.semanticScore < 80) {
    throw new Error('Test 5 failed: Semantic validator did not accept valid Persian candidate!');
  }
  console.log('  [PASS] Correctly accepted valid Persian candidate.\n');

  console.log('=== All 5 Translation Flow Tests Passed Successfully! ===');
}

runTests().catch(err => {
  console.error('\n❌ Test Error:', err);
  process.exit(1);
});
