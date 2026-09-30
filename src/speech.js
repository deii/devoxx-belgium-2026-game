// Speech bubbles. Each robot looks up to a Devoxx speaker whose strengths it shares, and reacts to
// events in its own words. The only borrowed phrase is Josh Long's well-known "Bootiful", which
// Voxxy uses as a fan. Events are detected by diffing state between frames, like the audio.

const BUBBLE_DURATION = 2.4;          // s

// Frustration: every hard bump into a wall or another robot winds a robot up; it cools down again
// over time. What it says after a bump depends on how wound up it already is. Crates and the booth
// do not count — shoving them is Biggy's job.
const WALL_BUMP_THRESHOLD = 0.8;      // m/s
const ROBOT_BUMP_THRESHOLD = 0.5;     // m/s
const FRUSTRATION_PER_MPS = 0.18;     // per m/s of impact speed
const FRUSTRATION_MAX_PER_BUMP = 0.35;
const FRUSTRATION_COOLDOWN = 0.04;    // per s — from furious to calm in about 25 s
const BUMP_DEBOUNCE = 0.6;            // s — one bounce sequence counts as one bump
const BUMP_LINE_COOLDOWN = 3;         // s between complaints from the same robot
export const MOOD_LEVELS = [
  { name: 'calm', from: 0 },
  { name: 'annoyed', from: 0.35 },
  { name: 'furious', from: 0.7 },
];

export const IDOLS = {
  voxxy: { name: 'Josh Long', why: 'nobody gets from slide to live demo faster — or says "Bootiful" with more conviction' },
  droid: { name: 'Dr. Venkat Subramaniam', why: 'decades of making hard things clear — Droid tries to light the way the same way' },
  biggy: { name: 'Victor Rentea', why: 'once he starts refactoring, nothing in the way survives — Biggy feels the same about crates' },
};

const LINES = {
  pickup: { voxxy: ['Bootiful!', 'Got it. Bootiful.'] },
  power: {
    voxxy: ['Lights! Bootiful.'],
    droid: ['There. Now everyone can see the path.', 'Old panel. Same trick as every year.'],
    biggy: ['Power. Good.'],
  },
  door: { droid: ['I know every door in this building.', 'Service door. After you.'] },
  crates: { biggy: ['Refactored.', 'Legacy crates removed.', 'Nothing survives a proper refactoring.'] },
  booth: { biggy: ['Dependency removed.', 'Refactored. Again.'] },
  lift: { biggy: ['Stairs are a code smell.', 'Taking the lift. Obviously.'] },
  delivered: { voxxy: ['Bootiful!!', 'Plugged in. Bootiful.'] },
  patched: {
    voxxy: ['Patched! Bootiful.'],
    droid: ['Understood. And fixed.'],
    biggy: ['Clean again. Refactored from the inside.'],
  },
  rur: {
    voxxy: ['R.U.R.! Great-great-grandpa. Bootiful.'],
    droid: ['Čapek, 1920. Where our name began.'],
    biggy: ['Robota. Still robota.'],
  },
  wrongGuess: {
    voxxy: ['Works on my machine!'],
    droid: ['Works on my machine.'],
    biggy: ['Works on my machine.'],
  },
};

// Complaints after a bump, per robot and mood. {other} is the robot that was bumped into.
const BUMP_LINES = {
  wall: {
    voxxy: {
      calm: ['Oops!', 'Boing!', 'Whoa, wall.'],
      annoyed: ['Who put that there?!', 'Not bootiful.', 'Again?!'],
      furious: ['Nothing about this building is bootiful!', "I'm filing a bug against this wall!", 'ARGH!'],
    },
    droid: {
      calm: ['Noted.', 'Hm. Still solid.'],
      annoyed: ["That wall wasn't there last year.", "Let's slow down and think."],
      furious: ["I've been in this building for years. This is new.", 'Deep breath. Deep breath.'],
    },
    biggy: {
      calm: ['Moving on.', 'Just a small refactoring.'],
      annoyed: ['That wall had code smells.', 'Walls. Always walls.'],
      furious: ['This whole building needs a refactoring.', 'GRRR.'],
    },
  },
  robot: {
    voxxy: {
      calm: ['Sorry, {other}!', 'Oops — hi, {other}!'],
      annoyed: ['Watch it, {other}!', 'Hey! Mind your wheels, {other}!'],
      furious: ['{other}! Seriously?!', 'Personal space, {other}!'],
    },
    droid: {
      calm: ['Excuse me, {other}.', 'After you, {other}.'],
      annoyed: ["{other}, let's be deliberate.", 'We share this corridor, {other}.'],
      furious: ['{other}. Please. Stop.', 'I will explain this once, {other}: steer.'],
    },
    biggy: {
      calm: ['Oh. Small robot.', 'Sorry, {other}.'],
      annoyed: ["{other}, you're in my refactoring.", 'Not now, {other}.'],
      furious: ['{other}. MOVE.', 'Out of the way, {other}.'],
    },
  },
};

export function createSpeech() {
  return { bubbles: {}, previous: {}, bumpDebounce: {}, lineCooldown: {} };
}

export function moodOf(robot) {
  return MOOD_LEVELS.reduce((mood, level) => (robot.frustration >= level.from ? level : mood)).name;
}

