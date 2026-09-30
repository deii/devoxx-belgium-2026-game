import cinemaFloor from '../levels/cinema-floor.js';
import { applyGlitch } from './glitch.js';
import { createHud } from './hud.js';
import { createInput } from './input.js';
import { loadLevel } from './level.js';
import { collideBodies, collideWithWalls, integrate } from './physics.js';
import { createRenderer } from './render.js';
import { createRobot, driveRobot, idleCommand, ROBOT_ORDER } from './robots.js';

const PHYSICS_STEP = 1 / 120;       // s — fixed step keeps collisions stable
const MAX_FRAME_TIME = 0.25;        // s — after a stall, do not try to catch up for longer
const CAMERA_FOLLOW_RATE = 5;       // 1/s

const SWITCH_KEYS = { Digit1: 0, Digit2: 1, Digit3: 2 };

const level = loadLevel(cinemaFloor);
const robots = ROBOT_ORDER.map(type => createRobot(type, level.spawns[type]));
const state = {
  level,
  robots,
  activeIndex: 0,
  time: 0,
  camera: { x: robots[0].x, y: robots[0].y },
};

const input = createInput();
const renderer = createRenderer(document.getElementById('game'), level);
const hud = createHud(document.getElementById('hud'));

function handlePresses() {
  for (const code of input.consumePresses()) {
    if (code in SWITCH_KEYS) {
      state.activeIndex = SWITCH_KEYS[code];
    } else if (code === 'Tab') {
      state.activeIndex = (state.activeIndex + 1) % robots.length;
    }
  }
}

function step(dt) {
  robots.forEach((robot, index) => {
    const command = index === state.activeIndex
      ? { move: input.moveVector(), action: input.isHeld('KeyE') || input.isHeld('Space') }
      : idleCommand();
    robot.command = applyGlitch(robot, command, state);
    driveRobot(robot, dt);
    integrate(robot, dt);
  });

  for (let i = 0; i < robots.length; i++) {
    for (let j = i + 1; j < robots.length; j++) {
      const impact = collideBodies(robots[i], robots[j]);
      robots[i].lastImpact = Math.max(robots[i].lastImpact, impact);
      robots[j].lastImpact = Math.max(robots[j].lastImpact, impact);
    }
  }
  robots.forEach(robot => {
    robot.lastImpact = Math.max(robot.lastImpact, collideWithWalls(robot, level.segments));
  });
  state.time += dt;
}

function updateCamera(dt) {
  const target = robots[state.activeIndex];
  const follow = 1 - Math.exp(-CAMERA_FOLLOW_RATE * dt);
  state.camera.x += (target.x - state.camera.x) * follow;
  state.camera.y += (target.y - state.camera.y) * follow;
}

let lastFrame = performance.now();
let accumulator = 0;

function frame(now) {
  const frameTime = Math.min((now - lastFrame) / 1000, MAX_FRAME_TIME);
  lastFrame = now;
  accumulator += frameTime;

  handlePresses();
  while (accumulator >= PHYSICS_STEP) {
    step(PHYSICS_STEP);
    accumulator -= PHYSICS_STEP;
  }
  updateCamera(frameTime);
  renderer.draw(state);
  hud.update(state);
  robots.forEach(robot => { robot.lastImpact = 0; });
  requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => {
  lastFrame = performance.now();
});

requestAnimationFrame(frame);

// Exposed for debugging from the browser console.
window.heisenbug = state;
