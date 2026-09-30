// Converts hand-traced level data (plan pixels) into world geometry (metres).

const WALL_HALF_THICKNESS = 0.15;

export function loadLevel(data) {
  const scale = data.plan.metresPerPx;
  const toWorld = ([x, y]) => ({ x: x * scale, y: y * scale });

  const outline = data.outline.map(toWorld);
  const walls = data.walls.map(polyline => polyline.map(toWorld));
  const blocks = data.blocks.map(polygon => polygon.map(toWorld));
  const barriers = data.barriers.map(polyline => polyline.map(toWorld));

  const segments = [
    ...polylineSegments(outline, false),
    ...walls.flatMap(polyline => polylineSegments(polyline, false)),
    ...barriers.flatMap(polyline => polylineSegments(polyline, false)),
    ...blocks.flatMap(polygon => polylineSegments(polygon, true)),
  ];

  return {
    name: data.name,
    plan: { src: data.plan.src, metresPerPx: scale },
    outline,
    walls,
    blocks,
    barriers,
    segments,
    mission: scaleCoordinates(data.mission, scale),
    lighting: scaleCoordinates(data.lighting, scale),
    zones: data.zones.map(zone => ({
      ...zone, x1: zone.x1 * scale, y1: zone.y1 * scale, x2: zone.x2 * scale, y2: zone.y2 * scale,
    })),
    labels: data.labels.map(label => ({ text: label.text, ...toWorld([label.x, label.y]) })),
    spawns: Object.fromEntries(Object.entries(data.spawns).map(
      ([id, spawn]) => [id, { ...toWorld([spawn.x, spawn.y]), heading: spawn.heading }])),
  };
}

/** Scales every number in a nested description (coordinates, radii) from plan pixels to metres. */
function scaleCoordinates(mission, scale) {
  const scaleValue = value => {
    if (Array.isArray(value)) {
      return value.map(scaleValue);
    }
    if (typeof value === 'number') {
      return value * scale;
    }
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, scaleValue(inner)]));
  };
  return scaleValue(mission);
}

export function segmentOf(line) {
  return { ax: line.x1, ay: line.y1, bx: line.x2, by: line.y2, halfThickness: WALL_HALF_THICKNESS };
}

function polylineSegments(points, closed) {
  const segments = [];
  const count = closed ? points.length : points.length - 1;
  for (let i = 0; i < count; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    segments.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, halfThickness: WALL_HALF_THICKNESS });
  }
  return segments;
}
