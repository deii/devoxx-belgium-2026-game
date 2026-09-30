// Converts hand-traced level data (plan pixels) into one world in metres. A level is made of
// areas — the cinema floor and the exhibition hall — each traced over its own plan with its own
// scale, and placed side by side at its own offset.

const WALL_HALF_THICKNESS = 0.15;
const SEAT_ROW_HALF_THICKNESS = 0.2;
const LIFT_LINK_PREFIX = 'service-lift';

export function loadLevel(...areaData) {
  const areas = areaData.map(loadArea);
  const primary = areas[0];
  return {
    name: primary.name,
    plans: areas.map(area => area.plan),
    outlines: areas.map(area => area.outline),
    walls: areas.flatMap(area => area.walls),
    blocks: areas.flatMap(area => area.blocks),
    barriers: areas.flatMap(area => area.barriers),
    seatRows: areas.flatMap(area => area.seatRows),
    segments: areas.flatMap(area => area.segments),
    mission: Object.assign({}, ...areas.map(area => area.mission)),
    lighting: mergeLighting(areas.map(area => area.lighting)),
    links: linkTravelPoints(areas.flatMap(area => area.travel)),
    zones: primary.zones,
    decor: areas.flatMap(area => area.decor),
    labels: areas.flatMap(area => area.labels),
    spawns: Object.assign({}, ...areas.map(area => area.spawns)),
  };
}

function loadArea(data) {
  const scale = data.plan.metresPerPx;
  const offset = data.offset || { x: 0, y: 0 };
  const toWorld = ([x, y]) => ({ x: x * scale + offset.x, y: y * scale + offset.y });
  const transform = value => transformDeep(value, scale, offset);

  const outline = data.outline.map(toWorld);
  const walls = data.walls.map(polyline => polyline.map(toWorld));
  const blocks = data.blocks.map(polygon => polygon.map(toWorld));
  const barriers = data.barriers.map(polyline => polyline.map(toWorld));
  const seatRows = data.seatRows.map(polyline => polyline.map(toWorld));

  return {
    name: data.name,
    plan: { src: data.plan.src, metresPerPx: scale, offset },
    outline,
    walls,
    blocks,
    barriers,
    seatRows,
    segments: [
      ...polylineSegments(outline, false),
      ...walls.flatMap(polyline => polylineSegments(polyline, false)),
      ...barriers.flatMap(polyline => polylineSegments(polyline, false)),
      ...seatRows.flatMap(polyline => polylineSegments(polyline, false, SEAT_ROW_HALF_THICKNESS)),
      ...blocks.flatMap(polygon => polylineSegments(polygon, true)),
    ],
    mission: transform(data.mission || {}),
    lighting: transform(data.lighting || {}),
    decor: transform(data.decor || []),
    travel: (data.travel || []).map(end => ({ ...transform(end), exit: toWorld(end.exit) })),
    zones: transform(data.zones || []),
    labels: data.labels.map(label => ({ text: label.text, ...toWorld([label.x, label.y]) })),
    spawns: Object.fromEntries(Object.entries(data.spawns || {}).map(
      ([id, spawn]) => [id, { ...toWorld([spawn.x, spawn.y]), heading: spawn.heading }])),
  };
}

/**
 * Converts every coordinate in a nested description from plan pixels to world metres: [x, y]
 * pairs and x/x1/x2, y/y1/y2 keys get scale and offset, radius gets scale only.
 */
function transformDeep(value, scale, offset, key = '') {
  if (Array.isArray(value)) {
    const isPoint = value.length === 2 && value.every(item => typeof item === 'number');
    return isPoint
      ? [value[0] * scale + offset.x, value[1] * scale + offset.y]
      : value.map(item => transformDeep(item, scale, offset));
  }
  if (typeof value === 'number') {
    if (/^x\d?$/.test(key)) {
      return value * scale + offset.x;
    }
    if (/^y\d?$/.test(key)) {
      return value * scale + offset.y;
    }
    return value * scale;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(
      ([innerKey, inner]) => [innerKey, transformDeep(inner, scale, offset, innerKey)]));
  }
  return value;
}

function mergeLighting(lightings) {
  const merged = {};
  for (const lighting of lightings) {
    for (const [key, value] of Object.entries(lighting)) {
      merged[key] = Array.isArray(value) ? [...(merged[key] || []), ...value] : (merged[key] ?? value);
    }
  }
  return merged;
}

/** Pairs travel points that share a link id: stairs (Voxxy and Droid) or the service lift (anyone). */
function linkTravelPoints(ends) {
  const byLink = new Map();
  for (const end of ends) {
    byLink.set(end.link, [...(byLink.get(end.link) || []), end]);
  }
  return [...byLink.entries()].map(([id, linkEnds]) => ({
    id,
    kind: id.startsWith(LIFT_LINK_PREFIX) ? 'lift' : 'stairs',
    ends: linkEnds,
  }));
}

export function segmentOf(line) {
  return { ax: line.x1, ay: line.y1, bx: line.x2, by: line.y2, halfThickness: WALL_HALF_THICKNESS };
}

function polylineSegments(points, closed, halfThickness = WALL_HALF_THICKNESS) {
  const segments = [];
  const count = closed ? points.length : points.length - 1;
  for (let i = 0; i < count; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    segments.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, halfThickness });
  }
  return segments;
}
