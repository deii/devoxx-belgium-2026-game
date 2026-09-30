// Kinepolis Antwerp, first (cinema) floor — traced by hand over assets/cinema-floor-plan.png.
// All coordinates are in plan pixels; level.js converts them to metres (1 px ≈ 10 cm).
// Only the parts the mission uses are walkable: foyer, central corridor, the lobby above the
// grand staircase and Room 8 (the keynote room). Every other auditorium is a solid block.

const CORRIDOR_WEST = 660;
const CORRIDOR_EAST = 805;
const ROOM8_DOOR_TOP = 1150;
const ROOM8_SOUTH = 1190;

// Pillars along the corridor, two rows (see the small squares on the plan).
const PILLAR_ROWS_X = [710, 757];
const PILLAR_FIRST_Y = 550;   // the first rows are left out: the crates stand there
const PILLAR_LAST_Y = 1120;
const PILLAR_SPACING = 65;
const PILLAR_HALF_SIZE = 3;
const TOILET_BLOCK = { x1: 660, y1: 378, x2: 720, y2: 610 };
const COFFEE_BAR = { x1: 500, y1: 63, x2: 570, y2: 80 };   // against the north windows of the foyer

// Room 8 seat rows, parallel to the screen. They fan out towards the back of the room, leaving
// side aisles that are wider at the back and still wide enough for Biggy at the front.
const ROOM8_SCREEN_X = 1095;
const SEAT_ROW_FIRST_X = 880;
const SEAT_ROW_LAST_X = 1035;
const SEAT_ROW_SPACING = 11;
const SEAT_ROW_AISLE = 22;          // minimum side aisle at the front
const SEAT_ROW_FAN = 35;            // extra aisle width at the back of the room

function seatRows() {
  const rows = [];
  for (let x = SEAT_ROW_FIRST_X; x <= SEAT_ROW_LAST_X; x += SEAT_ROW_SPACING) {
    const fan = SEAT_ROW_FAN * (ROOM8_SCREEN_X - x) / (ROOM8_SCREEN_X - CORRIDOR_EAST);
    rows.push([[x, 960 + SEAT_ROW_AISLE + fan], [x + 4, ROOM8_SOUTH - SEAT_ROW_AISLE - fan]]);
  }
  return rows;
}

