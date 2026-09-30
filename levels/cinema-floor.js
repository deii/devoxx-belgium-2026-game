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
const PILLAR_FIRST_Y = 420;
const PILLAR_LAST_Y = 1120;
const PILLAR_SPACING = 65;
const PILLAR_HALF_SIZE = 3;
const TOILET_BLOCK = { x1: 660, y1: 378, x2: 720, y2: 610 };

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

  // Solid obstacles (closed polygons).
  blocks: [
    rect(510, 345, CORRIDOR_WEST, 470),                   // Room 1
    rect(510, 470, CORRIDOR_WEST, 515),                   // stairs between Room 1 and 2
    rect(510, 515, CORRIDOR_WEST, 640),                   // Room 2
    rect(TOILET_BLOCK.x1, TOILET_BLOCK.y1, TOILET_BLOCK.x2, TOILET_BLOCK.y2), // toilets
    [[485, 300], [600, 270], [655, 325], [660, 345], [490, 345]],               // concession B1
    [[620, 195], [645, 190], [668, 330], [648, 335]],                           // wall of fame
    [[705, 265], [770, 225], [805, 250], [805, 345], [770, 395], [730, 380], [705, 330]], // Megacandy
    rect(CORRIDOR_EAST, 1000, 858, ROOM8_DOOR_TOP),       // Room 8 projection booth
    ...pillars(),
  ],

  // Non-solid areas with a gameplay meaning (used from milestone 3 on).
  zones: [
    { id: 'grand-staircase', label: 'Grand staircase', x1: 710, y1: 1230, x2: 830, y2: 1295 },
  ],

  labels: [
    { text: 'FOYER', x: 560, y: 150 },
    { text: 'MEGACANDY', x: 755, y: 310 },
    { text: 'ROOM 1', x: 585, y: 408 },
    { text: 'ROOM 2', x: 585, y: 578 },
    { text: 'ROOM 3', x: 560, y: 715 },
    { text: 'ROOM 4', x: 535, y: 875 },
    { text: 'ROOM 5', x: 510, y: 1075 },
    { text: 'ROOM 6', x: 535, y: 1290 },
    { text: 'ROOM 7', x: 980, y: 1290 },
    { text: 'ROOM 8 · KEYNOTE', x: 975, y: 1075 },
    { text: 'ROOM 9', x: 930, y: 875 },
    { text: 'ROOM 10', x: 905, y: 715 },
    { text: 'ROOM 11', x: 880, y: 578 },
    { text: 'ROOM 12', x: 880, y: 408 },
    { text: 'ROOM 13', x: 900, y: 270 },
    { text: 'ROOM 14', x: 880, y: 130 },
    { text: 'GRAND STAIRCASE', x: 770, y: 1262 },
  ],

  spawns: {
    voxxy: { x: 600, y: 190, heading: Math.PI / 2 },
    droid: { x: 545, y: 230, heading: Math.PI / 2 },
    biggy: { x: 690, y: 170, heading: Math.PI / 2 },
  },
};
