// Lighting: a darkness mask with lights cut out of it, then a thin additive pass for coloured glow.
// Before the fuse panel is reset the floor runs on daylight, exit signs and emergency lights;
// Droid's eyes are the only real torch. Power brings the ceiling lamps back with a fluorescent
// flicker, turns on Room 8's house lights and starts the projector.

const DARKNESS_RGB = '3, 5, 10';
const AMBIENT_DARKNESS_UNPOWERED = 0.9;
const AMBIENT_DARKNESS_POWERED = 0.5;
const POWER_FLICKER_DURATION = 1.4;   // s
const VIEW_MARGIN = 12;               // m — lights this far off screen still count

const LIGHTS = {
  daylight: { radius: 17, intensity: 0.8, glow: 'rgba(255, 236, 205, 0.045)' },
  exitSign: { radius: 2.4, intensity: 0.55, glow: 'rgba(60, 255, 120, 0.35)', glowRadius: 1.1 },
  emergency: { radius: 5, intensity: 0.4 },
  ceilingLamp: { radius: 7, intensity: 0.85 },
  houseLights: { intensity: 0.7 },
  droidTorch: { radius: 10, halfAngle: 0.42, intensity: 0.95, glow: 'rgba(255, 196, 107, 0.10)' },
  droidEyes: { radius: 1.6, intensity: 0.5 },
  voxxyVisor: { radius: 2.8, intensity: 0.6, glow: 'rgba(255, 140, 40, 0.10)' },
  biggyAntenna: { radius: 1.4, intensity: 0.35 },
  projector: { intensity: 0.9, idleRgb: '80, 140, 255', playingRgb: '255, 245, 220', glowAlpha: 0.22 },
};

