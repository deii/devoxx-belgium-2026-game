// Mission props, drawn in world units (metres).

import { DIAGNOSTIC_DURATION } from './glitch.js';

const STANCHION_SPACING = 0.9;
const SEAT_ROW_WIDTH = 0.4;

export function drawRoom8(ctx, level, mission) {
  const screen = level.mission.screen;

  // Seat rows: red upholstery with a darker backrest edge.
  ctx.lineCap = 'butt';
  for (const [start, end] of level.seatRows) {
    ctx.strokeStyle = '#5a2a2e';
    ctx.lineWidth = SEAT_ROW_WIDTH;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.strokeStyle = '#34181b';
    ctx.lineWidth = SEAT_ROW_WIDTH / 3;
    ctx.beginPath();
    ctx.moveTo(start.x - SEAT_ROW_WIDTH / 3, start.y);
    ctx.lineTo(end.x - SEAT_ROW_WIDTH / 3, end.y);
    ctx.stroke();
  }

  ctx.strokeStyle = mission.adapter.delivered ? '#f4f1ea' : (mission.power ? '#6b7385' : '#2e323c');
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(screen.x, screen.y1);
  ctx.lineTo(screen.x, screen.y2);
  ctx.stroke();

  const stage = level.mission.stage;
  ctx.setLineDash([0.4, 0.3]);
  ctx.strokeStyle = mission.power ? 'rgba(255, 138, 31, 0.8)' : 'rgba(255, 138, 31, 0.3)';
  ctx.lineWidth = 0.08;
  ctx.beginPath();
  ctx.arc(stage.x, stage.y, stage.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawBarriers(ctx, level) {
  for (const [start, end] of level.barriers) {
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    ctx.strokeStyle = '#b3262e';
    ctx.lineWidth = 0.08;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    const posts = Math.max(1, Math.round(length / STANCHION_SPACING));
    for (let i = 0; i <= posts; i++) {
      const t = i / posts;
      ctx.fillStyle = '#c9ccd3';
      ctx.beginPath();
      ctx.arc(start.x + (end.x - start.x) * t, start.y + (end.y - start.y) * t, 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawCrates(ctx, crates) {
  for (const crate of crates) {
    const half = crate.radius * 0.82;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(crate.x - half + 0.1, crate.y - half + 0.15, half * 2, half * 2);
    ctx.fillStyle = '#8a6a44';
    ctx.fillRect(crate.x - half, crate.y - half, half * 2, half * 2);
    ctx.strokeStyle = '#5e472c';
    ctx.lineWidth = 0.08;
    ctx.strokeRect(crate.x - half, crate.y - half, half * 2, half * 2);
    ctx.beginPath();
    ctx.moveTo(crate.x - half, crate.y - half);
    ctx.lineTo(crate.x + half, crate.y + half);
    ctx.moveTo(crate.x + half, crate.y - half);
    ctx.lineTo(crate.x - half, crate.y + half);
    ctx.stroke();
    ctx.fillStyle = '#ff8a1f';
    ctx.fillRect(crate.x - half * 0.6, crate.y - 0.12, half * 1.2, 0.24);
  }
}

export function drawMainBreaker(ctx, level, mission, time) {
  const [x, y] = level.mission.mainBreaker;
  const panel = { x, y };
  ctx.fillStyle = '#3a3f48';
  ctx.fillRect(panel.x - 0.5, panel.y - 0.35, 1, 0.5);
  const lit = mission.power || Math.sin(time * 5) > 0;
  ctx.fillStyle = mission.power ? '#3ddc84' : (lit ? '#ff3b30' : '#5a1a18');
  ctx.beginPath();
  ctx.arc(panel.x, panel.y - 0.1, 0.1, 0, Math.PI * 2);
  ctx.fill();
}

// The R.U.R. poster lies flat against the wall of fame, whose west face leans about 11° from north.
const RUR_POSTER_ANGLE = -0.197;   // rad
const RUR_POSTER_SIZE = { width: 1.1, height: 1.6 };

export function drawRurPoster(ctx, level) {
  const poster = level.mission.rurPoster;
  const { width, height } = RUR_POSTER_SIZE;
  ctx.save();
  ctx.translate(poster.x, poster.y);
  ctx.rotate(RUR_POSTER_ANGLE);
  ctx.fillStyle = '#b3261e';
  ctx.fillRect(-width / 2, -height / 2, width, height);
  ctx.fillStyle = '#f1e4c8';
  ctx.fillRect(-width / 2 + 0.08, -height / 2 + 0.08, width - 0.16, 0.5);
  ctx.fillStyle = '#b3261e';
  // Canvas fonts misbehave below 1 px, so the title is drawn at 100× and scaled down.
  ctx.save();
  ctx.scale(0.01, 0.01);
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('R.U.R.', 0, (-height / 2 + 0.34) * 100);
  ctx.restore();
  // a robot silhouette, the way the 1920s posters drew them
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(-0.12, 0.0, 0.24, 0.2);
  ctx.fillRect(-0.2, 0.22, 0.4, 0.36);
  ctx.fillRect(-0.17, 0.6, 0.12, 0.12);
  ctx.fillRect(0.05, 0.6, 0.12, 0.12);
  ctx.restore();
}

export function drawDoor(ctx, level, mission) {
  const door = level.mission.room8Door;
  const closedLength = door.y2 - door.y1;
  const visibleLength = closedLength * (1 - mission.doorOpenAmount);
  if (visibleLength <= 0.01) {
    return;
  }
  ctx.strokeStyle = mission.power ? '#d7a13a' : '#7a6030';
  ctx.lineWidth = 0.3;
  ctx.beginPath();
  ctx.moveTo(door.x1, door.y1);
  ctx.lineTo(door.x1, door.y1 + visibleLength);
  ctx.stroke();
}

export function drawAdapter(ctx, adapter, time) {
  if (adapter.delivered) {
    return;
  }
  ctx.save();
  ctx.translate(adapter.x, adapter.y);
  if (!adapter.carrier) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 3);
    ctx.strokeStyle = `rgba(90, 200, 255, ${0.3 + pulse * 0.5})`;
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.arc(0, 0, 0.45 + pulse * 0.1, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#16181d';
  ctx.fillRect(-0.18, -0.09, 0.36, 0.18);
  ctx.fillStyle = '#d9dde4';
  ctx.fillRect(0.12, -0.06, 0.12, 0.12);
  ctx.restore();
}

const BAY_STRIPES = 16;

export function drawMaintenanceBay(ctx, level, bug) {
  const bay = level.mission.maintenanceBay;
  ctx.fillStyle = 'rgba(90, 200, 255, 0.06)';
  ctx.beginPath();
  ctx.arc(bay.x, bay.y, bay.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 0.18;
  for (let i = 0; i < BAY_STRIPES; i++) {
    const start = (i / BAY_STRIPES) * Math.PI * 2;
    ctx.strokeStyle = i % 2 === 0 ? '#e0b43a' : '#1d2027';
    ctx.beginPath();
    ctx.arc(bay.x, bay.y, bay.radius, start, start + Math.PI * 2 / BAY_STRIPES);
    ctx.stroke();
  }
  if (bug.diagnostic) {
    const progress = 1 - bug.diagnostic.remaining / DIAGNOSTIC_DURATION;
    ctx.strokeStyle = '#5ac8ff';
    ctx.lineWidth = 0.12;
    ctx.beginPath();
    ctx.arc(bay.x, bay.y, bay.radius - 0.25, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.stroke();
  }
}

const STAIR_TREADS = 5;

/** Stairs as treads, the service lift as a door pair; each labelled by the level's text labels. */
export function drawTravelPoints(ctx, level) {
  for (const link of level.links) {
    for (const end of link.ends) {
      if (link.kind === 'stairs') {
        ctx.strokeStyle = 'rgba(170, 180, 200, 0.55)';
        ctx.lineWidth = 0.06;
        for (let i = 0; i < STAIR_TREADS; i++) {
          const offset = (i / (STAIR_TREADS - 1) - 0.5) * end.radius * 1.6;
          ctx.beginPath();
          ctx.moveTo(end.x - end.radius * 0.8, end.y + offset);
          ctx.lineTo(end.x + end.radius * 0.8, end.y + offset);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = 'rgba(90, 200, 255, 0.08)';
        ctx.strokeStyle = '#8fa3b8';
        ctx.lineWidth = 0.08;
        ctx.beginPath();
        ctx.rect(end.x - end.radius, end.y - end.radius, end.radius * 2, end.radius * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(end.x, end.y - end.radius);
        ctx.lineTo(end.x, end.y + end.radius);
        ctx.stroke();
      }
    }
  }
}
