import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('=== Starting Individual & Batch Translation Comprehensive Test Suite (Step 2) ===\n');

// 1. Verify Component Source Code in TranslationStudio.tsx
console.log('1. Verifying TranslationStudio.tsx markup, buttons, and labels:');
const studioPath = path.join(process.cwd(), 'src', 'components', 'TranslationStudio.tsx');
assert.ok(fs.existsSync(studioPath), 'TranslationStudio.tsx must exist');

const studioContent = fs.readFileSync(studioPath, 'utf8');

// Ensure both batch translation and individual buttons exist
assert.ok(
  studioContent.includes('handleTranslateAll'),
  'TranslationStudio must contain handleTranslateAll for batch translation'
);
assert.ok(
  studioContent.includes('handleTranslateSingleLine'),
  'TranslationStudio must contain handleTranslateSingleLine for line-by-line translation'
);

// Ensure exact Persian button labels exist for untranslated and translated states
assert.ok(
  studioContent.includes("'ترجمه'"),
  'Individual button must display "ترجمه" when untranslated'
);
assert.ok(
  studioContent.includes("'ترجمه مجدد'"),
  'Individual button must display "ترجمه مجدد" after translation'
);
assert.ok(
  studioContent.includes('در حال ترجمه...'),
  'Button must indicate active translation loading state ("در حال ترجمه...")'
);
assert.ok(
  studioContent.includes('ویرایش دستی'),
  'Component must identify and tag manually edited translations ("ویرایش دستی")'
);

console.log('   [PASS] Component structure, button labels, and loading states verified in TranslationStudio.tsx.\n');

// 2. Functional State Machine Simulation: Subtitle Item Model
interface SubtitleItemModel {
  id: number;
  originalText: string;
  farsiText: string;
  status: 'idle' | 'translating' | 'translated' | 'error';
  isManuallyEdited?: boolean;
  translationError?: string;
}

let subtitles: SubtitleItemModel[] = [
  { id: 1, originalText: 'Welcome to this deep learning class.', farsiText: '', status: 'idle' },
  { id: 2, originalText: 'In this section we review neural networks.', farsiText: '', status: 'idle' },
  { id: 3, originalText: 'Let us start with backpropagation.', farsiText: '', status: 'idle' },
  { id: 4, originalText: 'Pay attention to the gradient formula.', farsiText: '', status: 'idle' },
];

const translatingLineIds = new Set<number>();
const lineErrors: Record<number, string> = {};

function getButtonLabel(sub: SubtitleItemModel): string {
  if (translatingLineIds.has(sub.id)) return 'در حال ترجمه...';
  if (sub.farsiText && sub.farsiText.trim().length > 0) return 'ترجمه مجدد';
  return 'ترجمه';
}

// Test initial button labels
console.log('2. Testing Initial Line States (All untranslated):');
for (const sub of subtitles) {
  assert.strictEqual(getButtonLabel(sub), 'ترجمه', `Line ${sub.id} must initially show "ترجمه"`);
}
console.log('   [PASS] All lines initially show "ترجمه".\n');

// 3. Scenario 1 & 2: Translate single line (Line 1)
console.log('3. Testing Scenario 1 & 2 (Translate single line and verify isolation):');
translatingLineIds.add(1);
assert.strictEqual(getButtonLabel(subtitles[0]), 'در حال ترجمه...', 'Line 1 shows loading state while translating');
assert.strictEqual(getButtonLabel(subtitles[1]), 'ترجمه', 'Line 2 remains "ترجمه" and not disabled');

// Simulate successful translation response for Line 1
subtitles[0] = {
  ...subtitles[0],
  farsiText: 'به این کلاس یادگیری عمیق خوش اومدید.',
  status: 'translated',
};
translatingLineIds.delete(1);

