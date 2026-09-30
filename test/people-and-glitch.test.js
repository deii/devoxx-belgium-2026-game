// People never walk through walls; the Heisenbug's self-test patches the right robot and charges
// 30 s of keynote time for the wrong one.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHeisenbug, heisenbugAct, updateDiagnostic } from '../src/glitch.js';
import { createPeople, updatePeople } from '../src/people.js';
import { createWorld, distanceToSegment, level, place, seededRandom } from './world.js';

test('people wander for two minutes without coming within 0.3 m of a wall', () => {
  const random = seededRandom(2026);
  const people = createPeople(level, random);
  const state = { phase: 'playing', people, robots: [] };
  const starts = people.map(person => ({ x: person.x, y: person.y }));
  let closest = Infinity;
  for (let frame = 0; frame < 120 * 30; frame++) {
    updatePeople(state, 1 / 30, random);
    if (frame % 15 === 0) {
      for (const person of people) {
        const nearby = person.walls;
        closest = Math.min(closest, ...nearby.map(segment => distanceToSegment(person, segment)));
      }
    }
  }
  assert.ok(closest >= 0.3, `closest approach ${closest.toFixed(2)} m`);
  people.forEach((person, index) => {
    assert.ok(Math.hypot(person.x - starts[index].x, person.y - starts[index].y) > 0.5 || person.stride > 1,
      `${person.role} ${index} moved`);
  });
});

function diagnose(culprit, suspectIndex) {
  const world = createWorld();
  world.heisenbug = createHeisenbug(seededRandom(7));
  world.heisenbug.culprit = culprit;
  const suspect = world.robots[suspectIndex];
  const bay = level.mission.maintenanceBay;
  place(suspect, bay.x, bay.y);
  suspect.command = { move: { x: 0, y: 0 }, action: true };
  assert.equal(heisenbugAct(world, suspect), true, 'the self-test starts');
  for (let t = 0; t < 3.2; t += 0.1) {
    updateDiagnostic(world, 0.1);
  }
  return world;
}

test('diagnosing the culprit squashes the Heisenbug', () => {
  const world = diagnose('droid', 1);
  assert.equal(world.heisenbug.patched, true);
  assert.equal(world.heisenbug.wrongGuesses, 0);
});

test('a wrong guess costs 30 s of keynote time', () => {
  const world = diagnose('droid', 0);
  const clockBefore = createWorld().mission.clock;
  assert.equal(world.heisenbug.patched, false);
  assert.equal(world.heisenbug.wrongGuesses, 1);
  assert.equal(clockBefore - world.mission.clock, 30);
});
