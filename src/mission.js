// "Keynote in 10": the one mission of the game. Owns the props (crates, booth, adapter, breaker,
// Room 8 door), the keynote clock, the objective list and the win/lose conditions.

import { segmentOf } from './level.js';

const KEYNOTE_CLOCK_START = 600;                 // s shown on the clock (10:00)
const REAL_TIME_LIMIT = 450;                      // s of real play time the clock covers
const CLOCK_RATE = KEYNOTE_CLOCK_START / REAL_TIME_LIMIT;
const INTERACT_RANGE = 1.3;                       // m between robot edge and a prop
const CRATE_HINT_RANGE = 0.4;                     // m between robot edge and crate edge
const CLEARED_GAP = 1.4;                          // m — enough for Voxxy (0.8 m); crates end up staggered, so the 1-D measure underrates diagonal gaps
const WALL_CLEARANCE = 0.15;                      // m — half the wall thickness
const ADAPTER_CARRY_OFFSET = 0.55;                // m in front of Voxxy's centre
const DOOR_OPEN_SPEED = 1.2;                      // fraction of the door per second
const OPENING_HINT_DURATION = 30;                 // s of keynote clock the opening tip stays up

const BOOTH_CLEARED_DISTANCE = 2.8;                // m between booth centre and the electrical room door

// The sponsor booth that toppled in front of the electrical room: bigger and heavier than a crate.
const BOOTH = {
  radius: 1.3,
  mass: 320,
  restitution: 0.05,
  drag: 1.5,
  groundFriction: 0.6,
  minPusherMass: 300,
  isBooth: true,
};

const CRATE = {
  radius: 0.9,
  mass: 300,
  restitution: 0.1,
  drag: 2,               // 1/s
  groundFriction: 0.8,   // m/s² — sliding friction on the foyer carpet
  minPusherMass: 300,    // lighter robots cannot shift a crate at all
};

export function createMission(level) {
  const data = level.mission;
  return {
    clock: KEYNOTE_CLOCK_START,
    outcome: null,                    // null | 'won' | 'lost'
    power: false,
    doorOpen: false,
    doorOpenAmount: 0,
    doorSegment: segmentOf(data.room8Door),
    crates: [
      ...data.crates.map(([x, y]) => ({ x, y, vx: 0, vy: 0, ...CRATE })),
      { x: data.booth[0], y: data.booth[1], vx: 0, vy: 0, ...BOOTH },
    ],
    adapter: { x: data.adapter.x, y: data.adapter.y, carrier: null, delivered: false },
    prompt: '',
    objectives: [
      { id: 'booth', robot: 'biggy', text: 'Shove the fallen booth away from the electrical room', done: false },
      { id: 'power', robot: 'droid', text: 'Reset the main breaker in the electrical room', done: false },
      { id: 'crates', robot: 'biggy', text: 'Take the service lift up and shove the sponsor crates out of the Megacandy bottleneck', done: false },
      { id: 'adapter', robot: 'voxxy', text: "Take the stairs up and fetch the HDMI adapter from the speakers' lounge", done: false },
      { id: 'door', robot: 'droid', text: 'Open the Room 8 service door', done: false },
      { id: 'deliver', robot: 'voxxy', text: 'Plug the adapter into the projector on the Room 8 stage', done: false },
    ],
  };
}

/** Wall segments that currently block movement: the static level plus a closed door. */
export function activeSegments(level, mission) {
  return mission.doorOpen ? level.segments : [...level.segments, mission.doorSegment];
}

export function crateMassFor(robot, crate) {
  return robot.mass >= crate.minPusherMass ? crate.mass : Infinity;
}

export function slowCrate(crate, dt) {
  const damping = Math.exp(-crate.drag * dt);
  crate.vx *= damping;
  crate.vy *= damping;
  const speed = Math.hypot(crate.vx, crate.vy);
  if (speed > 0) {
    const reduced = Math.max(0, speed - crate.groundFriction * dt);
    crate.vx *= reduced / speed;
    crate.vy *= reduced / speed;
  }
}

/** Advances clock, props and objectives by one physics step. */
export function updateMission(mission, level, robots, activeRobot, dt) {
  if (mission.outcome) {
    return;
  }
  mission.clock = Math.max(0, mission.clock - dt * CLOCK_RATE);
  if (mission.doorOpen) {
    mission.doorOpenAmount = Math.min(1, mission.doorOpenAmount + DOOR_OPEN_SPEED * dt);
  }

  if (activeRobot.command.action) {
    act(mission, level, activeRobot);
  }
  carryAdapter(mission);
  checkDelivery(mission, level);
  updateObjectives(mission, level);
  mission.prompt = promptFor(mission, level, activeRobot);

  if (mission.adapter.delivered) {
    mission.outcome = 'won';
  } else if (mission.clock <= 0) {
    mission.outcome = 'lost';
  }
}

function act(mission, level, robot) {
  const data = level.mission;
  const adapter = mission.adapter;
  if (robot.type === 'droid') {
    if (!mission.power && near(robot, pointOf(data.mainBreaker))) {
      mission.power = true;
    } else if (mission.power && !mission.doorOpen && near(robot, doorCentre(data))) {
      mission.doorOpen = true;
    }
  } else if (robot.type === 'voxxy') {
    if (adapter.carrier === robot) {
      adapter.carrier = null;
    } else if (!adapter.delivered && !adapter.carrier && near(robot, adapter)) {
      adapter.carrier = robot;
    }
  }
}

