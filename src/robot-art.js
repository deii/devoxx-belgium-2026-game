// Top-down vector drawings of the three robots, drawn from the Devoxx model sheets.
// Units are metres; the caller has already translated to the robot and rotated so +x is forward.

const SHADOW_OFFSET = { x: 0.1, y: 0.16 };
const BLINK_INTERVAL = 3.7;          // s between Voxxy's blinks
const BLINK_DURATION = 0.12;         // s
const IDLE_SPEED = 0.3;              // m/s — below this a robot counts as standing still
const DROID_STEP_LENGTH = 0.6;       // m per step
const BIGGY_STEP_LENGTH = 0.9;       // m per step, matches the footfall dust and thuds
const GLITCH_GHOST_OPACITY = 0.3;

/**
 * Where Droid is looking, relative to its heading: into turns while walking, and slowly scanning
 * the room while it stands still. The torch in lighting.js follows the same angle.
 */
export function droidLook(robot, time) {
  return robot.angularVelocity * 0.12 + Math.sin(time * 0.7) * 0.35 * idleShare(robot);
}

function idleShare(robot) {
  return Math.max(0, 1 - Math.hypot(robot.vx, robot.vy) / IDLE_SPEED);
}

export function drawRobotShadow(ctx, robot) {
  ctx.save();
  ctx.translate(robot.x + SHADOW_OFFSET.x, robot.y + SHADOW_OFFSET.y);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 0, robot.radius * 1.05, robot.radius * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draws a robot with its motion: stride-driven limbs, a lean into turns, idle breathing, and — for
 * the Heisenbug's culprit while a glitch is active — a faint jittering double.
 */
export function drawRobotBody(ctx, robot, time = 0, glitching = false) {
  if (glitching) {
    ctx.save();
    ctx.globalAlpha = GLITCH_GHOST_OPACITY;
    drawPose(ctx, robot, time, { x: (Math.random() - 0.5) * 0.16, y: (Math.random() - 0.5) * 0.16 });
    ctx.restore();
  }
  drawPose(ctx, robot, time, { x: 0, y: 0 });
}

function drawPose(ctx, robot, time, offset) {
  ctx.save();
  ctx.translate(robot.x + offset.x, robot.y + offset.y);
  ctx.rotate(robot.heading);
  // lean: the body swings a little to the outside of a turn
  ctx.translate(0, -robot.angularVelocity * 0.015 * robot.radius);
  const breathing = 1 + Math.sin(time * 2.2 + robot.radius * 7) * 0.012 * idleShare(robot);
  ctx.scale(breathing, breathing);
  const swing = Math.sin(robot.stride * 6) * 0.05;
  if (robot.type === 'voxxy') {
    drawVoxxy(ctx, swing, robot, time);
  } else if (robot.type === 'droid') {
    drawDroid(ctx, robot, time);
  } else {
    drawBiggy(ctx, robot, time);
  }
  ctx.restore();
}

function glossy(ctx, x, y, rx, ry, inner, outer) {
  const gradient = ctx.createRadialGradient(x - rx * 0.3, y - ry * 0.3, 0, x, y, Math.max(rx, ry));
  gradient.addColorStop(0, inner);
  gradient.addColorStop(1, outer);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function glow(ctx, x, y, radius, color) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Voxxy: glossy orange, bear ears, black visor with glowing eyes, white "headphone" discs,
// long arms with white bands.
function drawVoxxy(ctx, swing, robot, time) {
  const speed = Math.hypot(robot.vx, robot.vy);
  const earTwitch = Math.sin(time * 18) * 0.015 * Math.min(1, speed / 3);
  const lookAround = Math.sin(time * 0.9) * 0.05 * idleShare(robot);
  const eyeShift = Math.max(-0.05, Math.min(0.05, robot.angularVelocity * 0.012)) + lookAround;
  const blinking = (time + 1.3) % BLINK_INTERVAL < BLINK_DURATION;
  for (const side of [-1, 1]) {
    const armX = -0.04 + swing * side;
    glossy(ctx, armX, side * 0.43, 0.17, 0.085, '#ffa64d', '#d9620a');
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(armX - 0.02, side * 0.43 - 0.08, 0.05, 0.16);
  }
  glossy(ctx, 0, 0, 0.36, 0.41, '#ffb060', '#e2680c');
  for (const side of [-1, 1]) {
    glossy(ctx, -0.14 + earTwitch * side, side * 0.29, 0.1, 0.1, '#ffa64d', '#cc5c08');
    ctx.fillStyle = '#f4f4f4';
    ctx.beginPath();
    ctx.arc(0.04, side * 0.4, 0.085, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e2680c';
    ctx.beginPath();
    ctx.arc(0.04, side * 0.4, 0.035, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#121212';
  ctx.beginPath();
  ctx.ellipse(0.25, 0, 0.12, 0.27, 0, 0, Math.PI * 2);
  ctx.fill();
  if (blinking) {
    ctx.strokeStyle = '#ff9d2e';
    ctx.lineWidth = 0.015;
    ctx.beginPath();
    ctx.moveTo(0.3, -0.13 + eyeShift);
    ctx.lineTo(0.3, -0.07 + eyeShift);
    ctx.moveTo(0.3, 0.07 + eyeShift);
    ctx.lineTo(0.3, 0.13 + eyeShift);
    ctx.stroke();
  } else {
    glow(ctx, 0.3, -0.1 + eyeShift, 0.035, '#ff9d2e');
    glow(ctx, 0.3, 0.1 + eyeShift, 0.035, '#ff9d2e');
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.ellipse(-0.1, -0.13, 0.12, 0.06, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

// Droid: tall graphite frame, rust-rimmed shoulder joints, long arms, small dome head with amber eyes.
function drawDroid(ctx, robot, time) {
  const step = Math.sin(robot.stride * Math.PI / DROID_STEP_LENGTH);
  ctx.fillStyle = '#1f2328';
  for (const side of [-1, 1]) {                                   // feet, one ahead of the other
    ctx.beginPath();
    ctx.ellipse(0.02 + step * side * 0.18, side * 0.15, 0.11, 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const swing = step * 0.07;
  for (const side of [-1, 1]) {
    const reach = swing * side;
    ctx.strokeStyle = '#2d3137';
    ctx.lineWidth = 0.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.12 + reach, side * 0.45);
    ctx.lineTo(0.28 + reach, side * 0.47);
    ctx.stroke();
    ctx.fillStyle = '#6b6f75';
    ctx.beginPath();
    ctx.arc(0.08 + reach, side * 0.46, 0.04, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#3b4048';
  ctx.beginPath();
  ctx.roundRect(-0.2, -0.42, 0.36, 0.84, 0.12);
  ctx.fill();
  for (const side of [-1, 1]) {
    ctx.strokeStyle = '#a0612e';
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.arc(-0.02, side * 0.33, 0.12, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(200, 200, 200, 0.18)';
  ctx.lineWidth = 0.015;
  ctx.beginPath();
  ctx.moveTo(-0.14, -0.1);
  ctx.lineTo(-0.02, -0.18);
  ctx.moveTo(-0.1, 0.16);
  ctx.lineTo(0.02, 0.12);
  ctx.stroke();
  ctx.save();
  ctx.translate(0.06, 0);
  ctx.rotate(droidLook(robot, time));
  glossy(ctx, 0, 0, 0.19, 0.17, '#4a5058', '#23272c');
  const eyeRadius = 0.028 + Math.sin(time * 3) * 0.004;
  glow(ctx, 0.15, -0.06, eyeRadius, '#ffc46b');
  glow(ctx, 0.15, 0.06, eyeRadius, '#ffc46b');
  ctx.restore();
}

// Biggy: round blue-grey helmet over a rusty orange belly, bolted portholes, arm pods, antenna.
function drawBiggy(ctx, robot, time) {
  const phase = robot.stride * Math.PI / BIGGY_STEP_LENGTH;
  const step = Math.sin(phase);
  const speedShare = Math.min(1, Math.hypot(robot.vx, robot.vy) / 2.5);
  const swing = step * 0.06;
  ctx.fillStyle = '#20262d';
  for (const side of [-1, 1]) {                                   // feet peeking out at the front
    ctx.beginPath();
    ctx.ellipse(0.72 + step * side * 0.1, side * 0.36, 0.16, 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.rotate(step * 0.05 * speedShare);                              // waddle
  const spread = 1 + Math.abs(Math.cos(phase)) * 0.035 * speedShare;  // flattens out as a foot lands
  ctx.scale(spread, spread);
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#4b5b6f';
    ctx.beginPath();
    ctx.roundRect(-0.25 + swing * side * 0.5, side * 0.82 - 0.12, 0.5, 0.24, 0.1);
    ctx.fill();
  }
  glossy(ctx, 0, 0, 0.8, 0.8, '#d9774a', '#9c4424');
  ctx.fillStyle = 'rgba(70, 60, 60, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0.45, -0.3, 0.14, 0.09, 0.4, 0, Math.PI * 2);
  ctx.ellipse(0.52, 0.28, 0.1, 0.07, -0.3, 0, Math.PI * 2);
  ctx.fill();
  glossy(ctx, -0.2, 0, 0.6, 0.74, '#6a7d95', '#3f4d5f');
  ctx.strokeStyle = 'rgba(20, 25, 32, 0.6)';
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  ctx.ellipse(-0.2, 0, 0.42, 0.55, 0, 0, Math.PI * 2);
  ctx.stroke();
  for (const offset of [-0.3, 0, 0.3]) {
    ctx.fillStyle = '#2a323c';
    ctx.beginPath();
    ctx.arc(0.28, offset, 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a97a6';
    ctx.beginPath();
    ctx.arc(0.28, offset, 0.03, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#f1e6dc';
  ctx.lineWidth = 0.025;
  ctx.beginPath();
  ctx.arc(0.62, 0, 0.1, 0, Math.PI * 2);
  ctx.moveTo(0.6, -0.04);
  ctx.lineTo(0.6, 0.04);
  ctx.moveTo(0.65, -0.04);
  ctx.lineTo(0.65, 0.04);
  ctx.stroke();
  // the antenna tip lags behind turns and bounces with each step
  const tipX = -0.75 + Math.cos(phase * 2) * 0.03 * speedShare;
  const tipY = 0.42 + robot.angularVelocity * 0.08 + Math.sin(time * 5) * 0.01;
  ctx.strokeStyle = '#1e242b';
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  ctx.moveTo(-0.35, 0.2);
  ctx.quadraticCurveTo(-0.55, 0.3, tipX, tipY);
  ctx.stroke();
  const antennaOn = Math.sin(time * 4) > -0.6;
  glow(ctx, tipX, tipY, 0.025, antennaOn ? '#ff6a3d' : '#5a2618');
}
