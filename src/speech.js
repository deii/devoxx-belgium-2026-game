// Speech bubbles. Each robot looks up to a Devoxx speaker whose strengths it shares, and reacts to
// events in its own words. The only borrowed phrase is Josh Long's well-known "Bootiful", which
// Voxxy uses as a fan. Events are detected by diffing state between frames, like the audio.

const BUBBLE_DURATION = 2.4;          // s
const IMPACT_LINE_THRESHOLD = 1.4;    // m/s
const IMPACT_LINE_COOLDOWN = 8;       // s between impact remarks

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
  impact: { biggy: ['Just a small refactoring.', 'That wall had code smells.', 'Moving on.'] },
  delivered: { voxxy: ['Bootiful!!', 'Plugged in. Bootiful.'] },
  patched: {
    voxxy: ['Patched! Bootiful.'],
    droid: ['Understood. And fixed.'],
    biggy: ['Clean again. Refactored from the inside.'],
  },
  wrongGuess: {
    voxxy: ['Works on my machine!'],
    droid: ['Works on my machine.'],
    biggy: ['Works on my machine.'],
  },
};

export function createSpeech() {
  return { bubbles: {}, previous: {}, impactCooldown: 0 };
}

export function updateSpeech(speech, state, dt) {
  for (const type of Object.keys(speech.bubbles)) {
    speech.bubbles[type].remaining -= dt;
    if (speech.bubbles[type].remaining <= 0) {
      delete speech.bubbles[type];
    }
  }
  speech.impactCooldown = Math.max(0, speech.impactCooldown - dt);
  if (state.phase !== 'playing' && state.phase !== 'won') {
    return;
  }

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
  if (changedTo('delivered', mission.adapter.delivered) && mission.adapter.delivered) {
    say(speech, state, 'delivered', 'voxxy');
  }
  if (changedTo('patched', bug.patched) && bug.patched) {
    say(speech, state, 'patched', bug.culprit);
  }
  const lastDiagnosed = bug.lastDiagnosedType;
  if (changedTo('wrongGuesses', bug.wrongGuesses) && lastDiagnosed) {
    say(speech, state, 'wrongGuess', lastDiagnosed);
  }

  const biggy = state.robots.find(robot => robot.type === 'biggy');
  if (biggy.lastImpact > IMPACT_LINE_THRESHOLD && speech.impactCooldown === 0) {
    say(speech, state, 'impact', 'biggy');
    speech.impactCooldown = IMPACT_LINE_COOLDOWN;
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
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const robot of state.robots) {
    const bubble = speech.bubbles[robot.type];
    if (!bubble) {
      continue;
    }
    const alpha = Math.min(1, bubble.remaining / 0.3);
    const anchor = toScreen(robot.x, robot.y - robot.radius);
    const width = ctx.measureText(bubble.text).width + 20;
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
    ctx.fillText(bubble.text, anchor.x, y + height / 2 + 1);
    ctx.globalAlpha = 1;
  }
}
