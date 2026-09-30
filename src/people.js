// People around the venue: early attendees in the foyer, crew setting up booths in the hall, a
// speaker rehearsing in the lounge. They do not collide with anything — they lurk: walk to a random
// spot in their own area, stand around, pick another one. Their paths are checked against the walls
// so they never walk through one. When a robot comes close they turn to it and say something.

import { drawBubble } from './speech.js';

const WALK_SPEED = [0.5, 1.0];        // m/s — strolling, not hurrying
const PAUSE = [2, 9];                 // s standing still between walks
const PATH_CLEARANCE = 0.35;          // m between a walking person and any wall
const PATH_SAMPLE = 0.25;             // m between checked points on a path
const TARGET_ATTEMPTS = 8;
const WALL_SEARCH_MARGIN = 3;         // m around an area whose walls are checked
const REACTION_RANGE = 2.2;           // m between a person and a robot's edge
const REACTION_COOLDOWN = [10, 18];   // s before the same person reacts again
const BUBBLE_DURATION = 2.6;          // s
const TURN_RATE = 6;                  // 1/s — how fast a person turns to face where they go

const LOOKS = {
  attendee: { shirts: ['#4a6fa5', '#7a8c5a', '#a05a5a', '#5a5a7a', '#c9b37e', '#3f7f7f'], lanyard: '#ff8a1f' },
  crew: { shirts: ['#ff8a1f'], lanyard: '#1a1a1a' },
  speaker: { shirts: ['#2d2f36'], lanyard: '#5ac8ff' },
};
const HAIR = ['#2b1d14', '#6b4a2b', '#c9a15a', '#1a1a1a', '#8a8a8a', '#a0522d'];

const REACTIONS = {
  attendee: {
    voxxy: ['Aww, Voxxy!', 'Selfie with Voxxy!', 'Is that the mascot?'],
    droid: ['Morning, Droid.', 'Is that the new Droid?', 'Droid! Where is Room 8?'],
    biggy: ['Whoa, make way!', 'Is it going to stop?', 'Biggy! Mind my toes!'],
  },
  crew: {
    voxxy: ['Hi Voxxy, keynote in ten!', 'Voxxy, not the cables!'],
    droid: ['Droid, is the power back yet?', 'Thanks, Droid.'],
    biggy: ['Careful with the booths, Biggy!', 'Not through the stand!'],
  },
  speaker: {
    voxxy: ["…and that's why — oh, hi Voxxy.", 'Have you seen my adapter?'],
    droid: ['…slide 42, live demo… hello, Droid.', "Please tell me Room 8 isn't dark."],
    biggy: ['…where was I? Oh. Biggy.', 'Not now, I am rehearsing.'],
  },
};

export function createPeople(level, random = Math.random) {
  const people = [];
  for (const area of level.people) {
    const walls = level.segments.filter(segment => nearArea(segment, area));
    area.blocks = level.blocks.filter(polygon => polygon.some(point => nearArea({ ax: point.x, bx: point.x, ay: point.y, by: point.y }, area)));
    for (const role of area.roles) {
      const look = LOOKS[role];
      const start = randomSpot(area, walls, random);
      people.push({
        role,
        area,
        walls,
        x: start.x,
        y: start.y,
        heading: random() * Math.PI * 2,
        target: null,
        speed: between(WALK_SPEED, random),
        pause: between(PAUSE, random),
        stride: 0,
        shirt: look.shirts[Math.floor(random() * look.shirts.length)],
        lanyard: look.lanyard,
        hair: HAIR[Math.floor(random() * HAIR.length)],
        bubble: null,
        reactionCooldown: between(REACTION_COOLDOWN, random) / 3,
      });
    }
  }
  return people;
}

export function updatePeople(state, dt, random = Math.random) {
  for (const person of state.people) {
    person.reactionCooldown = Math.max(0, person.reactionCooldown - dt);
    if (person.bubble) {
      person.bubble.remaining -= dt;
      if (person.bubble.remaining <= 0) {
        person.bubble = null;
      }
    }
    if (state.phase !== 'playing') {
      continue;
    }
    const robot = robotInRange(state.robots, person);
    if (robot && person.reactionCooldown === 0) {
      react(person, robot, random);
      continue;
    }
    if (person.bubble) {
      continue;                           // standing still while talking
    }
    walk(person, dt, random);
  }
}

function react(person, robot, random) {
  const lines = REACTIONS[person.role][robot.type];
  person.bubble = { text: lines[Math.floor(random() * lines.length)], remaining: BUBBLE_DURATION };
  person.reactionCooldown = between(REACTION_COOLDOWN, random);
  person.heading = Math.atan2(robot.y - person.y, robot.x - person.x);
  person.target = null;
  person.pause = BUBBLE_DURATION;
}