export function updateSpeech(speech, state, dt) {
  for (const type of Object.keys(speech.bubbles)) {
    speech.bubbles[type].remaining -= dt;
    if (speech.bubbles[type].remaining <= 0) {
      delete speech.bubbles[type];
    }
  }
  if (state.phase !== 'playing' && state.phase !== 'won') {
    return;
  }
  updateFrustration(speech, state, dt);

  const mission = state.mission;
  const bug = state.heisenbug;
  const changedTo = (key, value) => {
    const was = speech.previous[key];
    speech.previous[key] = value;
    return was !== undefined && was !== value;
  };
  const cratesCleared = mission.objectives.find(objective => objective.id === 'crates').done;

  if (changedTo('carrier', mission.adapter.carrier?.type) && mission.adapter.carrier) {
    say(speech, state, 'pickup', mission.adapter.carrier.type);
  }
  if (changedTo('power', mission.power) && mission.power) {
    state.robots.forEach(robot => say(speech, state, 'power', robot.type));
  }
  if (changedTo('door', mission.doorOpen) && mission.doorOpen) {
    say(speech, state, 'door', 'droid');
  }
  if (changedTo('crates', cratesCleared) && cratesCleared) {
    say(speech, state, 'crates', 'biggy');
  }
  const boothCleared = mission.objectives.find(objective => objective.id === 'booth').done;
  if (changedTo('booth', boothCleared) && boothCleared) {
    say(speech, state, 'booth', 'biggy');
  }
  const ridingBiggy = state.travel.rides.some(ride => ride.robot.type === 'biggy');
  if (changedTo('liftBiggy', ridingBiggy) && ridingBiggy) {
    say(speech, state, 'lift', 'biggy');
  }
  if (changedTo('delivered', mission.adapter.delivered) && mission.adapter.delivered) {
    say(speech, state, 'delivered', 'voxxy');
  }
  if (changedTo('patched', bug.patched) && bug.patched) {
    say(speech, state, 'patched', bug.culprit);
  }
  const rurVisits = state.rur.visited.length;
  if (changedTo('rur', rurVisits) && rurVisits > 0) {
    say(speech, state, 'rur', state.rur.visited[rurVisits - 1]);
  }
  const lastDiagnosed = bug.lastDiagnosedType;
  if (changedTo('wrongGuesses', bug.wrongGuesses) && lastDiagnosed) {
    say(speech, state, 'wrongGuess', lastDiagnosed);
  }
}

function updateFrustration(speech, state, dt) {
  for (const robot of state.robots) {
    const type = robot.type;
    robot.frustration = Math.max(0, robot.frustration - FRUSTRATION_COOLDOWN * dt);
    speech.bumpDebounce[type] = Math.max(0, (speech.bumpDebounce[type] || 0) - dt);
    speech.lineCooldown[type] = Math.max(0, (speech.lineCooldown[type] || 0) - dt);

    const robotBump = robot.bump && robot.bump.speed > ROBOT_BUMP_THRESHOLD ? robot.bump : null;
    const wallBump = robot.wallImpact > WALL_BUMP_THRESHOLD ? robot.wallImpact : 0;
    if ((!robotBump && !wallBump) || speech.bumpDebounce[type] > 0) {
      continue;
    }
    speech.bumpDebounce[type] = BUMP_DEBOUNCE;
    const speed = Math.max(robotBump?.speed ?? 0, wallBump);
    robot.frustration = Math.min(1, robot.frustration + Math.min(FRUSTRATION_MAX_PER_BUMP, speed * FRUSTRATION_PER_MPS));

    if (speech.lineCooldown[type] > 0 || speech.bubbles[type]) {
      continue;
    }
    const lines = robotBump
      ? BUMP_LINES.robot[type][moodOf(robot)].map(line => line.replaceAll('{other}', robotBump.other.spec.name))
      : BUMP_LINES.wall[type][moodOf(robot)];
    speech.bubbles[type] = { text: lines[Math.floor(Math.random() * lines.length)], remaining: BUBBLE_DURATION };
    speech.lineCooldown[type] = BUMP_LINE_COOLDOWN;
  }
}

function say(speech, state, event, type) {
  const options = LINES[event]?.[type];
  if (!options) {
    return;
  }
  const text = options[Math.floor(Math.random() * options.length)];
  speech.bubbles[type] = { text, remaining: BUBBLE_DURATION };
}

/** Draws bubbles in screen space; `toScreen` maps world metres to CSS pixels. */
export function drawSpeech(ctx, speech, state, toScreen) {
  for (const robot of state.robots) {
    const bubble = speech.bubbles[robot.type];
    if (bubble) {
      drawBubble(ctx, bubble.text, toScreen(robot.x, robot.y - robot.radius), Math.min(1, bubble.remaining / 0.3));
    }
  }
}

/** One speech bubble in screen space, its tail pointing down at anchor. */
export function drawBubble(ctx, text, anchor, alpha) {
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const width = ctx.measureText(text).width + 20;
  const height = 26;
  const x = anchor.x - width / 2;
  const y = anchor.y - height - 16;

  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(245, 243, 238, 0.95)';
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8);
  ctx.moveTo(anchor.x - 6, y + height);
  ctx.lineTo(anchor.x, y + height + 8);
  ctx.lineTo(anchor.x + 6, y + height);
  ctx.fill();
  ctx.fillStyle = '#15171c';
  ctx.fillText(text, anchor.x, y + height / 2 + 1);
  ctx.globalAlpha = 1;
}