export function createLighting() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let poweredSince = null;

  /** `view` carries screen size, device ratio and the world→screen transform. */
  function draw(target, state, view) {
    if (canvas.width !== target.canvas.width || canvas.height !== target.canvas.height) {
      canvas.width = target.canvas.width;
      canvas.height = target.canvas.height;
    }
    const mission = state.mission;
    if (mission.power && poweredSince === null) {
      poweredSince = state.time;
    } else if (!mission.power) {
      poweredSince = null;
    }
    const power = mission.power ? powerLevel(state.time - poweredSince) : 0;
    const ambient = AMBIENT_DARKNESS_UNPOWERED
      + (AMBIENT_DARKNESS_POWERED - AMBIENT_DARKNESS_UNPOWERED) * power;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = `rgba(${DARKNESS_RGB}, ${ambient})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    view.applyWorldTransform(ctx);
    ctx.globalCompositeOperation = 'destination-out';
    const visible = point => Math.abs(point.x - view.centerX) < view.halfWidth + VIEW_MARGIN
      && Math.abs(point.y - view.centerY) < view.halfHeight + VIEW_MARGIN;
    const lighting = state.level.lighting;

    lighting.daylight.filter(([x, y]) => visible({ x, y }))
      .forEach(([x, y]) => pointLight(ctx, x, y, LIGHTS.daylight.radius, LIGHTS.daylight.intensity));
    lighting.exitSigns.forEach(([x, y]) => pointLight(ctx, x, y, LIGHTS.exitSign.radius, LIGHTS.exitSign.intensity));
    lighting.emergencyLights.forEach(([x, y]) => pointLight(ctx, x, y, LIGHTS.emergency.radius, LIGHTS.emergency.intensity));
    if (power > 0) {
      lighting.ceilingLamps.filter(([x, y]) => visible({ x, y }))
        .forEach(([x, y]) => pointLight(ctx, x, y, LIGHTS.ceilingLamp.radius, LIGHTS.ceilingLamp.intensity * power));
      houseLights(ctx, state.level.mission.room8, LIGHTS.houseLights.intensity * power);
      projectorBeam(ctx, state.level, '0, 0, 0', LIGHTS.projector.intensity * power);
    }
    state.robots.forEach(robot => robotLights(ctx, robot, state));

    // Coloured glow on top of the lit scene.
    target.save();
    target.setTransform(1, 0, 0, 1, 0, 0);
    target.drawImage(canvas, 0, 0);
    target.restore();

    target.save();
    view.applyWorldTransform(target);
    target.globalCompositeOperation = 'lighter';
    lighting.daylight.filter(([x, y]) => visible({ x, y }))
      .forEach(([x, y]) => pointGlow(target, x, y, LIGHTS.daylight.radius, LIGHTS.daylight.glow));
    lighting.exitSigns.forEach(([x, y]) => pointGlow(target, x, y, LIGHTS.exitSign.glowRadius, LIGHTS.exitSign.glow));
    if (power > 0) {
      const rgb = mission.adapter.delivered ? LIGHTS.projector.playingRgb : LIGHTS.projector.idleRgb;
      projectorBeam(target, state.level, rgb, LIGHTS.projector.glowAlpha * power);
    }
    state.robots.forEach(robot => robotGlow(target, robot, state));
    target.restore();
  }

  return { draw };
}

/** Fluorescent start-up: random flicker that settles into full power. */
function powerLevel(elapsed) {
  if (elapsed >= POWER_FLICKER_DURATION) {
    return 1;
  }
  return Math.random() < elapsed / POWER_FLICKER_DURATION ? 1 : 0.15;
}

function pointLight(ctx, x, y, radius, intensity) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `rgba(0, 0, 0, ${intensity})`);
  gradient.addColorStop(0.5, `rgba(0, 0, 0, ${intensity * 0.55})`);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function pointGlow(ctx, x, y, radius, color) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function coneLight(ctx, x, y, heading, radius, halfAngle, color) {
  const gradient = ctx.createRadialGradient(x, y, 0.3, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, radius, heading - halfAngle, heading + halfAngle);
  ctx.closePath();
  ctx.fill();
}

function houseLights(ctx, room, intensity) {
  ctx.fillStyle = `rgba(0, 0, 0, ${intensity})`;
  ctx.fillRect(room.x1, room.y1, room.x2 - room.x1, room.y2 - room.y1);
}

/** The projector throws a widening beam from the booth to the screen. */
function projectorBeam(ctx, level, rgb, alpha) {
  const origin = level.lighting.projector;
  const screen = level.mission.screen;
  const gradient = ctx.createLinearGradient(origin.x, origin.y, screen.x, origin.y);
  gradient.addColorStop(0, `rgba(${rgb}, ${alpha})`);
  gradient.addColorStop(1, `rgba(${rgb}, ${alpha * 0.35})`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y - 0.2);
  ctx.lineTo(screen.x, screen.y1);
  ctx.lineTo(screen.x, screen.y2);
  ctx.lineTo(origin.x, origin.y + 0.2);
  ctx.closePath();
  ctx.fill();
}

/** A robot whose sensors are blacked out by the Heisenbug has its lights out as well. */
function lightsOut(robot, state) {
  const bug = state.heisenbug;
  return bug.active?.kind === 'blackout' && bug.culprit === robot.type && !bug.patched;
}

function robotLights(ctx, robot, state) {
  if (lightsOut(robot, state)) {
    return;
  }
  if (robot.type === 'droid') {
    const torch = LIGHTS.droidTorch;
    coneLight(ctx, robot.x, robot.y, robot.heading, torch.radius, torch.halfAngle, `rgba(0, 0, 0, ${torch.intensity})`);
    pointLight(ctx, robot.x, robot.y, LIGHTS.droidEyes.radius, LIGHTS.droidEyes.intensity);
  } else if (robot.type === 'voxxy') {
    pointLight(ctx, robot.x, robot.y, LIGHTS.voxxyVisor.radius, LIGHTS.voxxyVisor.intensity);
  } else {
    pointLight(ctx, robot.x, robot.y, LIGHTS.biggyAntenna.radius, LIGHTS.biggyAntenna.intensity);
  }
}

function robotGlow(ctx, robot, state) {
  if (lightsOut(robot, state)) {
    return;
  }
  if (robot.type === 'droid') {
    const torch = LIGHTS.droidTorch;
    coneLight(ctx, robot.x, robot.y, robot.heading, torch.radius, torch.halfAngle, torch.glow);
  } else if (robot.type === 'voxxy') {
    pointGlow(ctx, robot.x, robot.y, LIGHTS.voxxyVisor.radius * 0.6, LIGHTS.voxxyVisor.glow);
  }
}