function walk(person, dt, random) {
  if (!person.target) {
    person.pause -= dt;
    if (person.pause <= 0) {
      person.target = pickTarget(person, random);
      person.speed = between(WALK_SPEED, random);
      if (!person.target) {
        person.pause = between(PAUSE, random);    // stay put a while, then try again
      }
    }
    return;
  }
  const dx = person.target.x - person.x;
  const dy = person.target.y - person.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 0.1) {
    person.target = null;
    person.pause = between(PAUSE, random);
    return;
  }
  const step = Math.min(distance, person.speed * dt);
  person.x += dx / distance * step;
  person.y += dy / distance * step;
  person.stride += step;
  const turn = Math.atan2(Math.sin(Math.atan2(dy, dx) - person.heading), Math.cos(Math.atan2(dy, dx) - person.heading));
  person.heading += turn * Math.min(1, TURN_RATE * dt);
}

function pickTarget(person, random) {
  for (let attempt = 0; attempt < TARGET_ATTEMPTS; attempt++) {
    const spot = randomSpot(person.area, person.walls, random);
    if (pathClear(person, spot, person.walls)) {
      return spot;
    }
  }
  return null;                            // nowhere to go from here right now
}

function randomSpot(area, walls, random) {
  for (let attempt = 0; attempt < TARGET_ATTEMPTS * 4; attempt++) {
    const spot = { x: area.x1 + random() * (area.x2 - area.x1), y: area.y1 + random() * (area.y2 - area.y1) };
    if (walls.every(segment => distanceToSegment(spot, segment) > PATH_CLEARANCE)
      && !area.blocks.some(polygon => insidePolygon(spot, polygon))) {
      return spot;
    }
  }
  return { x: (area.x1 + area.x2) / 2, y: (area.y1 + area.y2) / 2 };
}

function pathClear(from, to, walls) {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const samples = Math.max(1, Math.ceil(length / PATH_SAMPLE));
  for (let i = 1; i <= samples; i++) {
    const point = { x: from.x + (to.x - from.x) * i / samples, y: from.y + (to.y - from.y) * i / samples };
    if (walls.some(segment => distanceToSegment(point, segment) < PATH_CLEARANCE)) {
      return false;
    }
  }
  return true;
}

function robotInRange(robots, person) {
  return robots.find(robot => Math.hypot(robot.x - person.x, robot.y - person.y) - robot.radius < REACTION_RANGE);
}

function nearArea(segment, area) {
  return Math.max(segment.ax, segment.bx) > area.x1 - WALL_SEARCH_MARGIN
    && Math.min(segment.ax, segment.bx) < area.x2 + WALL_SEARCH_MARGIN
    && Math.max(segment.ay, segment.by) > area.y1 - WALL_SEARCH_MARGIN
    && Math.min(segment.ay, segment.by) < area.y2 + WALL_SEARCH_MARGIN;
}

function distanceToSegment(point, segment) {
  const ex = segment.bx - segment.ax;
  const ey = segment.by - segment.ay;
  const lengthSq = ex * ex + ey * ey;
  let t = lengthSq > 0 ? ((point.x - segment.ax) * ex + (point.y - segment.ay) * ey) / lengthSq : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(point.x - segment.ax - ex * t, point.y - segment.ay - ey * t) - segment.halfThickness;
}

function insidePolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

function between([min, max], random) {
  return min + random() * (max - min);
}

/** Top-down person: shoulders in the shirt colour, a lanyard, a head; the arms swing while walking. */
export function drawPeople(ctx, people) {
  for (const person of people) {
    const swing = Math.sin(person.stride * 7) * 0.07;
    ctx.save();
    ctx.translate(person.x, person.y);
    ctx.rotate(person.heading);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0.05, 0.06, 0.2, 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = person.shirt;
    for (const side of [-1, 1]) {                         // arms
      ctx.beginPath();
      ctx.ellipse(swing * side, side * 0.25, 0.12, 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.15, 0.24, 0, 0, Math.PI * 2);   // shoulders
    ctx.fill();
    ctx.strokeStyle = person.lanyard;
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.arc(0.02, 0, 0.12, -0.9, 0.9);
    ctx.stroke();
    ctx.fillStyle = person.hair;
    ctx.beginPath();
    ctx.arc(0, 0, 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawPeopleSpeech(ctx, people, toScreen) {
  for (const person of people) {
    if (person.bubble) {
      drawBubble(ctx, person.bubble.text, toScreen(person.x, person.y - 0.3), Math.min(1, person.bubble.remaining / 0.3));
    }
  }
}
