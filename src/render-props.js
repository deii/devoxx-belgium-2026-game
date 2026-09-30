// Props and furniture — mission props, decor, stage, lift, electrical room, maintenance bay — drawn
// in world units (metres).

import { DIAGNOSTIC_DURATION } from './glitch.js';

const STANCHION_SPACING = 0.9;
const SEAT_ROW_WIDTH = 0.4;

export function drawRoom8(ctx, level) {
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
}

const STAGE_DEPTH = 5;             // m from the screen to the stage lip
const STAGE_MARGIN = 1.5;          // m between the stage ends and the side walls
const PLANK_WIDTH = 0.3;

/** The Room 8 stage: planks, lectern with the speaker's laptop, monitors, taped cables, screen. */
export function drawStage(ctx, level, mission, time) {
  const screen = level.mission.screen;
  const stage = level.mission.stage;
  const lip = screen.x - STAGE_DEPTH;
  const top = screen.y1 + STAGE_MARGIN / 2;
  const bottom = screen.y2 - STAGE_MARGIN / 2;

  ctx.fillStyle = '#3a2d23';
  ctx.fillRect(lip, top, screen.x - lip, bottom - top);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  for (let x = lip + PLANK_WIDTH; x < screen.x; x += PLANK_WIDTH) {
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
  }
  ctx.stroke();
  ctx.strokeStyle = '#7a5d44';                         // the stage lip catches the light
  ctx.lineWidth = 0.1;
  ctx.beginPath();
  ctx.moveTo(lip, top);
  ctx.lineTo(lip, bottom);
  ctx.stroke();

  // gaffer-taped cable from the lectern to the screen
  const lectern = { x: lip + 1.2, y: stage.y - 3.2 };
  ctx.strokeStyle = '#141414';
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.moveTo(lectern.x, lectern.y);
  ctx.bezierCurveTo(lectern.x + 1.5, lectern.y + 0.8, screen.x - 1.5, stage.y - 1, screen.x - 0.3, stage.y);
  ctx.stroke();

  for (const offset of [-1, 1]) {                       // stage monitors facing the speaker
    ctx.fillStyle = '#1c1e22';
    ctx.beginPath();
    ctx.moveTo(lip + 0.1, stage.y + offset * 1.6 - 0.35);
    ctx.lineTo(lip + 0.55, stage.y + offset * 1.6 - 0.25);
    ctx.lineTo(lip + 0.55, stage.y + offset * 1.6 + 0.25);
    ctx.lineTo(lip + 0.1, stage.y + offset * 1.6 + 0.35);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = '#23262c';                             // lectern
  ctx.fillRect(lectern.x - 0.3, lectern.y - 0.35, 0.6, 0.7);
  ctx.fillStyle = mission.power ? '#9fd3ff' : '#3a4250';  // the speaker's laptop, waiting
  ctx.fillRect(lectern.x - 0.12, lectern.y - 0.18, 0.26, 0.36);
  ctx.strokeStyle = '#5b606b';                           // microphone on its gooseneck
  ctx.lineWidth = 0.025;
  ctx.beginPath();
  ctx.moveTo(lectern.x - 0.3, lectern.y + 0.2);
  ctx.quadraticCurveTo(lectern.x - 0.55, lectern.y + 0.25, lectern.x - 0.6, lectern.y + 0.05);
  ctx.stroke();

  // the screen, framed; white once the adapter is in
  ctx.fillStyle = '#15171b';
  ctx.fillRect(screen.x - 0.15, screen.y1 - 0.3, 0.45, screen.y2 - screen.y1 + 0.6);
  ctx.fillStyle = mission.adapter.delivered ? '#f4f1ea' : (mission.power ? '#4d5a70' : '#2a2e37');
  ctx.fillRect(screen.x - 0.1, screen.y1, 0.2, screen.y2 - screen.y1);

  // tape mark for the delivery spot
  ctx.setLineDash([0.4, 0.3]);
  ctx.strokeStyle = mission.power ? 'rgba(255, 138, 31, 0.8)' : 'rgba(255, 138, 31, 0.3)';
  ctx.lineWidth = 0.08;
  ctx.beginPath();
  ctx.arc(stage.x, stage.y, stage.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  drawProjectionBooth(ctx, level, mission, time);
}

/** The projection booth behind Room 8's back wall: racks, a console and the projector itself. */
function drawProjectionBooth(ctx, level, mission, time) {
  const booth = level.mission.projectionBooth;
  const projector = level.lighting.projector;
  ctx.fillStyle = '#2a2d33';
  ctx.fillRect(booth.x1 + 0.2, booth.y1 + 0.2, booth.x2 - booth.x1 - 0.4, booth.y2 - booth.y1 - 0.4);
  for (let y = booth.y1 + 0.6; y < booth.y2 - 1.2; y += 1.4) {   // equipment racks
    ctx.fillStyle = '#1a1c20';
    ctx.fillRect(booth.x1 + 0.4, y, 1.2, 1);
    for (let led = 0; led < 4; led++) {
      const on = mission.power && Math.sin(time * 3 + y * 7 + led * 2) > -0.3;
      ctx.fillStyle = on ? '#3ddc84' : '#3a1414';
      ctx.fillRect(booth.x1 + 1.35, y + 0.15 + led * 0.2, 0.08, 0.08);
    }
  }
  ctx.fillStyle = '#3c4048';                                        // projector body
  ctx.fillRect(projector.x - 2.2, projector.y - 0.45, 1.6, 0.9);
  ctx.fillStyle = mission.power ? '#cfe8ff' : '#20242a';            // lens
  ctx.beginPath();
  ctx.arc(projector.x - 0.55, projector.y, 0.22, 0, Math.PI * 2);
  ctx.fill();
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

/** The main breaker panel: lever down and a blinking red lamp until Droid resets it. */
export function drawMainBreaker(ctx, level, mission, time) {
  const [x, y] = level.mission.mainBreaker;
  ctx.fillStyle = '#4a505a';
  ctx.fillRect(x - 0.7, y - 0.45, 1.4, 0.7);
  ctx.strokeStyle = '#2a2e35';
  ctx.lineWidth = 0.03;
  ctx.strokeRect(x - 0.7, y - 0.45, 1.4, 0.7);
  ctx.fillStyle = '#1f2227';                                        // lever slot
  ctx.fillRect(x - 0.08, y - 0.38, 0.16, 0.56);
  ctx.fillStyle = '#d8d2c4';                                        // lever handle
  ctx.fillRect(x - 0.14, mission.power ? y - 0.38 : y + 0.06, 0.28, 0.12);
  const lit = mission.power || Math.sin(time * 5) > 0;
  ctx.fillStyle = mission.power ? '#3ddc84' : (lit ? '#ff3b30' : '#5a1a18');
  ctx.beginPath();
  ctx.arc(x + 0.42, y - 0.2, 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9aa3b2';                                        // row of smaller breakers
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(x - 0.6 + i * 0.1, y - 0.3, 0.06, 0.18);
  }
}

/** The electrical room behind the fallen booth: switch cabinets, cable trays and a warning sign. */
export function drawElectricalRoom(ctx, level, mission, time) {
  const room = level.mission.electricalRoom;
  if (!room) {
    return;
  }
  const width = room.x2 - room.x1;
  ctx.fillStyle = '#2f343c';
  ctx.fillRect(room.x1, room.y1, width, room.y2 - room.y1);
  for (const x of [room.x1 + 0.15, room.x2 - 0.75]) {              // cabinets along both walls
    for (let y = room.y1 + 1.2; y < room.y2 - 0.9; y += 0.9) {
      ctx.fillStyle = '#5a616c';
      ctx.fillRect(x, y, 0.6, 0.8);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = 0.02;
      ctx.beginPath();
      for (let vent = 0.2; vent < 0.7; vent += 0.1) {
        ctx.moveTo(x + 0.1, y + vent);
        ctx.lineTo(x + 0.5, y + vent);
      }
      ctx.stroke();
      const on = mission.power ? Math.sin(time * 2 + y * 5) > -0.8 : Math.sin(time * 6 + y) > 0.6;
      ctx.fillStyle = mission.power ? (on ? '#3ddc84' : '#1c4a2c') : (on ? '#ff3b30' : '#3a1414');
      ctx.fillRect(x + 0.45, y + 0.08, 0.08, 0.08);
    }
  }
  ctx.strokeStyle = '#222';                                         // cable tray down the middle
  ctx.lineWidth = 0.12;
  ctx.beginPath();
  ctx.moveTo(room.x1 + width / 2, room.y1 + 0.9);
  ctx.lineTo(room.x1 + width / 2, room.y2 - 0.3);
  ctx.stroke();
  ctx.fillStyle = '#566077';                                        // door jambs, drawn over the room floor
  ctx.fillRect(room.x1, room.y2 - room.jambDepth, room.door.x1 - room.x1, room.jambDepth);
  ctx.fillRect(room.door.x2, room.y2 - room.jambDepth, room.x2 - room.door.x2, room.jambDepth);
  drawHazardStripe(ctx, room.door.x1, room.y2 - 0.15, room.door.x2, room.y2 - 0.15, 0.2);
  drawWarningSign(ctx, room.x1 - 0.5, room.y2 + 0.45);
}

function drawHazardStripe(ctx, x1, y1, x2, y2, width) {
  const length = Math.hypot(x2 - x1, y2 - y1);
  ctx.save();
  ctx.translate(x1, y1);
  ctx.rotate(Math.atan2(y2 - y1, x2 - x1));
  ctx.fillStyle = '#f2c14e';
  ctx.fillRect(0, -width / 2, length, width);
  ctx.fillStyle = '#1a1a1a';
  for (let s = 0; s < length; s += width * 2) {
    ctx.beginPath();
    ctx.moveTo(s, -width / 2);
    ctx.lineTo(s + width, -width / 2);
    ctx.lineTo(s + width * 0.5, width / 2);
    ctx.lineTo(s - width * 0.5, width / 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawWarningSign(ctx, x, y) {
  ctx.fillStyle = '#f2c14e';
  ctx.beginPath();
  ctx.moveTo(x, y - 0.3);
  ctx.lineTo(x + 0.3, y + 0.22);
  ctx.lineTo(x - 0.3, y + 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#1a1a1a';                                      // lightning bolt
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  ctx.moveTo(x + 0.04, y - 0.14);
  ctx.lineTo(x - 0.06, y + 0.04);
  ctx.lineTo(x + 0.05, y + 0.02);
  ctx.lineTo(x - 0.04, y + 0.17);
  ctx.stroke();
}

// Furniture seen from above. Text is drawn at 100× and scaled down: canvas fonts below 1 px do not
// draw.
const DEVOXX_ORANGE = '#ff8a1f';

const DECOR_DRAWERS = {
  booth: drawBooth,
  counter: drawCounter,
  beanbag: drawBeanbag,
  rollup: drawRollup,
  rug: drawRug,
  sofa: drawSofa,
  table: drawTable,
  plant: drawPlant,
  water: drawWaterStation,
  desk: drawSpeakerDesk,
  sign: drawSign,
};

/** Draws the furniture in list order, so rugs listed first end up underneath. */
export function drawDecor(ctx, level) {
  for (const item of level.decor) {
    DECOR_DRAWERS[item.type](ctx, item);
  }
}

function drawRug(ctx, rug) {
  const left = rug.x - rug.width / 2;
  const top = rug.y - rug.height / 2;
  ctx.fillStyle = rug.color;
  ctx.fillRect(left, top, rug.width, rug.height);
  ctx.strokeStyle = 'rgba(241, 228, 200, 0.35)';
  ctx.lineWidth = 0.08;
  ctx.strokeRect(left + 0.25, top + 0.25, rug.width - 0.5, rug.height - 0.5);
}

/** A sofa with its back against a wall on its east side and two seat cushions. */
function drawSofa(ctx, sofa) {
  const left = sofa.x - sofa.width / 2;
  const top = sofa.y - sofa.height / 2;
  ctx.fillStyle = sofa.color;
  ctx.fillRect(left, top, sofa.width, sofa.height);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(left + sofa.width - 0.3, top, 0.3, sofa.height);        // backrest
  ctx.fillRect(left, top, sofa.width, 0.25);                            // armrests
  ctx.fillRect(left, top + sofa.height - 0.25, sofa.width, 0.25);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  ctx.moveTo(left + 0.1, sofa.y);
  ctx.lineTo(left + sofa.width - 0.35, sofa.y);
  ctx.stroke();
}

function drawTable(ctx, table) {
  const radius = table.size === 'large' ? 0.75 : 0.45;
  ctx.fillStyle = '#6e5a46';
  ctx.beginPath();
  ctx.arc(table.x, table.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  ctx.arc(table.x, table.y, radius - 0.08, 0, Math.PI * 2);
  ctx.stroke();
  if (table.size !== 'large') {
    ctx.fillStyle = '#f1e4c8';                                          // two coffee cups
    for (const dy of [-0.15, 0.17]) {
      ctx.beginPath();
      ctx.arc(table.x + dy * 0.6, table.y + dy, 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPlant(ctx, plant) {
  ctx.fillStyle = '#5a4030';
  ctx.beginPath();
  ctx.arc(plant.x, plant.y, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3f7d4a';
  for (let leaf = 0; leaf < 7; leaf++) {
    const angle = leaf / 7 * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(plant.x + Math.cos(angle) * 0.25, plant.y + Math.sin(angle) * 0.25, 0.28, 0.1, angle, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#5fa36a';
  ctx.beginPath();
  ctx.arc(plant.x, plant.y, 0.15, 0, Math.PI * 2);
  ctx.fill();
}

function drawWaterStation(ctx, station) {
  ctx.fillStyle = '#d8dde4';
  ctx.fillRect(station.x - 0.35, station.y - 0.35, 0.7, 0.7);
  ctx.fillStyle = '#5ac8ff';
  ctx.beginPath();
  ctx.arc(station.x, station.y, 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.beginPath();
  ctx.arc(station.x - 0.07, station.y - 0.07, 0.07, 0, Math.PI * 2);
  ctx.fill();
}

/** The speaker-ready desk: a monitor for checking slides and laptops charging. */
function drawSpeakerDesk(ctx, desk) {
  const left = desk.x - desk.width / 2;
  const top = desk.y - desk.height / 2;
  ctx.fillStyle = '#e6e1d6';
  ctx.fillRect(left, top, desk.width, desk.height);
  ctx.fillStyle = '#1c1f24';
  ctx.fillRect(left + desk.width - 0.2, desk.y - 0.5, 0.1, 1);          // monitor, facing west
  ctx.fillStyle = '#5a6272';
  for (const dy of [-0.9, 0.7]) {                                       // laptops
    ctx.fillRect(left + 0.15, desk.y + dy, 0.35, 0.3);
  }
  ctx.strokeStyle = '#1c1f24';                                          // charging cables
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  ctx.moveTo(left + 0.5, desk.y - 0.75);
  ctx.lineTo(left + desk.width - 0.2, desk.y - 0.3);
  ctx.moveTo(left + 0.5, desk.y + 0.85);
  ctx.lineTo(left + desk.width - 0.2, desk.y + 0.3);
  ctx.stroke();
}

function drawSign(ctx, sign) {
  ctx.fillStyle = '#20232a';
  ctx.fillRect(sign.x - 0.9, sign.y - 0.22, 1.8, 0.44);
  ctx.fillStyle = DEVOXX_ORANGE;
  ctx.fillRect(sign.x - 0.85, sign.y - 0.17, 1.7, 0.34);
  drawText(ctx, sign.name, sign.x, sign.y + 0.01, 0.22, '#15171c', 1.6);
}

function drawBooth(ctx, booth) {
  const left = booth.x - booth.width / 2;
  const top = booth.y - booth.height / 2;
  ctx.fillStyle = '#2d323c';
  ctx.fillRect(left, top, booth.width, booth.height);
  ctx.fillStyle = booth.color;
  ctx.fillRect(left, top, booth.width, 0.45);                           // back wall with the logo
  ctx.fillStyle = '#4a505c';
  ctx.fillRect(left + 0.3, top + booth.height - 0.65, booth.width - 0.6, 0.45); // counter
  ctx.fillStyle = '#aab3c2';
  ctx.fillRect(booth.x - 0.8, top + booth.height - 0.58, 0.4, 0.3);      // laptops
  ctx.fillRect(booth.x + 0.4, top + booth.height - 0.58, 0.4, 0.3);
  ctx.fillStyle = booth.color;
  for (let i = 0; i < 4; i++) {                                          // swag on the counter
    ctx.beginPath();
    ctx.arc(booth.x - 0.1 + i * 0.12, top + booth.height - 0.42, 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
  drawText(ctx, booth.name, booth.x, top + 0.24, 0.3, '#15171c', booth.width - 0.2);
}

function drawCounter(ctx, counter) {
  const left = counter.x - counter.width / 2;
  const top = counter.y - counter.height / 2;
  ctx.fillStyle = '#5a4030';
  ctx.fillRect(left, top, counter.width, counter.height);
  ctx.fillStyle = '#7a5a42';
  ctx.fillRect(left, top + counter.height - 0.4, counter.width, 0.4);
  ctx.fillStyle = '#f1e4c8';
  for (let i = 0; i < 6; i++) {                                          // cups waiting in a row
    ctx.beginPath();
    ctx.arc(left + 1 + i * 0.5, top + counter.height - 0.2, 0.09, 0, Math.PI * 2);
    ctx.fill();
  }
  drawText(ctx, counter.name, counter.x, top + 0.55, 0.45, '#f1e4c8', counter.width);
}

function drawBeanbag(ctx, beanbag) {
  ctx.fillStyle = beanbag.color;
  ctx.beginPath();
  ctx.ellipse(beanbag.x, beanbag.y, 0.55, 0.48, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.beginPath();
  ctx.ellipse(beanbag.x - 0.12, beanbag.y - 0.1, 0.25, 0.2, 0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawRollup(ctx, rollup) {
  ctx.fillStyle = '#20232a';
  ctx.fillRect(rollup.x - 0.5, rollup.y - 0.12, 1, 0.24);
  ctx.fillStyle = DEVOXX_ORANGE;
  ctx.fillRect(rollup.x - 0.45, rollup.y - 0.06, 0.9, 0.12);
}

function drawText(ctx, text, x, y, size, color, maxWidth) {
  ctx.save();
  ctx.scale(0.01, 0.01);
  ctx.font = `bold ${size * 100}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x * 100, y * 100, maxWidth * 100);
  ctx.restore();
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

const DOOR_THICKNESS = 0.24;

/** The Room 8 service door: a steel panel sliding into the wall, a frame, and a keypad beside it. */
export function drawDoor(ctx, level, mission, time) {
  const door = level.mission.room8Door;
  const closedLength = door.y2 - door.y1;
  const visibleLength = closedLength * (1 - mission.doorOpenAmount);

  ctx.fillStyle = '#6b7385';                                       // frame posts
  ctx.fillRect(door.x1 - 0.2, door.y1 - 0.12, 0.4, 0.24);
  ctx.fillRect(door.x1 - 0.2, door.y2 - 0.12, 0.4, 0.24);

  if (visibleLength > 0.01) {
    ctx.fillStyle = mission.power ? '#8c7a4e' : '#4f4632';
    ctx.fillRect(door.x1 - DOOR_THICKNESS / 2, door.y1, DOOR_THICKNESS, visibleLength);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    for (let y = door.y1 + 0.5; y < door.y1 + visibleLength; y += 0.5) {  // ribbed steel
      ctx.moveTo(door.x1 - DOOR_THICKNESS / 2, y);
      ctx.lineTo(door.x1 + DOOR_THICKNESS / 2, y);
    }
    ctx.stroke();
    ctx.fillStyle = '#d8d2c4';                                     // handle
    ctx.fillRect(door.x1 - DOOR_THICKNESS / 2 - 0.05, door.y1 + visibleLength - 0.5, 0.05, 0.3);
  }

  // keypad on the corridor side: dead without power, blinking amber until opened, then green
  const blink = Math.sin(time * 4) > 0;
  ctx.fillStyle = '#1b1d22';
  ctx.fillRect(door.x1 - 0.45, door.y1 - 0.75, 0.25, 0.4);
  ctx.fillStyle = !mission.power ? '#2e1a1a' : (mission.doorOpen ? '#3ddc84' : (blink ? '#ffb347' : '#5a3d10'));
  ctx.fillRect(door.x1 - 0.41, door.y1 - 0.7, 0.17, 0.08);
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

const BAY_RESULT_SHOWN = 4;        // s the console shows a self-test result
const BAY_COLORS = { idle: '#e0b43a', running: '#5ac8ff', found: '#3ddc84', missed: '#ff5a4f' };

/**
 * Droid's old maintenance bay: a steel pad inside a hazard ring, four status lamps, a scanner arm
 * that sweeps during a self-test, a console that shows the result, and a tool chest.
 */
export function drawMaintenanceBay(ctx, level, bug, time) {
  const bay = level.mission.maintenanceBay;
  const result = bug.lastResult && bug.lastResult.age < BAY_RESULT_SHOWN ? bug.lastResult : null;
  const status = bug.diagnostic ? 'running' : result ? (result.found ? 'found' : 'missed') : 'idle';
  const statusColor = BAY_COLORS[status];

  drawToolChest(ctx, bay.x - bay.radius - 0.7, bay.y + 0.4);
  const terminal = { x: bay.x + bay.radius + 0.7, y: bay.y - 0.3 };
  ctx.strokeStyle = '#15171b';                                        // cable from console to pad
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.moveTo(terminal.x - 0.3, terminal.y + 0.3);
  ctx.quadraticCurveTo(bay.x + bay.radius + 0.2, bay.y + 0.6, bay.x + bay.radius - 0.1, bay.y + 0.4);
  ctx.stroke();
  drawBayConsole(ctx, terminal, status, statusColor, bug, time);

  const pad = ctx.createRadialGradient(bay.x - 0.3, bay.y - 0.3, 0.1, bay.x, bay.y, bay.radius);
  pad.addColorStop(0, '#4a525e');
  pad.addColorStop(1, '#2a2f37');
  ctx.fillStyle = pad;
  ctx.beginPath();
  ctx.arc(bay.x, bay.y, bay.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 0.03;
  for (const ring of [0.35, 0.65, 0.9]) {
    ctx.beginPath();
    ctx.arc(bay.x, bay.y, bay.radius * ring, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();                                                    // centring cross
  ctx.moveTo(bay.x - 0.3, bay.y);
  ctx.lineTo(bay.x + 0.3, bay.y);
  ctx.moveTo(bay.x, bay.y - 0.3);
  ctx.lineTo(bay.x, bay.y + 0.3);
  ctx.stroke();

  if (bug.diagnostic) {                                               // scanner sweep
    const angle = time * 4;
    ctx.fillStyle = 'rgba(90, 200, 255, 0.18)';
    ctx.beginPath();
    ctx.moveTo(bay.x, bay.y);
    ctx.arc(bay.x, bay.y, bay.radius - 0.1, angle - 0.5, angle);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#5ac8ff';
    ctx.lineWidth = 0.06;
    ctx.beginPath();
    ctx.moveTo(bay.x, bay.y);
    ctx.lineTo(bay.x + Math.cos(angle) * (bay.radius - 0.1), bay.y + Math.sin(angle) * (bay.radius - 0.1));
    ctx.stroke();
  }

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

  const lampOn = status === 'idle' || Math.sin(time * 8) > -0.2;
  for (let lamp = 0; lamp < 4; lamp++) {                              // status lamps on the ring
    const angle = Math.PI / 4 + lamp * Math.PI / 2;
    ctx.fillStyle = '#15171b';
    ctx.beginPath();
    ctx.arc(bay.x + Math.cos(angle) * (bay.radius + 0.18), bay.y + Math.sin(angle) * (bay.radius + 0.18), 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = lampOn ? statusColor : '#2a2d33';
    ctx.beginPath();
    ctx.arc(bay.x + Math.cos(angle) * (bay.radius + 0.18), bay.y + Math.sin(angle) * (bay.radius + 0.18), 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBayConsole(ctx, terminal, status, color, bug, time) {
  ctx.fillStyle = '#2b2f36';
  ctx.fillRect(terminal.x - 0.35, terminal.y - 0.55, 0.7, 1.1);
  ctx.fillStyle = '#0d1a22';
  ctx.fillRect(terminal.x - 0.28, terminal.y - 0.48, 0.56, 0.6);          // screen
  const text = {
    idle: bug.patched ? 'CLEAN' : 'READY',
    running: 'SCAN',
    found: 'FIXED',
    missed: 'NO FAULT',
  }[status];
  drawText(ctx, text, terminal.x, terminal.y - 0.3, 0.14, bug.patched && status === 'idle' ? BAY_COLORS.found : color, 0.5);
  if (status === 'running') {                                           // progress bar
    const progress = 1 - bug.diagnostic.remaining / DIAGNOSTIC_DURATION;
    ctx.fillStyle = color;
    ctx.fillRect(terminal.x - 0.22, terminal.y - 0.08, 0.44 * progress, 0.06);
  }
  ctx.fillStyle = '#4a505a';                                            // keys
  for (let key = 0; key < 6; key++) {
    ctx.fillRect(terminal.x - 0.26 + (key % 3) * 0.19, terminal.y + 0.2 + Math.floor(key / 3) * 0.14, 0.14, 0.09);
  }
  ctx.fillStyle = Math.sin(time * 2) > 0 ? '#3ddc84' : '#1c4a2c';      // power LED
  ctx.fillRect(terminal.x + 0.22, terminal.y + 0.44, 0.06, 0.06);
}

function drawToolChest(ctx, x, y) {
  ctx.fillStyle = '#a8322b';
  ctx.fillRect(x - 0.35, y - 0.5, 0.7, 1);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  for (let drawer = 1; drawer < 4; drawer++) {
    ctx.moveTo(x - 0.35, y - 0.5 + drawer * 0.25);
    ctx.lineTo(x + 0.35, y - 0.5 + drawer * 0.25);
  }
  ctx.stroke();
  ctx.fillStyle = '#d8d2c4';
  for (let drawer = 0; drawer < 4; drawer++) {
    ctx.fillRect(x + 0.2, y - 0.4 + drawer * 0.25, 0.06, 0.06);
  }
  ctx.strokeStyle = '#c0c6cf';                                          // a spanner left on top
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  ctx.moveTo(x - 0.2, y + 0.1);
  ctx.lineTo(x + 0.05, y - 0.2);
  ctx.stroke();
}

const STAIR_TREADS = 5;
const LIFT_DOOR_GAP = 0.9;   // m the doors open to

/** Stairs as treads, the service lift as a cabin with doors; each labelled by the level's text labels. */
export function drawTravelPoints(ctx, level, state) {
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
        drawLift(ctx, end, state);
      }
    }
  }
}

/**
 * One end of the service lift, seen from above: the cabin, two sliding doors on the side facing the
 * exit, a hazard-striped threshold and a call lamp — red without power, amber while riding, green.
 */
function drawLift(ctx, end, state) {
  const size = end.radius;
  const riding = state.travel.rides.length > 0;
  const power = state.mission.power;
  const dx = end.exit.x - end.x;
  const dy = end.exit.y - end.y;
  const horizontal = Math.abs(dx) > Math.abs(dy);
  const side = horizontal ? Math.sign(dx) : Math.sign(dy);

  ctx.save();
  ctx.translate(end.x, end.y);
  if (!horizontal) {
    ctx.rotate(Math.PI / 2);   // draw as if the doors face ±x
  }
  ctx.scale(side, 1);          // …and +x
  ctx.fillStyle = '#23272e';
  ctx.fillRect(-size, -size, size * 2, size * 2);
  ctx.fillStyle = '#3a414c';   // cabin floor with a checker plate pattern
  ctx.fillRect(-size + 0.15, -size + 0.15, size * 2 - 0.3, size * 2 - 0.3);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  for (let t = -size; t < size; t += 0.35) {
    ctx.moveTo(t, -size + 0.15);
    ctx.lineTo(t + 0.3, size - 0.15);
  }
  ctx.stroke();

  const open = power && !riding ? LIFT_DOOR_GAP / 2 : 0;
  ctx.fillStyle = '#9aa6b5';   // two sliding door panels
  ctx.fillRect(size - 0.12, -size + 0.1, 0.12, size - 0.1 - open);
  ctx.fillRect(size - 0.12, open, 0.12, size - 0.1 - open);
  drawHazardStripe(ctx, size + 0.12, -size, size + 0.12, size, 0.16);

  const blink = Math.sin(state.time * 6) > 0;
  ctx.fillStyle = !power ? '#5a1a18' : (riding ? (blink ? '#ffb347' : '#5a3d10') : '#3ddc84');
  ctx.beginPath();
  ctx.arc(size + 0.35, -size - 0.1, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
