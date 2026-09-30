// The level data: every robot can reach everything it needs in the exhibition hall, booths and
// pillars included, and only Voxxy fits through the speakers' lounge barriers.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { level, reachable, createWorld } from './world.js';

const HALL = { x1: 155, y1: 5, x2: 205, y2: 66 };
const RADIUS = { voxxy: 0.4, droid: 0.5, biggy: 0.85 };

test('every travel link has exactly two ends', () => {
  for (const link of level.links) {
    assert.equal(link.ends.length, 2, link.id);
  }
});

test('from the parking spot every robot reaches the stairs, the lift, the electrical room and the bay', () => {
  const { mission } = createWorld();
  mission.crates = mission.crates.filter(crate => !crate.isBooth);   // the booth is Biggy's job
  const [doorX, doorY] = level.mission.electricalDoor;
  const bay = level.mission.maintenanceBay;
  const targets = {
    'maintenance bay': [bay.x, bay.y],
    'electrical room': [doorX, doorY + 2.5],
    ...Object.fromEntries(level.links.flatMap(link => link.ends.filter(end => end.x > 120).map(end => [link.id, [end.exit.x, end.exit.y]]))),
  };
  for (const [type, radius] of Object.entries(RADIUS)) {
    const spawn = level.spawns[type];
    for (const [name, target] of Object.entries(targets)) {
      // 90 % of the radius: the grid is coarse, the robots can squeeze a little
      assert.ok(reachable(mission, radius * 0.9, [spawn.x, spawn.y], target, HALL), `${type} → ${name}`);
    }
  }
});

test('only Voxxy fits through the speakers’ lounge barriers', () => {
  const { mission } = createWorld();
  const foyer = [60, 20];
  const adapterTable = [48.5, 56];
  const box = { x1: 40, y1: 5, x2: 82, y2: 66 };
  assert.equal(reachable(mission, RADIUS.voxxy * 0.9, foyer, adapterTable, box), true);
  assert.equal(reachable(mission, RADIUS.droid, foyer, adapterTable, box), false);
  assert.equal(reachable(mission, RADIUS.biggy, foyer, adapterTable, box), false);
});
