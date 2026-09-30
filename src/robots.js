// The three robots. They share one drive model; what makes them different is mass and motor
// characteristics — the same command produces a very different physical result for each.

const TURN_RESPONSE = 6;          // how aggressively a robot aims at the requested direction
const THROTTLE_RELEASE_FACTOR = 3; // motors spool down faster than they spool up

export const ROBOT_SPECS = {
  voxxy: {
    name: 'Voxxy',
    tagline: 'Light, curious and quick. Slips through gaps, carries small things.',
    color: '#ff8a1f',
    radius: 0.4,
    mass: 45,           // kg
    driveForce: 450,    // N   -> top speed ≈ force / (mass · drag) ≈ 4.5 m/s
    drag: 2.2,          // 1/s
    brakeDecel: 9,      // m/s² when no input
    spoolRate: 6,       // throttle units per second
    turnAccel: 40,      // rad/s²
    maxTurnRate: 8,     // rad/s
    lateralGrip: 5,     // 1/s — low grip, Voxxy skids in tight turns
    restitution: 0.45,
  },
  droid: {
    name: 'Droid',
    tagline: 'Has been in this building for years. Knows every service door.',
    color: '#ffc46b',
    radius: 0.5,
    mass: 140,
    driveForce: 640,    // top speed ≈ 2.9 m/s
    drag: 1.6,
    brakeDecel: 6,
    spoolRate: 3,
    turnAccel: 10,
    maxTurnRate: 3.2,
    lateralGrip: 12,    // walks, does not slide
    restitution: 0.2,
  },
  biggy: {
    name: 'Biggy',
    tagline: 'Short legs, heavy armour. Slow to start, hard to stop.',
    color: '#6f8aa8',
    radius: 0.85,
    mass: 460,
    driveForce: 520,    // top speed ≈ 2.5 m/s, but it takes a while to get there
    drag: 0.45,
    brakeDecel: 0.9,    // coasts for metres after you let go
    spoolRate: 0.7,
    turnAccel: 2.5,
    maxTurnRate: 1.4,
    lateralGrip: 3,
    restitution: 0.1,
  },
};

export const ROBOT_ORDER = ['voxxy', 'droid', 'biggy'];

export function createRobot(type, spawn) {
  const spec = ROBOT_SPECS[type];
  return {
    type,
    spec,
    x: spawn.x,
    y: spawn.y,
    vx: 0,
    vy: 0,
    heading: spawn.heading,
    angularVelocity: 0,
    throttle: 0,
    stride: 0,
    radius: spec.radius,
    mass: spec.mass,
    restitution: spec.restitution,
    command: idleCommand(),
    lastImpact: 0,
    wallImpact: 0,          // m/s, strongest wall hit this frame
    crateImpact: 0,         // m/s, strongest hit on a crate or the booth this frame
    bump: null,             // { other, speed } — strongest hit by another robot this frame
    frustration: 0,         // 0..1, rises with collisions and cools down over time
  };
}

export function idleCommand() {
  return { move: { x: 0, y: 0 }, action: false };
}

/** Turns the robot's current command into motor forces for one physics step. */
export function driveRobot(robot, dt) {
  const spec = robot.spec;
  const move = robot.command.move;
  const inputMagnitude = Math.min(1, Math.hypot(move.x, move.y));
  const hasInput = inputMagnitude > 0;

  let headingError = 0;
  if (hasInput) {
    headingError = wrapAngle(Math.atan2(move.y, move.x) - robot.heading);
  }
  const targetTurnRate = clamp(headingError * TURN_RESPONSE, -spec.maxTurnRate, spec.maxTurnRate);
  robot.angularVelocity = approach(robot.angularVelocity, targetTurnRate, spec.turnAccel * dt);
  robot.heading = wrapAngle(robot.heading + robot.angularVelocity * dt);

  // Motors only push forward, and only as much as the robot already faces the requested direction.
  const targetThrottle = hasInput ? inputMagnitude * Math.max(0, Math.cos(headingError)) : 0;
  const spoolStep = spec.spoolRate * dt * (targetThrottle < robot.throttle ? THROTTLE_RELEASE_FACTOR : 1);
  robot.throttle = approach(robot.throttle, targetThrottle, spoolStep);

  const hx = Math.cos(robot.heading);
  const hy = Math.sin(robot.heading);
  let forward = robot.vx * hx + robot.vy * hy;
  let lateral = -robot.vx * hy + robot.vy * hx;

  forward += robot.throttle * spec.driveForce / spec.mass * dt;
  forward *= Math.exp(-spec.drag * dt);
  if (!hasInput) {
    forward = approach(forward, 0, spec.brakeDecel * dt);
  }
  lateral *= Math.exp(-spec.lateralGrip * dt);

  robot.vx = forward * hx - lateral * hy;
  robot.vy = forward * hy + lateral * hx;
  robot.stride += Math.hypot(robot.vx, robot.vy) * dt;
}

function approach(value, target, maxStep) {
  if (value < target) {
    return Math.min(target, value + maxStep);
  }
  return Math.max(target, value - maxStep);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function wrapAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
