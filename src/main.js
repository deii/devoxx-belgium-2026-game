import cinemaFloor from '../levels/cinema-floor.js';
import exhibitionHall from '../levels/exhibition-hall.js';
import {
  applyGlitch, createHeisenbug, heisenbugAct, heisenbugPrompt, updateDiagnostic, updateHeisenbug,
} from './glitch.js';
import { createAudio } from './audio.js';
import { createEffects, updateEffects } from './effects.js';
import { createHud } from './hud.js';
import { createInput } from './input.js';
import { loadLevel } from './level.js';
import { activeSegments, crateMassFor, createMission, slowCrate, updateMission } from './mission.js';
import { collideBodies, collideWithWalls, integrate } from './physics.js';
import { recordWin } from './records.js';
import { createRenderer } from './render.js';
import { createSpeech, updateSpeech } from './speech.js';
import { createTravel, isRiding, travelAct, travelPrompt, updateTravel } from './travel.js';
import { createRobot, driveRobot, idleCommand, ROBOT_ORDER } from './robots.js';

const PHYSICS_STEP = 1 / 120;       // s — fixed step keeps collisions stable
const MAX_FRAME_TIME = 0.25;        // s — after a stall, do not try to catch up for longer
const CAMERA_FOLLOW_RATE = 5;       // 1/s
const CAMERA_SNAP_DISTANCE = 30;    // m — further than this (another floor), cut instead of pan

const SWITCH_KEYS = { Digit1: 0, Digit2: 1, Digit3: 2 };
const ACTION_KEYS = new Set(['KeyE', 'Space']);
const START_KEYS = new Set(['Enter', 'NumpadEnter', 'Space']);
const RESTART_KEYS = new Set(['KeyR', 'Enter', 'NumpadEnter']);
const MUTE_KEY = 'KeyM';

const level = loadLevel(cinemaFloor, exhibitionHall);
const input = createInput();
const renderer = createRenderer(document.getElementById('game'), level);
const hud = createHud(document.getElementById('hud'));
const audio = createAudio();

let state = createGameState('title');
let effects = createEffects();
let speech = createSpeech();
let actionPending = false;

function createGameState(phase) {
  const robots = ROBOT_ORDER.map(type => createRobot(type, level.spawns[type]));
  return {
    phase,                       // 'title' | 'playing' | 'won' | 'lost'
    level,
    robots,
    mission: createMission(level),
    heisenbug: createHeisenbug(),
    travel: createTravel(),
    activeIndex: 0,
    time: 0,
    camera: { x: robots[0].x, y: robots[0].y },
  };
}

function handlePresses() {
  for (const code of input.consumePresses()) {
    audio.unlock();
    if (code === MUTE_KEY) {
      audio.toggleMute();
      continue;
    }
    if (state.phase === 'title') {
      if (START_KEYS.has(code)) {
        state.phase = 'playing';
      }
    } else if (state.phase === 'playing') {
      if (code in SWITCH_KEYS) {
        state.activeIndex = SWITCH_KEYS[code];
      } else if (code === 'Tab') {
        state.activeIndex = (state.activeIndex + 1) % state.robots.length;
      } else if (ACTION_KEYS.has(code)) {
        actionPending = true;
      }
    } else if (RESTART_KEYS.has(code)) {
      state = createGameState('playing');
      effects = createEffects();
      speech = createSpeech();
    }
  }
}

function step(dt) {
  const { robots, mission } = state;
  robots.forEach((robot, index) => {
    const command = index === state.activeIndex && !isRiding(state.travel, robot)
      ? { move: input.moveVector(), action: actionPending }
      : idleCommand();
    robot.command = applyGlitch(robot, command, state);
    driveRobot(robot, dt);
    integrate(robot, dt);
  });
  actionPending = false;

  mission.crates.forEach(crate => {
    slowCrate(crate, dt);
    integrate(crate, dt);
  });
  resolveContacts(robots, mission);

  const activeRobot = robots[state.activeIndex];
  if (travelAct(state, activeRobot) || heisenbugAct(state, activeRobot)) {
    activeRobot.command.action = false;
  }
  updateTravel(state, dt);
  updateMission(mission, level, robots, activeRobot, dt);
  updateHeisenbug(state, dt);
  updateDiagnostic(state, dt);
  mission.prompt = heisenbugPrompt(state, activeRobot) || travelPrompt(state, activeRobot) || mission.prompt;
  if (mission.outcome) {
    state.phase = mission.outcome;
    if (mission.outcome === 'won') {
      state.record = recordWin(Math.ceil(mission.clock));
    }
  }
  state.time += dt;
}

function resolveContacts(robots, mission) {
  const crates = mission.crates;
  for (let i = 0; i < robots.length; i++) {
    for (let j = i + 1; j < robots.length; j++) {
      recordImpact(collideBodies(robots[i], robots[j]), robots[i], robots[j]);
    }
    for (const crate of crates) {
      recordImpact(collideBodies(robots[i], crate, robots[i].mass, crateMassFor(robots[i], crate)), robots[i]);
    }
  }
  for (let i = 0; i < crates.length; i++) {
    for (let j = i + 1; j < crates.length; j++) {
      collideBodies(crates[i], crates[j]);
    }
  }
  const walls = activeSegments(level, mission);
  robots.forEach(robot => recordImpact(collideWithWalls(robot, walls), robot));
  crates.forEach(crate => collideWithWalls(crate, walls));
}

function recordImpact(impact, ...bodies) {
  bodies.forEach(body => { body.lastImpact = Math.max(body.lastImpact, impact); });
}

function updateCamera(dt) {
  const target = state.robots[state.activeIndex];
  if (Math.hypot(target.x - state.camera.x, target.y - state.camera.y) > CAMERA_SNAP_DISTANCE) {
    state.camera.x = target.x;
    state.camera.y = target.y;
    return;
  }
  const follow = 1 - Math.exp(-CAMERA_FOLLOW_RATE * dt);
  state.camera.x += (target.x - state.camera.x) * follow;
  state.camera.y += (target.y - state.camera.y) * follow;
}

let lastFrame = performance.now();
let accumulator = 0;

function frame(now) {
  const frameTime = Math.min((now - lastFrame) / 1000, MAX_FRAME_TIME);
  lastFrame = now;

  handlePresses();
  if (state.phase === 'playing') {
    accumulator += frameTime;
    while (accumulator >= PHYSICS_STEP && state.phase === 'playing') {
      step(PHYSICS_STEP);
      accumulator -= PHYSICS_STEP;
    }
  } else {
    accumulator = 0;
    state.time += frameTime;
  }
  updateCamera(frameTime);
  updateEffects(effects, state, frameTime);
  audio.update(state);
  updateSpeech(speech, state, frameTime);
  renderer.draw(state, effects, speech);
  hud.update(state);
  state.robots.forEach(robot => { robot.lastImpact = 0; });
  requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => {
  lastFrame = performance.now();
});

requestAnimationFrame(frame);

// Exposed for debugging from the browser console.
window.heisenbug = () => state;
