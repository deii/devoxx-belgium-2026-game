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

export function drawFusePanel(ctx, level, mission, time) {
  const panel = level.mission.fusePanel;
  ctx.fillStyle = '#3a3f48';
  ctx.fillRect(panel.x - 0.35, panel.y - 0.5, 0.5, 1);
  const lit = mission.power || Math.sin(time * 5) > 0;
  ctx.fillStyle = mission.power ? '#3ddc84' : (lit ? '#ff3b30' : '#5a1a18');
  ctx.beginPath();
  ctx.arc(panel.x - 0.1, panel.y, 0.1, 0, Math.PI * 2);
  ctx.fill();
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
