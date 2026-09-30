// Top-down vector drawings of the three robots, drawn from the Devoxx model sheets.
// Units are metres; the caller has already translated to the robot and rotated so +x is forward.

const SHADOW_OFFSET = { x: 0.1, y: 0.16 };

export function drawRobotShadow(ctx, robot) {
  ctx.save();
  ctx.translate(robot.x + SHADOW_OFFSET.x, robot.y + SHADOW_OFFSET.y);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 0, robot.radius * 1.05, robot.radius * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawRobotBody(ctx, robot) {
  ctx.save();
  ctx.translate(robot.x, robot.y);
  ctx.rotate(robot.heading);
  const swing = Math.sin(robot.stride * 6) * 0.05;
  if (robot.type === 'voxxy') {
    drawVoxxy(ctx, swing);
  } else if (robot.type === 'droid') {
    drawDroid(ctx, swing);
  } else {
    drawBiggy(ctx, swing);
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
function drawVoxxy(ctx, swing) {
  for (const side of [-1, 1]) {
    const armX = -0.04 + swing * side;
    glossy(ctx, armX, side * 0.43, 0.17, 0.085, '#ffa64d', '#d9620a');
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(armX - 0.02, side * 0.43 - 0.08, 0.05, 0.16);
  }
  glossy(ctx, 0, 0, 0.36, 0.41, '#ffb060', '#e2680c');
  for (const side of [-1, 1]) {
    glossy(ctx, -0.14, side * 0.29, 0.1, 0.1, '#ffa64d', '#cc5c08');
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
  glow(ctx, 0.3, -0.1, 0.035, '#ff9d2e');
  glow(ctx, 0.3, 0.1, 0.035, '#ff9d2e');
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.ellipse(-0.1, -0.13, 0.12, 0.06, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

// Droid: tall graphite frame, rust-rimmed shoulder joints, long arms, small dome head with amber eyes.
function drawDroid(ctx, swing) {
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
  glossy(ctx, 0.06, 0, 0.19, 0.17, '#4a5058', '#23272c');
  glow(ctx, 0.21, -0.06, 0.03, '#ffc46b');
  glow(ctx, 0.21, 0.06, 0.03, '#ffc46b');
}

// Biggy: round blue-grey helmet over a rusty orange belly, bolted portholes, arm pods, antenna.
function drawBiggy(ctx, swing) {
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
  ctx.strokeStyle = '#1e242b';
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  ctx.moveTo(-0.35, 0.2);
  ctx.lineTo(-0.75, 0.42);
  ctx.stroke();
  glow(ctx, -0.75, 0.42, 0.025, '#ff6a3d');
}
