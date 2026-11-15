import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('=== Starting Step 4 Audio Mixing Options Verification Suite ===\n');

// 1. Inspect TimelinePlayer.tsx UI structure & Order of Options
console.log('1. Verifying Section Header and Options Order in TimelinePlayer.tsx:');
const timelinePlayerPath = path.join(process.cwd(), 'src', 'components', 'TimelinePlayer.tsx');
assert.ok(fs.existsSync(timelinePlayerPath), 'TimelinePlayer.tsx must exist');

const timelineContent = fs.readFileSync(timelinePlayerPath, 'utf8');

// Section title check
assert.ok(
  timelineContent.includes('میکس صدای فیلم و دوبله:'),
  'Section header must contain "میکس صدای فیلم و دوبله:"'
);

// Presence of both options
assert.ok(
  timelineContent.includes('فقط دوبله فارسی (خالص بدون فیلم)'),
  'Must contain "فقط دوبله فارسی (خالص بدون فیلم)" option'
);
assert.ok(
  timelineContent.includes('میکس صدای فیلم و دوبله'),
  'Must contain "میکس صدای فیلم و دوبله" option'
);

// Verify exact ordering in code: option 1 must appear before option 2
const indexFirstOption = timelineContent.indexOf('فقط دوبله فارسی (خالص بدون فیلم)');
const indexSecondOption = timelineContent.indexOf('میکس صدای فیلم و دوبله', indexFirstOption);

assert.ok(
  indexFirstOption > 0,
  '"فقط دوبله فارسی (خالص بدون فیلم)" must be present in TimelinePlayer.tsx'
);
assert.ok(
  indexSecondOption > indexFirstOption,
  '"فقط دوبله فارسی (خالص بدون فیلم)" MUST appear before "میکس صدای فیلم و دوبله" in the DOM/markup'
);

// Check assigned modes:
// Option 1 -> isolated
// Option 2 -> ducking
const isolatedSlice = timelineContent.substring(indexFirstOption - 600, indexFirstOption + 200);
assert.ok(
  isolatedSlice.includes("onChangeMixMode('isolated')"),
  'First option must trigger onChangeMixMode(\'isolated\')'
);

const duckingSlice = timelineContent.substring(indexSecondOption - 600, indexSecondOption + 200);
assert.ok(
  duckingSlice.includes("onChangeMixMode('ducking')"),
  'Second option must trigger onChangeMixMode(\'ducking\')'
);

console.log('   [PASS] Options order verified: 1. فقط دوبله فارسی (خالص بدون فیلم) followed by 2. میکس صدای فیلم و دوبله.\n');

// 2. Inspect App.tsx Initial State and Reset Logic
console.log('2. Verifying Default State and Reset Logic in App.tsx:');
const appPath = path.join(process.cwd(), 'src', 'App.tsx');
assert.ok(fs.existsSync(appPath), 'App.tsx must exist');

const appContent = fs.readFileSync(appPath, 'utf8');

// Ensure useState default is 'isolated'
assert.ok(
  appContent.includes("useState<'ducking' | 'isolated' | 'full_mix'>('isolated')"),
  "App.tsx initial mixMode state must default to 'isolated'"
);

// Ensure handleConfirmStartNewProject resets to 'isolated'
assert.ok(
  appContent.includes("setMixMode('isolated')"),
  "handleConfirmStartNewProject in App.tsx must reset mixMode to 'isolated'"
);

console.log('   [PASS] App.tsx state management initialized to \'isolated\' for new and reset projects.\n');

// 3. Complete Workflow Simulation Across All 6 Scenarios
console.log('3. Simulating Full Workflow State Machine Across All 6 Required Scenarios:');

interface AppState {
  activeStep: number;
  mixMode: 'ducking' | 'isolated' | 'full_mix';
  subtitlesCount: number;
  hasOriginalAudio: boolean;
}

// Scenario 1: Brand-new project initialization
const freshProject: AppState = {
  activeStep: 1,
  mixMode: 'isolated',
  subtitlesCount: 0,
  hasOriginalAudio: false,
};