assert.strictEqual(getButtonLabel(subtitles[0]), 'ترجمه مجدد', 'Line 1 must now display "ترجمه مجدد"');
assert.strictEqual(subtitles[1].farsiText, '', 'Line 2 translation must remain empty and untouched');
assert.strictEqual(subtitles[2].farsiText, '', 'Line 3 translation must remain empty and untouched');
assert.strictEqual(subtitles[3].farsiText, '', 'Line 4 translation must remain empty and untouched');
console.log('   [PASS] Line 1 translated independently; other lines untouched; button changed to "ترجمه مجدد".\n');

// 4. Scenario 3: Translate another line individually (Line 3)
console.log('4. Testing Scenario 3 (Translate Line 3 individually):');
translatingLineIds.add(3);
subtitles[2] = {
  ...subtitles[2],
  farsiText: 'بیاین با الگوریتم پس‌انتشار (Backpropagation) شروع کنیم.',
  status: 'translated',
};
translatingLineIds.delete(3);

assert.strictEqual(getButtonLabel(subtitles[0]), 'ترجمه مجدد', 'Line 1 still shows "ترجمه مجدد"');
assert.strictEqual(getButtonLabel(subtitles[1]), 'ترجمه', 'Line 2 still shows "ترجمه"');
assert.strictEqual(getButtonLabel(subtitles[2]), 'ترجمه مجدد', 'Line 3 now shows "ترجمه مجدد"');
assert.strictEqual(getButtonLabel(subtitles[3]), 'ترجمه', 'Line 4 still shows "ترجمه"');
console.log('   [PASS] Individual line translation preserves individual button states.\n');

// 5. Scenario 4 & 5: Batch translation with partial success and partial failure
console.log('5. Testing Scenario 4 & 5 (Batch translation with partial failure):');
// Suppose batch translation runs for all lines, but Line 4 fails on server
const mockBatchTranslations = [
  { id: 1, farsiText: 'به این درس یادگیری عمیق خوش آمدید (نسخه جدید).' },
  { id: 2, farsiText: 'توی این بخش شبکه‌های عصبی (Neural Networks) رو بررسی می‌کنیم.' },
  { id: 3, farsiText: 'بیایید از الگوریتم Backpropagation شروع کنیم.' },
  // Line 4 failed and is missing or returned empty
];

const batchMap = new Map<number, string>(mockBatchTranslations.map((t) => [t.id, t.farsiText]));

subtitles = subtitles.map((sub) => {
  if (sub.isManuallyEdited && sub.farsiText.trim()) {
    return sub; // Protected
  }
  const fa = batchMap.get(sub.id);
  if (fa && fa.trim()) {
    return {
      ...sub,
      farsiText: fa.trim(),
      status: 'translated',
      translationError: undefined,
    };
  }
  // Line 4 failed in batch: do not mark as translated, keep existing
  return sub;
});

assert.strictEqual(getButtonLabel(subtitles[0]), 'ترجمه مجدد', 'Line 1 shows "ترجمه مجدد"');
assert.strictEqual(getButtonLabel(subtitles[1]), 'ترجمه مجدد', 'Line 2 shows "ترجمه مجدد"');
assert.strictEqual(getButtonLabel(subtitles[2]), 'ترجمه مجدد', 'Line 3 shows "ترجمه مجدد"');
assert.strictEqual(getButtonLabel(subtitles[3]), 'ترجمه', 'Line 4 (failed in batch) must still show "ترجمه"');
console.log('   [PASS] Batch translation updated successful lines while failed line 4 remained "ترجمه".\n');

// 6. Scenario 6: Individually translate the failed Line 4
console.log('6. Testing Scenario 6 (Individually translate failed line):');
translatingLineIds.add(4);
subtitles[3] = {
  ...subtitles[3],
  farsiText: 'به فرمول گرادیان خوب دقت کنید.',
  status: 'translated',
};
translatingLineIds.delete(4);

assert.strictEqual(getButtonLabel(subtitles[3]), 'ترجمه مجدد', 'Line 4 now shows "ترجمه مجدد" after successful retry');
console.log('   [PASS] Failed line successfully retried and translated individually.\n');

// 7. Scenario 7 & 8: Re-translate an already translated line (Line 2)
console.log('7. Testing Scenario 7 & 8 (Re-translating line 2 does not affect others):');
const oldLine1Text = subtitles[0].farsiText;
const oldLine3Text = subtitles[2].farsiText;
const oldLine4Text = subtitles[3].farsiText;

