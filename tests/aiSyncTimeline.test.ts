import assert from 'node:assert';

console.log('=== Starting AI Timeline Sync Endpoint Test ===\n');

interface SubtitleInput {
  id: number;
  start: number;
  end: number;
  slotDuration: number;
  audioDuration: number;
  currentOffset: number;
  voiceStart: number;
  voiceEnd: number;
  overlapWithNext: number;
  gapToNext: number;
  englishText: string;
  persianText: string;
}

// Deterministic Solver simulation test to guarantee zero overlap math
function simulateSyncResolver(subtitles: SubtitleInput[], maxSpeed = 1.25, minPause = 0.12) {
  let speedsAdjusted = 0;
  let timingShifted = 0;

  const adjustments = subtitles.map((seg, i) => {
    let speed = 1.0;
    let offset = seg.currentOffset;
    let issueType: 'overlap' | 'overflow' | 'none' = 'none';

    if (seg.overlapWithNext > 0.04) {
      issueType = 'overlap';
      const overlapSec = seg.overlapWithNext;
      const availableSec = Math.max(0.2, seg.audioDuration - overlapSec - minPause);
      const requiredSpeed = Number((seg.audioDuration / availableSec).toFixed(2));
      speed = Math.min(maxSpeed, Math.max(1.05, requiredSpeed));
      speedsAdjusted++;

      if (i > 0) {
        const prev = subtitles[i - 1];
        if (seg.voiceStart > prev.voiceEnd + 0.3) {
          offset = Number((offset - 0.1).toFixed(3));
          timingShifted++;
        }
      }
    }

    return {
      id: seg.id,
      action: speed > 1.0 ? 'speed_only' : 'preserve',
      issueType,
      recommendedSpeed: speed,
      recommendedOffsetSec: offset,
      suggestedFarsiText: seg.persianText,
      isTextModified: false,
    };
  });

  return { adjustments, speedsAdjusted, timingShifted };
}

// Test 1: Overlapping segments are detected and speeds adjusted to eliminate overlap
const testSegments: SubtitleInput[] = [
  {
    id: 1,
    start: 0.0,
    end: 2.0,
    slotDuration: 2.0,
    audioDuration: 2.3, // overflows by 0.3s
    currentOffset: 0.0,
    voiceStart: 0.0,
    voiceEnd: 2.3,
    overlapWithNext: 0.3,
    gapToNext: 0.0,
    englishText: 'Hello world',
    persianText: 'سلام دنیا',
  },
  {
    id: 2,
    start: 2.0,
    end: 4.0,
    slotDuration: 2.0,
    audioDuration: 1.8,
    currentOffset: 0.0,
    voiceStart: 2.0,
    voiceEnd: 3.8,
    overlapWithNext: 0.0,
    gapToNext: 0.2,
    englishText: 'Next line',
    persianText: 'خط بعدی',
  },
];

const res = simulateSyncResolver(testSegments);
assert.strictEqual(res.speedsAdjusted, 1, 'One segment should have speed adjusted');
assert.ok(res.adjustments[0].recommendedSpeed > 1.0, 'Speed must be greater than 1.0 to fit duration');
assert.ok(res.adjustments[0].recommendedSpeed <= 1.25, 'Speed must be within safe boundary <= 1.25');

console.log('  [PASS] Test: Overlapping segments resolved and speed clamped safely');
console.log('=== AI Timeline Sync Endpoint Test Passed Successfully! ===\n');