function rect(x1, y1, x2, y2) {
  return [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
}

function pillars() {
  const result = [];
  for (const x of PILLAR_ROWS_X) {
    for (let y = PILLAR_FIRST_Y; y <= PILLAR_LAST_Y; y += PILLAR_SPACING) {
      const insideToilets = x > TOILET_BLOCK.x1 && x < TOILET_BLOCK.x2
        && y > TOILET_BLOCK.y1 && y < TOILET_BLOCK.y2;
      if (!insideToilets) {
        result.push(rect(x - PILLAR_HALF_SIZE, y - PILLAR_HALF_SIZE, x + PILLAR_HALF_SIZE, y + PILLAR_HALF_SIZE));
      }
    }
  }
  return result;
}

export default {
  name: 'Kinepolis Antwerp — cinema floor',
  plan: { src: 'assets/cinema-floor-plan.png', metresPerPx: 0.1 },
  offset: { x: 0, y: 0 },

  // Outer boundary of the walkable area (open polyline; the gap is the Room 8 door).
  outline: [
    [CORRIDOR_EAST, ROOM8_DOOR_TOP], [CORRIDOR_EAST, 60], [430, 60], [300, 165],
    // glass facade of the foyer
    [345, 215], [390, 270], [425, 330], [448, 395], [460, 460], [462, 530], [455, 600], [460, 640],
    [CORRIDOR_WEST, 640], [CORRIDOR_WEST, 1390],
    // lobby above the grand staircase
    [855, 1390], [855, ROOM8_SOUTH],
    // Room 8
    [1105, ROOM8_SOUTH], [1105, 960], [CORRIDOR_EAST, 960],
  ],

  // Extra wall pieces that are not part of the outline.
  walls: [
    [[CORRIDOR_EAST, ROOM8_SOUTH], [855, ROOM8_SOUTH]],
  ],

  // Queue barriers across the speakers' lounge. The gap is 1.25 m: wide enough for Voxxy
  // (0.8 m + wall clearance), too narrow for Droid and Biggy.
  barriers: [
    [[440, 370], [468.75, 370]],
    [[481.25, 370], [510, 370]],
  ],

  seatRows: seatRows(),

  // Everything the mission needs, in plan pixels.
  mission: {
    // A wall of sponsor crates across the corridor, cutting it off from the foyer and the speakers'
    // lounge. The gaps between crates (0.2 m) are too narrow even for Voxxy. Biggy arrives by the
    // service lift and has the whole corridor as a run-up. The bottleneck band hugs the crate row,
    // so a crate shoved north into the pocket under Megacandy no longer counts as blocking.
    crates: [[732.5, 455], [752.5, 455], [772.5, 455], [792.5, 455]],
    bottleneck: { x1: 720, y1: 445, x2: CORRIDOR_EAST, y2: 465 },
    adapter: { x: 485, y: 560 },
    room8Door: { x1: CORRIDOR_EAST, y1: ROOM8_DOOR_TOP, x2: CORRIDOR_EAST, y2: ROOM8_SOUTH },
    room8: { x1: CORRIDOR_EAST, y1: 960, x2: 1105, y2: ROOM8_SOUTH },
    screen: { x: 1095, y1: 985, y2: 1165 },
    stage: { x: 1070, y: 1075, radius: 25 },
    projectionBooth: { x1: CORRIDOR_EAST, y1: 1000, x2: 858, y2: ROOM8_DOOR_TOP },
    // Easter egg: an R.U.R. poster hanging on the west face of the wall of fame.
    rurPoster: { x: 627, y: 262 },
  },

  // Light sources. Daylight and exit signs work without power; ceiling lamps need the main breaker.
  lighting: {
    daylight: [
      [335, 195], [380, 250], [420, 315], [440, 380], [452, 450], [452, 520], [448, 590], // glass facade
      [500, 95], [620, 95], [740, 95],                                                     // north windows
      [560, 190], [690, 180], [600, 265],                                                  // foyer skylights
    ],
    exitSigns: [[668, 700], [798, 640], [668, 1100], [798, 900], [848, 1380], [1098, 1180]],
    emergencyLights: [[733, 560], [733, 760], [733, 960], [780, 1165], [733, 1330]],
    ceilingLamps: [
      [733, 430], [733, 495], [733, 560], [733, 625], [733, 690], [733, 755], [733, 820], [733, 885],
      [733, 950], [733, 1015], [733, 1080], [733, 1145], [760, 1250], [760, 1340], [580, 120], [700, 130],
    ],
    projector: { x: 862, y: 1075 },
  },

  // Where people lurk (see src/people.js): one role per person, each wandering inside its area.
  people: [
    { x1: 480, y1: 95, x2: 640, y2: 185, roles: ['attendee', 'attendee', 'attendee', 'attendee', 'crew'] }, // foyer
    { x1: 470, y1: 395, x2: 500, y2: 610, roles: ['speaker'] },                                         // lounge
    { x1: 672, y1: 640, x2: 795, y2: 1120, roles: ['attendee', 'attendee', 'crew'] },                    // corridor
    { x1: 670, y1: 1200, x2: 845, y2: 1380, roles: ['attendee', 'attendee'] },                           // lobby
    { x1: 1048, y1: 1000, x2: 1085, y2: 1150, roles: ['crew'] },                                         // AV tech on stage
  ],

  // Furniture that is only drawn; solid pieces are also listed in blocks.
  decor: [
    { type: 'counter', x: (COFFEE_BAR.x1 + COFFEE_BAR.x2) / 2, y: (COFFEE_BAR.y1 + COFFEE_BAR.y2) / 2,
      width: COFFEE_BAR.x2 - COFFEE_BAR.x1, height: COFFEE_BAR.y2 - COFFEE_BAR.y1, name: 'COFFEE' },
    { type: 'beanbag', x: 445, y: 150, color: '#e8744f' },
    { type: 'beanbag', x: 468, y: 138, color: '#4fa3e8' },
    { type: 'beanbag', x: 458, y: 172, color: '#f2c14e' },
    { type: 'rollup', x: 640, y: 68 },
    { type: 'rollup', x: 770, y: 68 },
    { type: 'rollup', x: 790, y: 590 },
    // the speakers' lounge, behind the queue barriers: nothing in it is solid, so Voxxy's way to the
    // adapter stays exactly as it was
    { type: 'rug', x: 487, y: 530, width: 36, height: 150, color: '#2f5d62' },
    { type: 'sign', x: 452, y: 358, name: 'SPEAKERS ONLY' },
    { type: 'plant', x: 470, y: 385 },
    { type: 'plant', x: 502, y: 385 },
    { type: 'water', x: 472, y: 440 },
    { type: 'sofa', x: 502, y: 425, width: 10, height: 38, color: '#6b3fa0' },
    { type: 'table', x: 488, y: 425 },
    { type: 'sofa', x: 502, y: 500, width: 10, height: 38, color: '#6b3fa0' },
    { type: 'table', x: 488, y: 500 },
    { type: 'table', x: 485, y: 560, size: 'large' },                 // the adapter lies on this one
    { type: 'desk', x: 500, y: 605, width: 12, height: 26 },          // speaker-ready desk
    { type: 'plant', x: 470, y: 628 },
  ],

  // Solid obstacles (closed polygons).
  blocks: [
    rect(510, 345, CORRIDOR_WEST, 470),                   // Room 1
    rect(510, 470, CORRIDOR_WEST, 515),                   // stairs between Room 1 and 2
    rect(510, 515, CORRIDOR_WEST, 640),                   // Room 2
    rect(TOILET_BLOCK.x1, TOILET_BLOCK.y1, TOILET_BLOCK.x2, TOILET_BLOCK.y2), // toilets
    [[485, 300], [600, 270], [655, 325], [660, 345], [490, 345]],               // concession B1
    [[620, 195], [645, 190], [668, 330], [648, 335]],                           // wall of fame
    [[705, 265], [770, 225], [805, 250], [805, 345], [785, 375], [755, 370], [720, 330]], // Megacandy
    rect(CORRIDOR_EAST, 1000, 858, ROOM8_DOOR_TOP),       // Room 8 projection booth
    rect(COFFEE_BAR.x1, COFFEE_BAR.y1, COFFEE_BAR.x2, COFFEE_BAR.y2), // coffee bar
    ...pillars(),
  ],

  // Where robots change floors — the "Ground floor" stairs by Rooms 4 and 9, and the service lift
  // by Room 10. Ends with the same link id (see exhibition-hall.js) are connected.
  travel: [
    { link: 'stairs-west', x: 672, y: 878, radius: 12, exit: [688, 905], label: 'Stairs down to the exhibition hall' },
    { link: 'stairs-east', x: 793, y: 878, radius: 12, exit: [778, 905], label: 'Stairs down to the exhibition hall' },
    { link: 'service-lift', x: 792, y: 740, radius: 14, exit: [770, 720], label: 'Service lift down to the exhibition hall' },
  ],

  // Non-solid areas with a gameplay meaning (used from milestone 3 on).
  zones: [
    { id: 'grand-staircase', label: 'Grand staircase', x1: 710, y1: 1230, x2: 830, y2: 1295 },
  ],

  labels: [
    { text: 'FOYER', x: 560, y: 150 },
    { text: "SPEAKERS' LOUNGE", x: 485, y: 470 },
    { text: 'STAIRS ↓', x: 675, y: 855 },
    { text: 'STAIRS ↓', x: 790, y: 855 },
    { text: 'SERVICE LIFT', x: 772, y: 718 },
    { text: 'MEGACANDY', x: 755, y: 310 },
    { text: 'ROOM 1', x: 585, y: 408 },
    { text: 'ROOM 2', x: 585, y: 578 },
    { text: 'ROOM 3', x: 560, y: 715 },
    { text: 'ROOM 4', x: 535, y: 875 },
    { text: 'ROOM 5', x: 510, y: 1075 },
    { text: 'ROOM 6', x: 535, y: 1290 },
    { text: 'ROOM 7', x: 980, y: 1290 },
    { text: 'ROOM 8 · KEYNOTE', x: 955, y: 978 },
    { text: 'ROOM 9', x: 930, y: 875 },
    { text: 'ROOM 10', x: 905, y: 715 },
    { text: 'ROOM 11', x: 880, y: 578 },
    { text: 'ROOM 12', x: 880, y: 408 },
    { text: 'ROOM 13', x: 900, y: 270 },
    { text: 'ROOM 14', x: 880, y: 130 },
    { text: 'GRAND STAIRCASE', x: 770, y: 1262 },
  ],

};
