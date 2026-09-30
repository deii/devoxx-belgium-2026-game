// Physical feel: dust where robots skid, stomp or crash, and camera shake scaled by mass × impact.

import { BIGGY_STEP_LENGTH } from './robots.js';

const SKID_THRESHOLD = 0.7;          // m/s of sideways slip before dust appears
const SKID_DUST_PER_SECOND = 40;
const BIGGY_STEP_SHAKE = 0.035;      // m of camera shake per footfall
const IMPACT_THRESHOLD = 0.6;        // m/s
const IMPACT_DUST_PER_MPS = 10;
const SHAKE_PER_IMPULSE = 0.00035;   // m of shake per kg·m/s of impact
const MAX_SHAKE = 0.45;              // m
const SHAKE_DECAY = 9;               // 1/s
const SHAKE_HEARING_RANGE = 14;      // m — impacts further from the camera do not shake it
const MAX_PARTICLES = 400;
const PARTICLE_DRAG = 3;             // 1/s
const PARTICLE_OPACITY = 0.55;

export function createEffects() {
  return { particles: [], shake: 0 };
}

/** Called once per rendered frame, before the robots' impact records are cleared. */
export function updateEffects(effects, state, dt) {
  for (const robot of state.robots) {
    const speed = Math.hypot(robot.vx, robot.vy);
    const hx = Math.cos(robot.heading);
    const hy = Math.sin(robot.heading);
    const slip = Math.abs(-robot.vx * hy + robot.vy * hx);

    if (slip > SKID_THRESHOLD) {
      emitOverTime(effects, robot, SKID_DUST_PER_SECOND * dt, 0.25, 0.9);
    }
    if (robot.type === 'biggy' && speed > 0.2) {
      robot.stepDistance = (robot.stepDistance || 0) + speed * dt;
      if (robot.stepDistance >= BIGGY_STEP_LENGTH) {
        robot.stepDistance = 0;
        robot.stepSide = -(robot.stepSide || 1);
        const side = robot.stepSide * robot.radius * 0.55;
        burst(effects, robot.x - hy * side, robot.y + hx * side, 5, 0.5, 0.7);
        addShake(effects, state, robot, BIGGY_STEP_SHAKE);
      }
    }
    if (robot.lastImpact > IMPACT_THRESHOLD) {
      burst(effects, robot.x + hx * robot.radius, robot.y + hy * robot.radius,
        Math.round(robot.lastImpact * IMPACT_DUST_PER_MPS), robot.lastImpact * 0.6, 1.1);
      addShake(effects, state, robot, robot.lastImpact * robot.mass * SHAKE_PER_IMPULSE);
    }
  }

  const damping = Math.exp(-PARTICLE_DRAG * dt);
  effects.particles = effects.particles.filter(particle => {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= damping;
    particle.vy *= damping;
    particle.size += dt * 0.25;
    return particle.life > 0;
  });
  if (effects.particles.length > MAX_PARTICLES) {
    effects.particles.splice(0, effects.particles.length - MAX_PARTICLES);
  }
  effects.shake *= Math.exp(-SHAKE_DECAY * dt);
}

export function cameraShakeOffset(effects, time) {
  return {
    x: effects.shake * Math.sin(time * 71),
    y: effects.shake * Math.cos(time * 53),
  };
}

export function drawParticles(ctx, effects) {
  for (const particle of effects.particles) {
    const alpha = Math.max(0, particle.life / particle.maxLife) * PARTICLE_OPACITY;
    ctx.fillStyle = `rgba(190, 180, 165, ${alpha})`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function addShake(effects, state, robot, amount) {
  const distance = Math.hypot(robot.x - state.camera.x, robot.y - state.camera.y);
  const falloff = Math.max(0, 1 - distance / SHAKE_HEARING_RANGE);
  effects.shake = Math.min(MAX_SHAKE, effects.shake + amount * falloff);
}

/** Emits a fractional number of particles per frame without losing the remainder. */
function emitOverTime(effects, robot, count, speed, life) {
  robot.dustCarry = (robot.dustCarry || 0) + count;
  const whole = Math.floor(robot.dustCarry);
  robot.dustCarry -= whole;
  burst(effects, robot.x, robot.y, whole, speed, life);
}

function burst(effects, x, y, count, speed, life) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = speed * (0.4 + Math.random() * 0.6);
    effects.particles.push({
      x: x + (Math.random() - 0.5) * 0.3,
      y: y + (Math.random() - 0.5) * 0.3,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      size: 0.1 + Math.random() * 0.1,
      life,
      maxLife: life,
    });
  }
}
