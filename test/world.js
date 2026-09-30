// Test helpers: the real level and game modules, stepped headlessly without a browser.
// step() mirrors the physics part of main.js (drive, integrate, contacts, travel, mission), which
// cannot be imported because it starts the game loop and touches the DOM.

import cinemaFloor from '../levels/cinema-floor.js';
import exhibitionHall from '../levels/exhibition-hall.js';
import { loadLevel } from '../src/level.js';
import { activeSegments, crateMassFor, createMission, slowCrate, updateMission } from '../src/mission.js';
import { collideBodies, collideWithWalls, integrate } from '../src/physics.js';
import { createRobot, driveRobot, idleCommand } from '../src/robots.js';
import { createTravel, isRiding, travelAct, updateTravel } from '../src/travel.js';

export const DT = 1 / 120;
export const level = loadLevel(cinemaFloor, exhibitionHall);
export const VOXXY = 0;
export const DROID = 1;
export const BIGGY = 2;

export function createWorld() {
  const robots = ['voxxy', 'droid', 'biggy'].map(type => createRobot(type, level.spawns[type]));
  return { level, robots, mission: createMission(level), travel: createTravel(), activeIndex: 0, time: 0 };
}

export function step(world, activeIndex, move, action = false) {
  const { robots, mission } = world;
  robots.forEach((robot, index) => {
    robot.command = index === activeIndex && !isRiding(world.travel, robot) ? { move, action } : idleCommand();
    driveRobot(robot, DT);
    integrate(robot, DT);
  });
  mission.crates.forEach(crate => {
    slowCrate(crate, DT);
    integrate(crate, DT);
  });
  for (let i = 0; i < robots.length; i++) {
    for (let j = i + 1; j < robots.length; j++) {
      collideBodies(robots[i], robots[j]);
    }
    for (const crate of mission.crates) {
      collideBodies(robots[i], crate, robots[i].mass, crateMassFor(robots[i], crate));
    }
  }
  for (let i = 0; i < mission.crates.length; i++) {
    for (let j = i + 1; j < mission.crates.length; j++) {
      collideBodies(mission.crates[i], mission.crates[j]);
    }
  }
  const walls = activeSegments(level, mission);
  robots.forEach(robot => collideWithWalls(robot, walls));
  mission.crates.forEach(crate => collideWithWalls(crate, walls));
  const active = robots[activeIndex];
  if (travelAct(world, active)) {
    active.command.action = false;
  }
  updateTravel(world, DT);
  updateMission(mission, level, robots, active, DT);
  world.time += DT;
}

/** Drives one robot through waypoints; returns true if it reached the last one in time. */
export function driveTo(world, index, waypoints, maxSeconds, tolerance = 0.8) {
  const robot = world.robots[index];
  let reached = 0;
  for (let t = 0; t < maxSeconds && reached < waypoints.length; t += DT) {
    const [x, y] = waypoints[reached];
    const dx = x - robot.x;
    const dy = y - robot.y;
    const distance = Math.hypot(dx, dy);
    if (distance < tolerance) {
      reached++;
      continue;
    }
    step(world, index, { x: dx / distance, y: dy / distance });
  }
  settle(world, index, 1);
  return reached === waypoints.length;
}

export function act(world, index) {
  step(world, index, { x: 0, y: 0 }, true);
}

export function settle(world, index, seconds) {
  for (let t = 0; t < seconds; t += DT) {
    step(world, index, { x: 0, y: 0 });
  }
}

export function place(robot, x, y) {
  robot.x = x;
  robot.y = y;
  robot.vx = 0;
  robot.vy = 0;
}

/**
 * Whether a circle of the given radius can get from one point to another without touching a wall or
 * a crate: a flood fill on a 0.2 m grid inside the given box.
 */
export function reachable(mission, radius, from, to, box) {
  const cell = 0.2;
  const walls = activeSegments(level, mission).filter(segment =>
    Math.max(segment.ax, segment.bx) > box.x1 - 1 && Math.min(segment.ax, segment.bx) < box.x2 + 1);
  const columns = Math.ceil((box.x2 - box.x1) / cell);
  const rows = Math.ceil((box.y2 - box.y1) / cell);
  const free = new Map();
  const isFree = (i, j) => {
    const key = j * columns + i;
    if (!free.has(key)) {
      const point = { x: box.x1 + i * cell, y: box.y1 + j * cell };
      free.set(key, walls.every(segment => distanceToSegment(point, segment) >= radius)
        && mission.crates.every(crate => Math.hypot(point.x - crate.x, point.y - crate.y) >= radius + crate.radius));
    }
    return free.get(key);
  };
  const toCell = ([x, y]) => [Math.round((x - box.x1) / cell), Math.round((y - box.y1) / cell)];
  const start = toCell(from);
  const goal = toCell(to);
  const seen = new Set([start[1] * columns + start[0]]);
  const queue = [start];
  while (queue.length > 0) {
    const [i, j] = queue.shift();
    if (Math.abs(i - goal[0]) + Math.abs(j - goal[1]) <= 1) {
      return true;
    }
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di;
      const nj = j + dj;
      const key = nj * columns + ni;
      if (ni >= 0 && nj >= 0 && ni < columns && nj < rows && !seen.has(key) && isFree(ni, nj)) {
        seen.add(key);
        queue.push([ni, nj]);
      }
    }
  }
  return false;
}

export function distanceToSegment(point, segment) {
  const ex = segment.bx - segment.ax;
  const ey = segment.by - segment.ay;
  const lengthSq = ex * ex + ey * ey;
  let t = lengthSq > 0 ? ((point.x - segment.ax) * ex + (point.y - segment.ay) * ey) / lengthSq : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(point.x - segment.ax - ex * t, point.y - segment.ay - ey * t) - segment.halfThickness;
}

/** A small deterministic random generator, so tests that use randomness always see the same run. */
export function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}
