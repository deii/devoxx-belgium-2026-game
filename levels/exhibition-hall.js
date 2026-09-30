// Kinepolis Antwerp, ground floor — the exhibition hall ("Hollywood", 2 411 m²), traced by hand over
// assets/exhibition-hall-plan.png. The coordinates below were read off a view of the plan scaled to
// 1396 px wide; v() converts them back to plan pixels. The plan is "no scale"; 4.15 cm per pixel
// makes the hall 2 400 m² and the pillar grid 6.5 m, the same spacing as upstairs.
//
// In the game world the hall sits 150 m east of the cinema floor, far outside the camera's view;
// the stairs and the service lift move robots between the two.

const VIEW_TO_PLAN = 1562 / 1396;
const v = value => value * VIEW_TO_PLAN;
const point = ([x, y]) => [v(x), v(y)];
const rect = (x1, y1, x2, y2) => [[x1, y1], [x2, y1], [x2, y2], [x1, y2]].map(point);

const ELECTRICAL_ROOM = { x1: 722, x2: 790, y1: 95, y2: 205 };
const PILLAR_HALF_SIZE = 7;
// The plan also has a pillar at (725, 280), right in front of the electrical room; it is left out
// so Biggy has room to shove the booth clear.
const PILLARS = [
  [308, 280], [447, 280], [587, 280], [865, 280], [1005, 280],
  [308, 490], [587, 490], [725, 490], [1005, 490],
  [308, 628], [1005, 628],
  [308, 768], [447, 768], [587, 768], [725, 768], [865, 768], [1005, 768],
  [308, 907], [447, 907], [865, 907], [1005, 907], [1143, 907],
  [308, 1047], [447, 1047], [587, 1047], [725, 1047], [865, 1047], [1005, 1047], [1143, 1047],
  [447, 1186], [865, 1186], [1005, 1186], [1143, 1186],
];

export default {
  name: 'Kinepolis Antwerp — exhibition hall',
  plan: { src: 'assets/exhibition-hall-plan.png', metresPerPx: 0.0415 },
  offset: { x: 150, y: 0 },

  outline: [
    [170, 205], [ELECTRICAL_ROOM.x1, 205], [ELECTRICAL_ROOM.x1, ELECTRICAL_ROOM.y1],
    [ELECTRICAL_ROOM.x2, ELECTRICAL_ROOM.y1], [ELECTRICAL_ROOM.x2, 205], [1140, 205],
    [1140, 768], [1283, 768], [1283, 1400], [383, 1400], [383, 1325], [318, 1325],
    // the curved corner by the west doors
    [260, 1302], [215, 1265], [185, 1225], [170, 1185], [170, 205],
  ].map(point),

  walls: [],
  barriers: [],
  seatRows: [],

  blocks: [
    rect(450, 340, 517, 630),    // west staircase up to the cinema floor
    rect(785, 340, 862, 630),    // east staircase
    rect(1185, 768, 1283, 1065), // stock bar
    rect(408, 1295, 930, 1400),  // tiered steps down to the reception
    ...PILLARS.map(([x, y]) => rect(x - PILLAR_HALF_SIZE, y - PILLAR_HALF_SIZE, x + PILLAR_HALF_SIZE, y + PILLAR_HALF_SIZE)),
  ],

  // Where robots change floors. Ends with the same link id are connected; exit is where a robot
  // arriving at this end is placed (outside the zone, so it does not travel straight back).
  travel: [
    { link: 'stairs-west', ...zone(483, 662, 26), exit: point([483, 710]), label: 'Stairs up to the cinema floor' },
    { link: 'stairs-east', ...zone(823, 662, 26), exit: point([823, 710]), label: 'Stairs up to the cinema floor' },
    { link: 'service-lift', ...zone(205, 300, 30), exit: point([265, 330]), label: 'Service lift up to the cinema floor' },
  ],

  mission: {
    // A sponsor booth has toppled in front of the electrical room. Only Biggy can move it.
    // Sits fully in the hall (not in the doorway), so a push along the wall slides it clear.
    booth: point([756, 237]),
    electricalDoor: point([756, 205]),
    mainBreaker: point([756, 112]),
  },

  lighting: {
    daylight: [],
    exitSigns: [[172, 560], [1138, 560], [700, 1392], [1138, 230]].map(point),
    emergencyLights: [[480, 780], [900, 780], [640, 420], [250, 320], [756, 300], [650, 830]].map(point),
    ceilingLamps: [240, 520, 800, 1080].flatMap(x => [300, 560, 820, 1080].map(y => point([x, y]))),
  },

  // The robots spent the night parked in the middle of the hall.
  spawns: {
    voxxy: { ...labelAt(560, 860), heading: -Math.PI / 2 },
    droid: { ...labelAt(640, 860), heading: -Math.PI / 2 },
    biggy: { ...labelAt(740, 870), heading: -Math.PI / 2 },
  },

  labels: [
    { text: 'EXHIBITION HALL', ...labelAt(650, 920) },
    { text: 'ELECTRICAL ROOM', ...labelAt(756, 150) },
    { text: 'STAIRS ↑', ...labelAt(483, 700) },
    { text: 'STAIRS ↑', ...labelAt(823, 700) },
    { text: 'SERVICE LIFT', ...labelAt(215, 255) },
    { text: 'STOCK BAR', ...labelAt(1234, 915) },
  ],
};

function zone(x, y, radius) {
  return { x: v(x), y: v(y), radius: v(radius) };
}

function labelAt(x, y) {
  return { x: v(x), y: v(y) };
}