function carryAdapter(mission) {
  const carrier = mission.adapter.carrier;
  if (!carrier) {
    return;
  }
  mission.adapter.x = carrier.x + Math.cos(carrier.heading) * ADAPTER_CARRY_OFFSET;
  mission.adapter.y = carrier.y + Math.sin(carrier.heading) * ADAPTER_CARRY_OFFSET;
}

function checkDelivery(mission, level) {
  const adapter = mission.adapter;
  const stage = level.mission.stage;
  const onStage = Math.hypot(adapter.x - stage.x, adapter.y - stage.y) < stage.radius;
  if (adapter.carrier && onStage && mission.power) {
    adapter.carrier = null;
    adapter.delivered = true;
  }
}

function updateObjectives(mission, level) {
  const done = {
    crates: widestBottleneckGap(mission, level) >= CLEARED_GAP,
    booth: boothCleared(mission, level),
    adapter: mission.adapter.carrier !== null || mission.adapter.delivered,
    power: mission.power,
    door: mission.doorOpen,
    deliver: mission.adapter.delivered,
  };
  for (const objective of mission.objectives) {
    objective.done = objective.done || done[objective.id];
  }
}

/** Widest free stretch across the bottleneck, walls and crates standing in it subtracted. */
function widestBottleneckGap(mission, level) {
  const area = level.mission.bottleneck;
  const blocked = mission.crates
    .filter(crate => crate.x > area.x1 && crate.x < area.x2
      && crate.y + crate.radius > area.y1 && crate.y - crate.radius < area.y2)
    .map(crate => [crate.x - crate.radius, crate.x + crate.radius])
    .sort((a, b) => a[0] - b[0]);
  let widest = 0;
  let freeFrom = area.x1 + WALL_CLEARANCE;
  for (const [start, end] of blocked) {
    widest = Math.max(widest, start - freeFrom);
    freeFrom = Math.max(freeFrom, end);
  }
  return Math.max(widest, area.x2 - WALL_CLEARANCE - freeFrom);
}

/**
 * Context line for the active robot. Things this robot can do right now win over explanations of
 * what somebody else would have to do.
 */
function promptFor(mission, level, robot) {
  const data = level.mission;
  const adapter = mission.adapter;
  const isVoxxy = robot.type === 'voxxy';
  const isDroid = robot.type === 'droid';
  const candidates = [];

  if (adapter.carrier === robot) {
    const nearStage = Math.hypot(robot.x - data.stage.x, robot.y - data.stage.y) < data.stage.radius + INTERACT_RANGE;
    candidates.push(nearStage && !mission.power
      ? { canAct: false, text: 'The projector is dead — Droid has to restore power first.' }
      : { canAct: true, text: 'Carrying the HDMI adapter to the Room 8 stage · E to drop' });
  }
  if (!adapter.delivered && !adapter.carrier && near(robot, adapter)) {
    candidates.push(isVoxxy
      ? { canAct: true, text: 'E — pick up the HDMI adapter' }
      : { canAct: false, text: 'Only Voxxy can handle something this small.' });
  }
  if (near(robot, pointOf(data.mainBreaker))) {
    if (mission.power) {
      candidates.push({ canAct: false, text: 'Power is back on.' });
    } else {
      candidates.push(isDroid
        ? { canAct: true, text: 'E — reset the main breaker' }
        : { canAct: false, text: 'The main breaker. Only Droid remembers how this one resets.' });
    }
  }
  if (!mission.doorOpen && near(robot, doorCentre(data))) {
    if (!mission.power) {
      candidates.push({ canAct: false, text: 'Room 8 service door — dead. The main breaker downstairs has tripped.' });
    } else {
      candidates.push(isDroid
        ? { canAct: true, text: 'E — open the service door' }
        : { canAct: false, text: 'Service door. Only Droid knows the code.' });
    }
  }
  const touchingCrate = mission.crates.some(crate =>
    Math.hypot(crate.x - robot.x, crate.y - robot.y) < crate.radius + robot.radius + CRATE_HINT_RANGE);
  if (touchingCrate) {
    candidates.push(robot.mass >= CRATE.minPusherMass
      ? { canAct: true, text: 'Shove! Get up to speed first — momentum does the work.' }
      : { canAct: false, text: `Far too heavy for ${robot.spec.name}. Biggy could shove these.` });
  }

  const best = candidates.find(candidate => candidate.canAct) || candidates[0];
  if (best) {
    return best.text;
  }
  if (mission.clock > KEYNOTE_CLOCK_START - OPENING_HINT_DURATION) {
    return 'Tip: nothing upstairs works without power — start with Biggy (3) and the fallen booth.';
  }
  return '';
}

function boothCleared(mission, level) {
  const booth = mission.crates.find(crate => crate.isBooth);
  const door = pointOf(level.mission.electricalDoor);
  return Math.hypot(booth.x - door.x, booth.y - door.y) >= BOOTH_CLEARED_DISTANCE;
}

function pointOf([x, y]) {
  return { x, y };
}

function near(robot, point) {
  return Math.hypot(robot.x - point.x, robot.y - point.y) < robot.radius + INTERACT_RANGE;
}

function doorCentre(data) {
  return { x: (data.room8Door.x1 + data.room8Door.x2) / 2, y: (data.room8Door.y1 + data.room8Door.y2) / 2 };
}

export function formatClock(seconds) {
  const whole = Math.ceil(seconds);
  const minutes = Math.floor(whole / 60);
  return `${String(minutes).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}