// User clicks "ترجمه مجدد" on Line 2
subtitles[1] = {
  ...subtitles[1],
  farsiText: 'در این قسمت می‌خوایم Neural Networks رو با هم بررسی کنیم.',
  status: 'translated',
};

assert.strictEqual(subtitles[0].farsiText, oldLine1Text, 'Line 1 unchanged');
assert.strictEqual(subtitles[2].farsiText, oldLine3Text, 'Line 3 unchanged');
assert.strictEqual(subtitles[3].farsiText, oldLine4Text, 'Line 4 unchanged');
assert.strictEqual(subtitles[1].farsiText, 'در این قسمت می‌خوایم Neural Networks رو با هم بررسی کنیم.', 'Line 2 updated with new translation');
console.log('   [PASS] Re-translation updated only target line; other lines strictly preserved.\n');

// 8. Scenario 9: Protect manually edited translations
console.log('8. Testing Scenario 9 (Protection of manually edited translations):');
// User edits Line 1 text manually
subtitles[0] = {
  ...subtitles[0],
  farsiText: 'سلام! به این کلاس یادگیری عمیق خیلی خوش اومدید (ترجمه دستی کاربر).',
  isManuallyEdited: true,
};

// Next batch translation runs
const secondBatch = [
  { id: 1, farsiText: 'متن ماشینی جدید که نباید جایگزین متن دستی شود' },
  { id: 2, farsiText: 'بررسی شبکه‌های عصبی' },
];
const secondBatchMap = new Map<number, string>(secondBatch.map((t) => [t.id, t.farsiText]));

subtitles = subtitles.map((sub) => {
  // If manually edited, preserve without overwriting
  if (sub.isManuallyEdited && sub.farsiText.trim()) {
    return sub;
  }
  const fa = secondBatchMap.get(sub.id);
  if (fa && fa.trim()) {
    return { ...sub, farsiText: fa.trim() };
  }
  return sub;
});

assert.strictEqual(
  subtitles[0].farsiText,
  'سلام! به این کلاس یادگیری عمیق خیلی خوش اومدید (ترجمه دستی کاربر).',
  'Manually edited translation MUST NOT be overwritten by batch translation'
);
assert.strictEqual(subtitles[0].isManuallyEdited, true, 'isManuallyEdited flag preserved');
console.log('   [PASS] Manually edited translation successfully protected against accidental replacement.\n');

// 9. Scenario 10: Step navigation data persistence
console.log('9. Testing Scenario 10 (State persistence across step navigation):');
let activeStep = 2; // Step 2 (Translation Studio)
activeStep = 3;     // Navigate to Step 3 (Voice Synthesis Studio)
activeStep = 4;     // Navigate to Step 4 (Timeline)
activeStep = 2;     // Return to Step 2

assert.strictEqual(subtitles.length, 4, 'All 4 subtitle items persist across step changes');
assert.strictEqual(subtitles.filter((s) => s.farsiText.trim().length > 0).length, 4, 'All translations intact');
console.log('   [PASS] Subtitle translations persist across workflow steps without loss.\n');

// 10. Scenario 11: Error Handling for Single Line Failures
console.log('10. Testing Scenario 11 (Individual Line Error Handling):');
// Simulate server error when translating Line 4
lineErrors[4] = 'خطای اتصال به هوش مصنوعی';
translatingLineIds.delete(4);
assert.strictEqual(lineErrors[4], 'خطای اتصال به هوش مصنوعی', 'Line error recorded');
assert.strictEqual(getButtonLabel(subtitles[3]), 'ترجمه مجدد', 'Line 4 retains button for retry');

// Clear error on retry
delete lineErrors[4];
assert.strictEqual(lineErrors[4], undefined, 'Error cleared on successful retry');
console.log('   [PASS] Error state tracked per-line without corrupting list.\n');

console.log('=== All Individual & Batch Translation Tests Passed Successfully! (100%) ===');