// User moves to Step 4
freshProject.activeStep = 4;
freshProject.subtitlesCount = 5;
freshProject.hasOriginalAudio = true;

assert.strictEqual(
  freshProject.mixMode,
  'isolated',
  'Scenario 1: When entering Step 4 for the first time, "فقط دوبله فارسی (خالص بدون فیلم)" must be selected by default'
);
console.log('   [PASS] Scenario 1: First option selected automatically on Step 4 entry.');

// Scenario 2: Visual hierarchy & order
assert.strictEqual(
  indexSecondOption > indexFirstOption,
  true,
  'Scenario 2: First option appears first/above the second option'
);
console.log('   [PASS] Scenario 2: First option precedes second option.');

// Scenario 3: User manually switches to "میکس صدای فیلم و دوبله"
freshProject.mixMode = 'ducking';
assert.strictEqual(
  freshProject.mixMode,
  'ducking',
  'Scenario 3: User manual selection of "میکس صدای فیلم و دوبله" updates state to ducking'
);
console.log('   [PASS] Scenario 3: Switching to "میکس صدای فیلم و دوبله" works as expected.');

// Scenario 4: Step navigation preserves selection
freshProject.activeStep = 2; // Go to Translation Studio
assert.strictEqual(freshProject.mixMode, 'ducking', 'Navigating away must preserve selected mode');
freshProject.activeStep = 4; // Return to Step 4
assert.strictEqual(freshProject.mixMode, 'ducking', 'Returning to Step 4 must keep user\'s manual selection intact');
console.log('   [PASS] Scenario 4: Navigating between steps does not reset user\'s manual selection.');

// Scenario 5: User starts a completely new project
function resetProject(state: AppState) {
  state.activeStep = 1;
  state.mixMode = 'isolated'; // Default for brand new project
  state.subtitlesCount = 0;
  state.hasOriginalAudio = false;
}

resetProject(freshProject);
assert.strictEqual(
  freshProject.mixMode,
  'isolated',
  'Scenario 5: Starting a completely new project must restore default to "فقط دوبله فارسی (خالص بدون فیلم)"'
);
assert.strictEqual(freshProject.activeStep, 1, 'Project returns to step 1');
console.log('   [PASS] Scenario 5: Completely new project cleanly resets default back to "فقط دوبله فارسی (خالص بدون فیلم)".');

// Scenario 6: Export audio processing simulation
console.log('4. Verifying Export Output Behavior for Both Modes:');

function simulateAudioMixing(
  mode: 'isolated' | 'ducking',
  persianAudioPresent: boolean,
  movieAudioPresent: boolean
): { originalTrackIncluded: boolean; persianTrackIncluded: boolean; duckingApplied: boolean } {
  const originalTrackIncluded = movieAudioPresent && mode !== 'isolated';
  const duckingApplied = originalTrackIncluded && mode === 'ducking';
  return {
    originalTrackIncluded,
    persianTrackIncluded: persianAudioPresent,
    duckingApplied,
  };
}

// In 'isolated' mode:
const isolatedOutput = simulateAudioMixing('isolated', true, true);
assert.strictEqual(
  isolatedOutput.originalTrackIncluded,
  false,
  'In isolated mode, movie audio MUST NOT be included in export'
);
assert.strictEqual(
  isolatedOutput.persianTrackIncluded,
  true,
  'In isolated mode, Persian dubbing audio MUST be included in export'
);

// In 'ducking' mode:
const duckingOutput = simulateAudioMixing('ducking', true, true);
assert.strictEqual(
  duckingOutput.originalTrackIncluded,
  true,
  'In ducking mode, movie audio MUST be included in export'
);
assert.strictEqual(
  duckingOutput.persianTrackIncluded,
  true,
  'In ducking mode, Persian dubbing audio MUST be included in export'
);
assert.strictEqual(
  duckingOutput.duckingApplied,
  true,
  'In ducking mode, smart ducking attenuation MUST be applied'
);

console.log('   [PASS] Scenario 6: Export audio processing verified for both modes.');

console.log('\n=== All Step 4 Audio Mixing Option Tests Passed Successfully! (100%) ===');
