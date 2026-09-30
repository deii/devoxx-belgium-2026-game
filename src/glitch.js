// Heisenbug. One robot per run is secretly glitched. Every command a robot receives passes through
// applyGlitch() before it reaches the motors; for the culprit, a glitch in progress corrupts it.
// The symptoms never name the robot — the player has to work out which one it is from how the
// robots behave, then run diagnostics on the suspect in the maintenance bay.

import { ROBOT_ORDER, ROBOT_SPECS } from './robots.js';

const FIRST_GLITCH_DELAY = 12;        // s of real time
const GLITCH_INTERVAL = 14;           // s, randomised ±GLITCH_INTERVAL_JITTER
const GLITCH_INTERVAL_JITTER = 4;
const GLITCH_ESCALATION = 0.85;       // every glitch brings the next one closer...
const MIN_GLITCH_INTERVAL = 5;        // ...down to this
const NOISE_INTERVAL = 7;             // s between harmless log lines
const LOG_LENGTH = 6;
export const DIAGNOSTIC_DURATION = 3; // s the suspect has to stay in the bay
const WRONG_GUESS_PENALTY = 30;       // s taken off the keynote clock
const PHANTOM_SPEED = 0.8;            // input magnitude of an unrequested twitch
const KEYNOTE_START = 9 * 3600 + 30 * 60; // 09:30, in seconds of the day

const GLITCHES = {
  invert: { duration: 1.6, log: 'WARN  steer-ctl: axis polarity flipped on unit ██ — self-corrected' },
  blackout: { duration: 1.2, log: 'ERROR sensor-bus: 1.2 s blackout on unit ██, commands dropped' },
  latch: { duration: 1.5, log: 'WARN  motor-ctl: throttle latched after release on unit ██' },
  phantom: { duration: 0.7, log: 'WARN  motor-ctl: unrequested motion on idle unit ██' },
};
const DRIVEN_GLITCHES = ['invert', 'blackout', 'latch'];

const NOISE = [
  'INFO  wifi: Devoxx-Attendees, 2 412 clients associated',
  'INFO  hvac: Room 8 at 22.5 °C, fans nominal',
  'DEBUG gc: young pause 11 ms (it is Java 25, of course)',
  'INFO  badge-scan: foyer queue at 38 people',
  'INFO  ups: floor 1 on battery, 71 %',
  'DEBUG coffee: machine 3 descaling, ETA 4 min',
  'INFO  heartbeat: 3/3 units responding',
  'WARN  projector-8: no signal on HDMI 1',
];

export function createHeisenbug(random = Math.random) {
  return {
    random,
    culprit: ROBOT_ORDER[Math.floor(random() * ROBOT_ORDER.length)],
    patched: false,
    wrongGuesses: 0,
    nextGlitchIn: FIRST_GLITCH_DELAY,
    interval: GLITCH_INTERVAL,
    active: null,            // { kind, remaining, move }
    lastDrivenMove: { x: 0, y: 0 },
    diagnostic: null,        // { robot, remaining }
    noiseIn: NOISE_INTERVAL / 2,
    noiseIndex: 0,
    lastResult: null,        // { found, age } of the latest self-test, for the bay's console
    log: [],
  };
}

export function applyGlitch(robot, command, state) {
  const bug = state.heisenbug;
  if (!bug || bug.patched || robot.type !== bug.culprit) {
    return command;
  }
  const isDriven = command.move.x !== 0 || command.move.y !== 0;
  if (isDriven && !bug.active) {
    bug.lastDrivenMove = { ...command.move };
  }
  if (!bug.active) {
    return command;
  }
  switch (bug.active.kind) {
    case 'invert':
      return { ...command, move: { x: -command.move.x, y: command.move.y } };
    case 'blackout':
      return { move: { x: 0, y: 0 }, action: false };
    case 'latch':
      return { ...command, move: bug.active.move };
    case 'phantom':
      return { ...command, move: isDriven ? command.move : bug.active.move };
    default:
      return command;
  }
}

/** Timers, escalation and log noise. Returns nothing; everything lives on state.heisenbug. */
export function updateHeisenbug(state, dt) {
  const bug = state.heisenbug;
  if (bug.lastResult) {
    bug.lastResult.age += dt;
  }
  updateNoise(state, dt);
  if (bug.patched) {
    return;
  }
  if (bug.active) {
    bug.active.remaining -= dt;
    if (bug.active.remaining <= 0) {
      bug.active = null;
    }
    return;
  }
  bug.nextGlitchIn -= dt;
  if (bug.nextGlitchIn <= 0) {
    triggerGlitch(state);
  }
}

