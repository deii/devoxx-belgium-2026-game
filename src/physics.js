// Minimal rigid-body physics: circles (robots) against wall segments and against each other.
// Masses matter: a collision moves the lighter body more, which is how Biggy shoves Voxxy aside.

const WALL_SCRAPE_FRICTION = 0.15;
const EPSILON = 1e-6;

export function integrate(body, dt) {
  body.x += body.vx * dt;
  body.y += body.vy * dt;
}

/** Resolves contact with every wall; returns the strongest impact speed (m/s), 0 if none. */
export function collideWithWalls(body, segments) {
  let strongestImpact = 0;
  for (const segment of segments) {
    strongestImpact = Math.max(strongestImpact, collideCircleSegment(body, segment));
  }
  return strongestImpact;
}

function collideCircleSegment(body, segment) {
  const ex = segment.bx - segment.ax;
  const ey = segment.by - segment.ay;
  const lengthSq = ex * ex + ey * ey;
  let t = lengthSq > 0 ? ((body.x - segment.ax) * ex + (body.y - segment.ay) * ey) / lengthSq : 0;
  t = Math.max(0, Math.min(1, t));

  let nx = body.x - (segment.ax + ex * t);
  let ny = body.y - (segment.ay + ey * t);
  const minDistance = body.radius + segment.halfThickness;
  const distanceSq = nx * nx + ny * ny;
  if (distanceSq >= minDistance * minDistance) {
    return 0;
  }

  const distance = Math.sqrt(distanceSq);
  if (distance < EPSILON) {
    const length = Math.hypot(ex, ey) || 1;
    nx = -ey / length;
    ny = ex / length;
  } else {
    nx /= distance;
    ny /= distance;
  }

  const penetration = minDistance - distance;
  body.x += nx * penetration;
  body.y += ny * penetration;

  const normalSpeed = body.vx * nx + body.vy * ny;
  if (normalSpeed >= 0) {
    return 0;
  }
  body.vx -= (1 + body.restitution) * normalSpeed * nx;
  body.vy -= (1 + body.restitution) * normalSpeed * ny;

  const tx = -ny;
  const ty = nx;
  const tangentSpeed = body.vx * tx + body.vy * ty;
  body.vx -= tangentSpeed * WALL_SCRAPE_FRICTION * tx;
  body.vy -= tangentSpeed * WALL_SCRAPE_FRICTION * ty;
  return -normalSpeed;
}

/** Mass-weighted impulse between two circles; returns the impact speed (m/s), 0 if none. */
export function collideBodies(a, b) {
  let nx = b.x - a.x;
  let ny = b.y - a.y;
  const minDistance = a.radius + b.radius;
  const distanceSq = nx * nx + ny * ny;
  if (distanceSq >= minDistance * minDistance) {
    return 0;
  }

  const distance = Math.sqrt(distanceSq);
  if (distance < EPSILON) {
    nx = 1;
    ny = 0;
  } else {
    nx /= distance;
    ny /= distance;
  }

  const inverseMassA = 1 / a.mass;
  const inverseMassB = 1 / b.mass;
  const inverseMassSum = inverseMassA + inverseMassB;

  const penetration = minDistance - distance;
  a.x -= nx * penetration * inverseMassA / inverseMassSum;
  a.y -= ny * penetration * inverseMassA / inverseMassSum;
  b.x += nx * penetration * inverseMassB / inverseMassSum;
  b.y += ny * penetration * inverseMassB / inverseMassSum;

  const approachSpeed = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (approachSpeed >= 0) {
    return 0;
  }
  const restitution = Math.min(a.restitution, b.restitution);
  const impulse = -(1 + restitution) * approachSpeed / inverseMassSum;
  a.vx -= impulse * inverseMassA * nx;
  a.vy -= impulse * inverseMassA * ny;
  b.vx += impulse * inverseMassB * nx;
  b.vy += impulse * inverseMassB * ny;
  return -approachSpeed;
}
