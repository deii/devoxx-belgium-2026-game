// Canvas renderer: venue, props and robots in world space, then lighting, then screen-space labels.

import { cameraShakeOffset, drawParticles } from './effects.js';
import { createLighting } from './lighting.js';
import {
  drawAdapter, drawBarriers, drawCrates, drawDecor, drawDoor, drawMainBreaker, drawMaintenanceBay, drawRoom8, drawRurPoster,
  drawTravelPoints,
} from './render-props.js';
import { drawRobotBody, drawRobotShadow } from './robot-art.js';
import { drawSpeech } from './speech.js';

const VISIBLE_METRES_MIN = 24;  // the shorter screen side always shows at least this many metres
const MIN_PIXELS_PER_METRE = 18;
const MAX_PIXELS_PER_METRE = 42;
const ZOOM_MIN = 0.5;           // player zoom, relative to the size-based default
const ZOOM_MAX = 2;
const ZOOM_STEP = 1.25;         // factor per key press or mouse-wheel notch
const ZOOM_RATE = 12;           // 1/s — how quickly the view eases to the requested zoom
const PLAN_LINE_RGB = [150, 160, 180];
const PLAN_OPACITY = 0.3;
const WALL_WIDTH = 0.3;

const COLORS = {
  void: '#0b0d12',
  floor: '#262a33',
  wall: '#566077',
  block: '#23262f',
  label: 'rgba(210, 215, 225, 0.55)',
};

export function createRenderer(canvas, level) {
  const ctx = canvas.getContext('2d');
  const lighting = createLighting();
  let pixelsPerMetre = MIN_PIXELS_PER_METRE;
  let zoom = 1;
  let targetZoom = 1;
  let lastDrawTime = null;

  const planOverlays = level.plans.map(() => null);
  level.plans.forEach((plan, index) => {
    loadPlanOverlay(plan.src).then(overlay => { planOverlays[index] = overlay; });
  });

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

  function createView(state, effects) {
    const ratio = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const shake = cameraShakeOffset(effects, state.time);
    const centerX = state.camera.x + shake.x;
    const centerY = state.camera.y + shake.y;
    const scale = pixelsPerMetre * zoom;
    return {
      width,
      height,
      centerX,
      centerY,
      halfWidth: width / 2 / scale,
      halfHeight: height / 2 / scale,
      applyWorldTransform(context) {
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.translate(width / 2, height / 2);
        context.scale(scale, scale);
        context.translate(-centerX, -centerY);
      },
      toScreen(x, y) {
        return { x: width / 2 + (x - centerX) * scale, y: height / 2 + (y - centerY) * scale };
      },
    };
  }

  /** Zooms in (positive steps) or out (negative); fractional steps come from smooth scrolling. */
  function zoomBy(steps) {
    targetZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, targetZoom * ZOOM_STEP ** steps));
  }

  function resetZoom() {
    targetZoom = 1;
  }

  function easeZoom() {
    const now = performance.now();
    const dt = lastDrawTime === null ? 0 : Math.min(0.1, (now - lastDrawTime) / 1000);
    lastDrawTime = now;
    zoom += (targetZoom - zoom) * (1 - Math.exp(-ZOOM_RATE * dt));
  }

  function draw(state, effects, speech) {
    const ratio = window.devicePixelRatio || 1;
    easeZoom();
    const view = createView(state, effects);
    const mission = state.mission;
    const robots = state.robots;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = COLORS.void;
    ctx.fillRect(0, 0, view.width, view.height);

    ctx.save();
    view.applyWorldTransform(ctx);
    drawFloor(ctx, level);
    ctx.globalAlpha = PLAN_OPACITY;
    level.plans.forEach((plan, index) => {
      const overlay = planOverlays[index];
      if (overlay) {
        const scale = plan.metresPerPx;
        ctx.drawImage(overlay, plan.offset.x, plan.offset.y, overlay.width * scale, overlay.height * scale);
      }
    });
    ctx.globalAlpha = 1;
    drawRoom8(ctx, level, mission);
    drawMaintenanceBay(ctx, level, state.heisenbug);
    drawTravelPoints(ctx, level);
    drawWalls(ctx, level);
    drawDecor(ctx, level);
    drawRurPoster(ctx, level);
    drawBarriers(ctx, level);
    drawDoor(ctx, level, mission);
    drawCrates(ctx, mission.crates);
    robots.forEach(robot => drawRobotShadow(ctx, robot));
    drawParticles(ctx, effects);
    robots.forEach(robot => drawRobotBody(ctx, robot));
    ctx.restore();

    lighting.draw(ctx, state, view);

    // Things the player must be able to find in the dark are drawn on top of the lighting.
    ctx.save();
    view.applyWorldTransform(ctx);
    drawMainBreaker(ctx, level, mission, state.time);
    drawAdapter(ctx, mission.adapter, state.time);
    drawSelection(ctx, robots[state.activeIndex], state.time);
    ctx.restore();

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawLabels(ctx, level, view.toScreen);
    drawSpeech(ctx, speech, state, view.toScreen);
  }

  return { draw, zoomBy, resetZoom };
}

function drawFloor(ctx, level) {
  ctx.fillStyle = COLORS.floor;
  for (const outline of level.outlines) {
    ctx.beginPath();
    outline.forEach((point, index) => (index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
    ctx.closePath();
    ctx.fill();
  }
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
  ctx.lineJoin = 'round';
  ctx.lineWidth = WALL_WIDTH;
  const tracePath = (points, closed) => {
    points.forEach((point, index) => (index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
    if (closed) {
      ctx.closePath();
    }
  };
  ctx.beginPath();
  level.outlines.forEach(outline => tracePath(outline, false));
  level.walls.forEach(polyline => tracePath(polyline, false));
  level.blocks.forEach(polygon => tracePath(polygon, true));
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
