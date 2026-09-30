// The mission's gates, played headlessly on the real level: who can do what, and the whole run from
// the robots' parking spot in the exhibition hall to the crates upstairs.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isRiding, travelPrompt } from '../src/travel.js';
import { BIGGY, DROID, DT, VOXXY, act, createWorld, driveTo, level, place, reachable, settle, step } from './world.js';

const UPSTAIRS_WEST = { x1: 40, y1: 10, x2: 82, y2: 70 };
const CORRIDOR = [76, 60];
const ADAPTER_TABLE = [48.5, 56];
const LIFT = level.links.find(link => link.kind === 'lift');
const HALL_LIFT = LIFT.ends.find(end => end.x > 120);
const HALL_STAIRS = level.links.find(link => link.kind === 'stairs').ends.find(end => end.x > 120);
const BREAKER = level.mission.mainBreaker;

const objective = (world, id) => world.mission.objectives.find(candidate => candidate.id === id).done;

test('the lift does not move without power', () => {
  const world = createWorld();
  place(world.robots[BIGGY], HALL_LIFT.x, HALL_LIFT.y);
  act(world, BIGGY);
  assert.equal(isRiding(world.travel, world.robots[BIGGY]), false);
  assert.equal(travelPrompt(world, world.robots[BIGGY]), 'Service lift — dead. The main breaker in the electrical room has tripped.');
});

test('Biggy cannot take the stairs, Droid can', () => {
  const world = createWorld();
  place(world.robots[BIGGY], HALL_STAIRS.x, HALL_STAIRS.y);
  act(world, BIGGY);
  assert.ok(world.robots[BIGGY].x > 120, 'Biggy stays in the hall');

  place(world.robots[DROID], HALL_STAIRS.x, HALL_STAIRS.y);
  act(world, DROID);
  assert.ok(world.robots[DROID].x < 120, 'Droid arrives upstairs');
});

test('the crates stop Voxxy and Droid, and the corridor is cut off from the lounge', () => {
  const world = createWorld();
  assert.equal(reachable(world.mission, 0.35, CORRIDOR, ADAPTER_TABLE, UPSTAIRS_WEST), false);
  for (const index of [VOXXY, DROID]) {
    const robot = world.robots[index];
    place(robot, 77, 55);
    driveTo(world, index, [[77, 38]], 8);
    assert.ok(robot.y > 45.5, `${robot.spec.name} is still south of the crates`);
  }
  assert.equal(objective(world, 'crates'), false);
});

test('ramming the booth head-on cannot wedge it into the electrical room', () => {
  const world = createWorld();
  const booth = world.mission.crates.find(crate => crate.isBooth);
  const door = level.mission.electricalDoor;
  for (let seconds = 0; seconds < 25; seconds += DT) {
    step(world, BIGGY, { x: 0, y: -1 });
  }
  settle(world, BIGGY, 3);
  assert.ok(booth.y > door[1], 'the booth stays in the hall, in front of the door');

  // Pushed along the wall from the west, it still slides clear.
  assert.ok(driveTo(world, BIGGY, [[booth.x, booth.y + 5], [booth.x - 6, booth.y + 5], [booth.x - 6, booth.y], [booth.x - 3, booth.y]], 60, 1),
    'Biggy gets beside the booth');
  driveTo(world, BIGGY, [[booth.x + 8, booth.y]], 30, 1);
  assert.equal(objective(world, 'booth'), true, 'the booth is shoved clear');
  assert.ok(driveTo(world, DROID, [[178.5, 33], [178.5, 14], [185.1, 11.5], [185.1, 8], [BREAKER[0], BREAKER[1] + 0.8]], 40, 0.5),
    'Droid reaches the breaker');
});

test('a full run: booth, breaker, lift, crates — and Voxxy can reach the adapter', () => {
  const world = createWorld();

  assert.ok(driveTo(world, BIGGY, [[178.5, 33], [179.5, 15], [180, 11.4], [182.2, 11.4]], 60, 1), 'Biggy reaches the booth');
  driveTo(world, BIGGY, [[192, 11.4]], 30, 1);
  assert.equal(objective(world, 'booth'), true, 'the booth is shoved clear');

  assert.ok(driveTo(world, DROID, [[178.5, 33], [178.5, 14], [181, 11.5], [185.1, 11], [185.1, 8], [BREAKER[0], BREAKER[1] + 0.8]], 40, 0.5),
    'Droid reaches the breaker');
  act(world, DROID);
  assert.equal(world.mission.power, true, 'power is back');

  assert.ok(driveTo(world, BIGGY, [[186, 11.4], [170, 11.6], [163, 11.6], [HALL_LIFT.x, HALL_LIFT.y]], 60), 'Biggy reaches the lift');
  act(world, BIGGY);
  assert.equal(isRiding(world.travel, world.robots[BIGGY]), true, 'Biggy rides the lift');
  settle(world, BIGGY, 7);
  assert.ok(world.robots[BIGGY].x < 120, 'Biggy arrives upstairs');

  driveTo(world, BIGGY, [[77, 38]], 25);
  assert.equal(objective(world, 'crates'), true, 'the crates are cleared');
  assert.equal(reachable(world.mission, 0.35, CORRIDOR, ADAPTER_TABLE, UPSTAIRS_WEST), true, 'Voxxy has a way to the lounge');
});
