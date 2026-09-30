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
// The door is 2 m wide: enough for Droid (1 m), too narrow for the toppled booth (2.6 m), so ramming
// the booth head-on cannot wedge it into the room and cut Droid off from the breaker.
const ELECTRICAL_DOOR = { x1: 735, x2: 778 };
const DOOR_JAMB_DEPTH = 7;
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

// Sponsor booths, 3 m × 2 m, between the pillars and away from the robots' routes to the stairs,
// the lift and the electrical room. The sponsors are made up.
const BOOTH_HALF = { width: 32, height: 22 };
const BOOTH_COLORS = ['#e8744f', '#4fa3e8', '#8bc34a', '#b07be8', '#f2c14e', '#4ec9b0'];
const BOOTHS = [
  [935, 420, 'Bean Factory'], [1074, 420, 'Lambda Lounge'],
  [935, 560, 'Byte Bakery'], [1074, 560, 'Heap & Co.'],
  [377, 700, 'Thread Pool'], [377, 837, 'Monad Mart'],
  [935, 837, 'Refactor Studio'], [377, 977, 'NullPointer Labs'],
  [935, 977, 'Compile Time'], [1074, 977, 'Garbage Collectors'],
  [377, 1116, 'Deadlock Consulting'], [517, 1116, 'Race Condition'],
  [795, 1116, 'Mutable State'], [935, 1116, 'Cache Me If You Can'],
  [1074, 1116, 'Stack Smashers'],
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
    rect(ELECTRICAL_ROOM.x1, ELECTRICAL_ROOM.y2 - DOOR_JAMB_DEPTH, ELECTRICAL_DOOR.x1, ELECTRICAL_ROOM.y2), // door jambs
    rect(ELECTRICAL_DOOR.x2, ELECTRICAL_ROOM.y2 - DOOR_JAMB_DEPTH, ELECTRICAL_ROOM.x2, ELECTRICAL_ROOM.y2),
    ...PILLARS.map(([x, y]) => rect(x - PILLAR_HALF_SIZE, y - PILLAR_HALF_SIZE, x + PILLAR_HALF_SIZE, y + PILLAR_HALF_SIZE)),
    ...BOOTHS.map(([x, y]) => rect(x - BOOTH_HALF.width, y - BOOTH_HALF.height, x + BOOTH_HALF.width, y + BOOTH_HALF.height)),
  ],

  // Where people lurk (see src/people.js): crew setting up the booths, one early visitor.
  people: [
    { x1: v(250), y1: v(700), x2: v(1100), y2: v(1250), roles: ['crew', 'crew', 'crew', 'crew', 'attendee'] },
    { x1: v(880), y1: v(330), x2: v(1120), y2: v(640), roles: ['crew'] },
  ],

  // Furniture that is only drawn; solid pieces are also listed in blocks.
  decor: BOOTHS.map(([x, y, name], index) => ({
    type: 'booth', ...labelAt(x, y), width: v(BOOTH_HALF.width * 2), height: v(BOOTH_HALF.height * 2),
    name, color: BOOTH_COLORS[index % BOOTH_COLORS.length],
  })),

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
    electricalRoom: {
      x1: v(ELECTRICAL_ROOM.x1), y1: v(ELECTRICAL_ROOM.y1), x2: v(ELECTRICAL_ROOM.x2), y2: v(ELECTRICAL_ROOM.y2),
      door: { x1: v(ELECTRICAL_DOOR.x1), x2: v(ELECTRICAL_DOOR.x2) }, jambDepth: v(DOOR_JAMB_DEPTH),
    },
    // Droid's old maintenance bay, between four pillars just south of where the robots park, so a
    // glitching robot does not have to drag itself across the building for a self-test.
    maintenanceBay: zone(656, 1115, 34),
  },

  lighting: {
    daylight: [],
    exitSigns: [[172, 560], [1138, 560], [700, 1392], [1138, 230]].map(point),
    emergencyLights: [[480, 780], [900, 780], [640, 420], [250, 320], [756, 300], [650, 830], [656, 1115]].map(point),
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
    { text: 'MAINTENANCE BAY', ...labelAt(656, 1170) },
  ],
};

function zone(x, y, radius) {
  return { x: v(x), y: v(y), radius: v(radius) };
}

function labelAt(x, y) {
  return { x: v(x), y: v(y) };
}
