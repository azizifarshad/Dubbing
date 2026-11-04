import { extractJsonFromLlmResponse } from '../server';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

console.log('--- Starting Hormouz LLM JSON Extractor Test Suite ---');

// Test 1: Standard clean JSON
{
  const input = '{"translations": [{"id": 1, "farsiText": "سلام دنیا"}]}';
  const res = extractJsonFromLlmResponse(input);
  assert(res.translations && res.translations[0].id === 1, 'Test 1: Standard clean JSON failed');
  console.log('  [PASS] Test 1: Standard clean JSON parsed successfully');
}

// Test 2: Markdown fenced code block
{
  const input = '```json\n{"translations": [{"id": 1, "farsiText": "سلام دنیا"}]}\n```';
  const res = extractJsonFromLlmResponse(input);
  assert(res.translations && res.translations[0].id === 1, 'Test 2: Markdown fenced block failed');
  console.log('  [PASS] Test 2: Markdown fenced code block parsed successfully');
}

// Test 3: DeepSeek R1 / Reasoning with <think>...</think>
{
  const input = `<think>
I need to translate "Hello world" to Persian.
Natural equivalent is "سلام دنیا".
Let's output valid JSON format.
</think>
\`\`\`json
{
  "translations": [
    { "id": 1, "farsiText": "سلام دنیا" }
  ]
}
\`\`\``;
  const res = extractJsonFromLlmResponse(input);
  assert(res.translations && res.translations[0].id === 1, 'Test 3: <think> tags handling failed');
  console.log('  [PASS] Test 3: <think>...</think> reasoning tags stripped and parsed successfully');
}

// Test 4: Conversational preamble & postamble
{
  const input = `Sure! Here is the JSON output you requested:

{
  "translations": [
    { "id": 2, "farsiText": "خوش آمدید" }
  ]
}

Hope this helps your dubbing workflow!`;
  const res = extractJsonFromLlmResponse(input);
  assert(res.translations && res.translations[0].id === 2, 'Test 4: Conversational text failed');
  console.log('  [PASS] Test 4: Conversational preamble/postamble handled cleanly');
}

// Test 5: Direct array
{
  const input = '[{"id": 3, "farsiText": "تست آرایه"}]';
  const res = extractJsonFromLlmResponse(input);
  assert(Array.isArray(res) && res[0].id === 3, 'Test 5: Direct array failed');
  console.log('  [PASS] Test 5: Direct array parsed successfully');
}

// Test 6: Trailing comma in objects and arrays
{
  const input = `{"translations": [{"id": 4, "farsiText": "خط با کاما",}],}`;
  const res = extractJsonFromLlmResponse(input);
  assert(res.translations && res.translations[0].id === 4, 'Test 6: Trailing commas failed');
  console.log('  [PASS] Test 6: Relaxed parser cleaned trailing commas successfully');
}

// Test 7: Truncated JSON recovery (missing closing braces)
{
  const input = `{"translations": [{"id": 5, "farsiText": "پایان بسته نشده"`;
  const res = extractJsonFromLlmResponse(input);
  assert(res.translations && res.translations[0].id === 5, 'Test 7: Truncated JSON recovery failed');
  console.log('  [PASS] Test 7: Truncated JSON repaired and parsed successfully');
}

// Test 8: Non-JSON input throws clear error
{
  let threw = false;
  try {
    extractJsonFromLlmResponse('این یک متن کاملا ساده بدون هیچ جیسونی است.');
  } catch (err: any) {
    threw = true;
    assert(err.message.includes('قالب پاسخ ترجمه هرمز معتبر نبود'), 'Test 8: Expected Persian error message');
  }
  assert(threw, 'Test 8: Did not throw on invalid input');
  console.log('  [PASS] Test 8: Non-JSON input safely throws expected error');
}

console.log('--- All 8 Hormouz JSON Extractor Tests Passed Successfully! ---');