function triggerGlitch(state) {
  const bug = state.heisenbug;
  const culpritIsDriven = state.robots[state.activeIndex].type === bug.culprit;
  const kind = culpritIsDriven
    ? DRIVEN_GLITCHES[Math.floor(bug.random() * DRIVEN_GLITCHES.length)]
    : 'phantom';
  const angle = bug.random() * Math.PI * 2;
  const move = kind === 'phantom'
    ? { x: Math.cos(angle) * PHANTOM_SPEED, y: Math.sin(angle) * PHANTOM_SPEED }
    : { ...bug.lastDrivenMove };
  bug.active = { kind, remaining: GLITCHES[kind].duration, move };
  addLog(state, GLITCHES[kind].log, 'glitch');

  bug.interval = Math.max(MIN_GLITCH_INTERVAL, bug.interval * GLITCH_ESCALATION);
  bug.nextGlitchIn = bug.interval + (bug.random() * 2 - 1) * GLITCH_INTERVAL_JITTER * (bug.interval / GLITCH_INTERVAL);
}

function updateNoise(state, dt) {
  const bug = state.heisenbug;
  bug.noiseIn -= dt;
  if (bug.noiseIn <= 0) {
    addLog(state, NOISE[bug.noiseIndex % NOISE.length], 'noise');
    bug.noiseIndex++;
    bug.noiseIn = NOISE_INTERVAL;
  }
}

/**
 * Maintenance bay. Consumes the action key when the active robot stands in the bay, so the
 * same key does not also drop the adapter. Returns true when the action was used here.
 */
export function heisenbugAct(state, robot) {
  const bug = state.heisenbug;
  if (!robot.command.action || !inBay(state, robot) || bug.diagnostic) {
    return false;
  }
  if (bug.patched) {
    return false;
  }
  bug.diagnostic = { robot, remaining: DIAGNOSTIC_DURATION };
  addLog(state, `INFO  diag: full self-test started on ${robot.spec.name}`, 'info');
  return true;
}

export function updateDiagnostic(state, dt) {
  const bug = state.heisenbug;
  const diagnostic = bug.diagnostic;
  if (!diagnostic) {
    return;
  }
  if (!inBay(state, diagnostic.robot)) {
    addLog(state, `WARN  diag: ${diagnostic.robot.spec.name} left the bay, self-test aborted`, 'info');
    bug.diagnostic = null;
    return;
  }
  diagnostic.remaining -= dt;
  if (diagnostic.remaining > 0) {
    return;
  }
  const name = diagnostic.robot.spec.name;
  bug.lastDiagnosedType = diagnostic.robot.type;
  bug.lastResult = { found: diagnostic.robot.type === bug.culprit, age: 0 };
  if (diagnostic.robot.type === bug.culprit) {
    bug.patched = true;
    bug.active = null;
    addLog(state, `INFO  diag: fault isolated in ${name} — hotfix 2.0.1 applied. Heisenbug squashed.`, 'fixed');
  } else {
    bug.wrongGuesses++;
    state.mission.clock = Math.max(0, state.mission.clock - WRONG_GUESS_PENALTY);
    addLog(state, `WARN  diag: no fault found in ${name}. ${WRONG_GUESS_PENALTY} s of keynote time lost.`, 'glitch');
  }
  bug.diagnostic = null;
}

export function heisenbugPrompt(state, robot) {
  const bug = state.heisenbug;
  if (!inBay(state, robot)) {
    return '';
  }
  if (bug.patched) {
    return 'Maintenance bay. The Heisenbug is already squashed.';
  }
  if (bug.diagnostic) {
    return `Running diagnostics on ${bug.diagnostic.robot.spec.name}… stay in the bay`;
  }
  return `E — run diagnostics on ${robot.spec.name} (a wrong guess costs ${WRONG_GUESS_PENALTY} s)`;
}

export function inBay(state, robot) {
  const bay = state.level.mission.maintenanceBay;
  return Math.hypot(robot.x - bay.x, robot.y - bay.y) < bay.radius;
}

export function culpritName(bug) {
  return ROBOT_SPECS[bug.culprit].name;
}

export function addLog(state, text, kind) {
  const bug = state.heisenbug;
  bug.log.push({ time: wallClock(state.mission.clock), text, kind });
  if (bug.log.length > LOG_LENGTH) {
    bug.log.shift();
  }
}

/** The keynote starts at 09:30; the clock shows how long until then. */
function wallClock(secondsLeft) {
  const secondsOfDay = KEYNOTE_START - Math.ceil(secondsLeft);
  const hours = Math.floor(secondsOfDay / 3600);
  const minutes = Math.floor(secondsOfDay / 60) % 60;
  const seconds = secondsOfDay % 60;
  return [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':');
}
