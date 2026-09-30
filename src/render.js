// Canvas renderer: venue first, then robots, camera centred on the active robot.

import { drawRobotBody, drawRobotShadow } from './robot-art.js';

const VISIBLE_METRES_MIN = 24;  // the shorter screen side always shows at least this many metres
const MIN_PIXELS_PER_METRE = 18;
const MAX_PIXELS_PER_METRE = 42;
const PLAN_LINE_RGB = [150, 160, 180];
const PLAN_OPACITY = 0.3;

const COLORS = {
  void: '#0b0d12',
  floor: '#1a1d25',
  wall: '#566077',
  block: '#23262f',
  label: 'rgba(210, 215, 225, 0.55)',
};

export function createRenderer(canvas, level) {
  const ctx = canvas.getContext('2d');
  let planOverlay = null;
  let pixelsPerMetre = MIN_PIXELS_PER_METRE;

  loadPlanOverlay(level.plan.src).then(overlay => { planOverlay = overlay; });

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * ratio);
    canvas.height = Math.floor(window.innerHeight * ratio);
    const shorterSide = Math.min(window.innerWidth, window.innerHeight);
    pixelsPerMetre = Math.max(MIN_PIXELS_PER_METRE,
      Math.min(MAX_PIXELS_PER_METRE, shorterSide / VISIBLE_METRES_MIN));
  }
  window.addEventListener('resize', resize);
  resize();

  function draw(state) {
    const ratio = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const toScreen = (x, y) => ({
      x: width / 2 + (x - state.camera.x) * pixelsPerMetre,
      y: height / 2 + (y - state.camera.y) * pixelsPerMetre,
    });

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = COLORS.void;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(pixelsPerMetre, pixelsPerMetre);
    ctx.translate(-state.camera.x, -state.camera.y);

    drawFloor(ctx, level);
    if (planOverlay) {
      ctx.globalAlpha = PLAN_OPACITY;
      const scale = level.plan.metresPerPx;
      ctx.drawImage(planOverlay, 0, 0, planOverlay.width * scale, planOverlay.height * scale);
      ctx.globalAlpha = 1;
    }
    drawWalls(ctx, level);

    const robots = state.robots;
    robots.forEach(robot => drawRobotShadow(ctx, robot));
    drawSelection(ctx, state.robots[state.activeIndex], state.time);
    robots.forEach(robot => drawRobotBody(ctx, robot));
    ctx.restore();

    drawLabels(ctx, level, toScreen);
  }

  return { draw };
}

function drawFloor(ctx, level) {
  ctx.fillStyle = COLORS.floor;
  ctx.beginPath();
  level.outline.forEach((point, index) => (index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
  ctx.closePath();
  ctx.fill();
}

function drawWalls(ctx, level) {
  ctx.fillStyle = COLORS.block;
  for (const polygon of level.blocks) {
    ctx.beginPath();
    polygon.forEach((point, index) => (index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = COLORS.wall;
  ctx.lineCap = 'round';
  ctx.lineWidth = level.segments[0]?.halfThickness * 2 || 0.3;
  ctx.beginPath();
  for (const segment of level.segments) {
    ctx.moveTo(segment.ax, segment.ay);
    ctx.lineTo(segment.bx, segment.by);
  }
  ctx.stroke();
}

function drawSelection(ctx, robot, time) {
  const pulse = 0.5 + 0.5 * Math.sin(time * 4);
  ctx.strokeStyle = robot.spec.color;
  ctx.globalAlpha = 0.35 + 0.35 * pulse;
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  ctx.arc(robot.x, robot.y, robot.radius + 0.18 + pulse * 0.05, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawLabels(ctx, level, toScreen) {
  ctx.fillStyle = COLORS.label;
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const label of level.labels) {
    const point = toScreen(label.x, label.y);
    ctx.fillText(label.text, point.x, point.y);
  }
}

/** Turns the black-on-white floor plan into light lines on a transparent background. */
async function loadPlanOverlay(src) {
  try {
    const image = new Image();
    image.src = src;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = pixels.data;
    for (let i = 0; i < data.length; i += 4) {
      const darkness = 255 - data[i];
      data[i] = PLAN_LINE_RGB[0];
      data[i + 1] = PLAN_LINE_RGB[1];
      data[i + 2] = PLAN_LINE_RGB[2];
      data[i + 3] = darkness;
    }
    context.putImageData(pixels, 0, 0);
    return canvas;
  } catch {
    return null; // the game is fully playable without the overlay
  }
}
