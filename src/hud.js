// DOM overlay: robot roster, keynote clock, objectives, context prompt and title/end screens.
// Every element is only rewritten when its content actually changes.

import { culpritName } from './glitch.js';
import { formatClock } from './mission.js';
import { loadBestClockLeft } from './records.js';
import { rurLine } from './rur.js';
import { IDOLS, moodOf } from './speech.js';
import { ROBOT_ORDER, ROBOT_SPECS } from './robots.js';

const CLOCK_WARNING_SECONDS = 120;
const CAROUSEL_INTERVAL = 6000;   // ms between slides until the player takes over

// One carousel slide per robot on the title screen. Pictures are front views cropped from the
// official Devoxx Robot Games model sheets.
const CAST = {
  voxxy: {
    role: "Light and quick — fits where others don't and carries the small things.",
    floors: 'takes the stairs',
  },
  droid: {
    role: 'Has been in this building for years — knows the stairs, the breakers and the service doors.',
    floors: 'takes the stairs',
  },
  biggy: {
    role: '460 kg of armour — slow to start, hard to stop, moves what nobody else can.',
    floors: 'no stairs, takes the lift',
  },
};

const SCREENS = {
  title: () => `
    <h1>Heisenbug<span>Keynote in 10</span></h1>
    <p>Kinepolis Antwerp, Devoxx morning. The opening keynote in <strong>Room 8</strong> starts in ten
    minutes. The robots spent the night downstairs in the exhibition hall, a sponsor booth has toppled
    against the electrical room, the main breaker has tripped — so the lift and Room 8 are dead —
    and the speaker's HDMI adapter is lying upstairs in the speakers' lounge.</p>
    <p>Three robots are awake. None of them can do this alone — and one of them has a bug nobody
    has diagnosed yet. Watch the system log, work out which robot misbehaves, and run diagnostics
    on it in the maintenance bay. Guess wrong and it costs you keynote time.</p>
    ${castCarousel()}
    <p class="keys key-only"><kbd>WASD</kbd> drive · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd>/<kbd>Tab</kbd> switch robot · <kbd>E</kbd> interact · <kbd>+</kbd><kbd>−</kbd>/wheel zoom · <kbd>M</kbd> sound on/off · <kbd>R</kbd><kbd>R</kbd> restart</p>
    <p class="keys touch-only">Left thumb drives — touch anywhere on the left half and drag · tap a portrait to switch robot · <kbd>E</kbd> interact · <kbd>+</kbd><kbd>−</kbd> zoom · <kbd>♪</kbd> sound · <kbd>⟲</kbd> twice restarts</p>
    ${bestLine()}
    <p class="start"><span class="key-only">Press <kbd>Enter</kbd> to start</span><span class="touch-only">Tap here to start</span></p>
    <p class="credit">Robot pictures: Devoxx Robot Games model sheets. Elevator music: "Local Forecast – Elevator" by Kevin MacLeod (incompetech.com),
    licensed under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>, trimmed.</p>`,
  won: (clock, verdict, record, extra) => `
    <h1>The screen lights up<span>with ${clock} to spare</span></h1>
    <p>Room 8 fills, the projector hums, the speaker's first slide appears. Nobody in the audience
    will ever know about the crates, the fallen booth or the adapter.</p>
    <p class="verdict">${verdict}</p>
    ${extra}
    ${record?.isNewBest ? '<p class="record">New best time on this machine.</p>' : bestLine()}
    <p class="start"><span class="key-only">Press <kbd>R</kbd> to play again</span><span class="touch-only">Tap here to play again</span></p>`,
  lost: (clock, verdict, record, extra) => `
    <h1>09:30 — the keynote starts<span>in the dark</span></h1>
    <p>Two thousand developers stare at a black screen. Somewhere, a speaker is still holding a laptop
    with no way to plug it in.</p>
    <p class="verdict">${verdict}</p>
    ${extra}
    <p class="start"><span class="key-only">Press <kbd>R</kbd> to try again</span><span class="touch-only">Tap here to try again</span></p>`,
};

export function createHud(root) {
  root.innerHTML = `
    <div class="roster"></div>
    <div class="clock"><span class="clock-label">Keynote in</span><span class="clock-value"></span></div>
    <ol class="objectives"></ol>
    <div class="log"><div class="log-title">/var/log/robots</div><div class="log-lines"></div></div>
    <div class="prompt"></div>
    <div class="controls">
      <kbd>WASD</kbd>/<kbd>arrows</kbd> drive · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> or <kbd>Tab</kbd> switch · <kbd>E</kbd> interact · <kbd>+</kbd><kbd>−</kbd> zoom · <kbd>M</kbd> sound · <kbd>R</kbd><kbd>R</kbd> restart
    </div>
    <div class="screen"><div class="panel"></div></div>`;

  const elements = {
    roster: root.querySelector('.roster'),
    clock: root.querySelector('.clock'),
    clockValue: root.querySelector('.clock-value'),
    objectives: root.querySelector('.objectives'),
    logLines: root.querySelector('.log-lines'),
    prompt: root.querySelector('.prompt'),
    screen: root.querySelector('.screen'),
    panel: root.querySelector('.screen .panel'),
  };
  elements.roster.innerHTML = ROBOT_ORDER.map((type, index) => {
    const spec = ROBOT_SPECS[type];
    return `<div class="robot" style="--robot-color: ${spec.color}">
        <div class="portrait"><img src="assets/portraits/${type}.png" alt=""><span class="key">${index + 1}</span></div>
        <span class="name">${spec.name}</span>
      </div>`;
  }).join('');
  elements.rosterCards = [...elements.roster.querySelectorAll('.robot')];
  const shown = {};

  function setIfChanged(key, value, apply) {
    if (shown[key] !== value) {
      shown[key] = value;
      apply(value);
    }
  }

  function update(state) {
    const mission = state.mission;
    const clock = formatClock(mission.clock);

    // The cards are built once; switching robots only moves the 'active' class, so the size change
    // animates. A wound-up robot's frame turns amber, a furious one's red and shaking.
    state.robots.forEach((robot, index) => {
      const card = elements.rosterCards[index];
      card.classList.toggle('active', index === state.activeIndex);
      const mood = state.phase === 'playing' ? moodOf(robot) : 'calm';
      card.classList.toggle('annoyed', mood === 'annoyed');
      card.classList.toggle('furious', mood === 'furious');
    });

    setIfChanged('clock', clock, value => { elements.clockValue.textContent = value; });
    elements.clock.classList.toggle('warning', mission.clock < CLOCK_WARNING_SECONDS);

    const bug = state.heisenbug;
    const objectivesKey = mission.objectives.map(objective => (objective.done ? 1 : 0)).join('') + bug.patched;
    setIfChanged('objectives', objectivesKey, () => {
      elements.objectives.innerHTML = mission.objectives.map(objective => {
        const spec = ROBOT_SPECS[objective.robot];
        return `<li class="${objective.done ? 'done' : ''}" style="--robot-color: ${spec.color}">
          <b>${spec.name}</b> ${objective.text}</li>`;
      }).join('') + `<li class="optional ${bug.patched ? 'done' : ''}" style="--robot-color: #5ac8ff">
          <b>Optional</b> One robot has a Heisenbug. Find it, then run diagnostics on it in the
          maintenance bay</li>`;
    });

    const logKey = bug.log.map(line => line.time + line.text).join('|');
    setIfChanged('log', logKey, () => {
      elements.logLines.innerHTML = bug.log.map(line =>
        `<div class="${line.kind}"><span>${line.time}</span> ${escapeHtml(line.text)}</div>`).join('');
    });

    const prompt = state.phase === 'playing' ? mission.prompt : '';
    setIfChanged('prompt', prompt, value => {
      elements.prompt.textContent = value;
      elements.prompt.classList.toggle('visible', value !== '');
    });

    const screenKey = state.phase === 'playing' ? '' : `${state.phase}:${state.phase === 'won' ? clock : ''}`;
    setIfChanged('screen', screenKey, () => {
      const screen = SCREENS[state.phase];
      elements.screen.classList.toggle('visible', Boolean(screen));
      const easterEgg = rurLine(state.rur);
      const extra = easterEgg ? `<p class="easter-egg">${easterEgg}</p>` : '';
      elements.panel.innerHTML = screen ? screen(clock, verdictFor(bug), state.record, extra) : '';
      attachCarousel();
    });
  }

  let carousel = null;

  /** Moves the title-screen carousel by delta slides; the player's choice stops the autoplay. */
  function stepCarousel(delta) {
    carousel?.show(carousel.index + delta, true);
  }

  function attachCarousel() {
    carousel?.stop();
    carousel = null;
    const root = elements.panel.querySelector('.carousel');
    if (root) {
      carousel = createCarousel(root);
    }
  }

  return { update, stepCarousel };
}

function castCarousel() {
  const slides = ROBOT_ORDER.map((type, index) => {
    const spec = ROBOT_SPECS[type];
    const idol = IDOLS[type];
    return `<figure class="slide${index === 0 ? ' active' : ''}" style="--robot-color: ${spec.color}">
        <img src="assets/robots/${type}.jpg" alt="${spec.name}, front view from the Devoxx model sheet">
        <figcaption>
          <h2><span class="key">${index + 1}</span> ${spec.name}</h2>
          <p>${CAST[type].role}</p>
          <p class="facts">${factsLine(spec, CAST[type].floors)}</p>
          <p class="idol"><b>Idol: ${idol.name}</b> — ${idol.why}.</p>
        </figcaption>
      </figure>`;
  }).join('');
  const dots = ROBOT_ORDER.map((type, index) =>
    `<button class="dot${index === 0 ? ' active' : ''}" data-index="${index}" aria-label="${ROBOT_SPECS[type].name}"></button>`).join('');
  return `<div class="carousel">
      <button class="nav prev" aria-label="Previous robot">‹</button>
      <div class="slides">${slides}</div>
      <button class="nav next" aria-label="Next robot">›</button>
      <div class="dots">${dots}</div>
    </div>`;
}

/** Mass and top speed straight from the drive model: top speed ≈ force / (mass · drag). */
function factsLine(spec, floors) {
  const topSpeed = spec.driveForce / (spec.mass * spec.drag);
  return `${spec.mass} kg · top speed ${topSpeed.toFixed(1)} m/s · ${floors}`;
}

function createCarousel(root) {
  const slides = [...root.querySelectorAll('.slide')];
  const dots = [...root.querySelectorAll('.dot')];
  const carousel = { index: 0, show, stop };
  let timer = setInterval(() => show(carousel.index + 1, false), CAROUSEL_INTERVAL);

  function show(index, byPlayer) {
    carousel.index = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle('active', i === carousel.index));
    dots.forEach((dot, i) => dot.classList.toggle('active', i === carousel.index));
    if (byPlayer) {
      stop();
    }
  }

  function stop() {
    clearInterval(timer);
    timer = null;
  }

  root.querySelector('.prev').addEventListener('click', () => show(carousel.index - 1, true));
  root.querySelector('.next').addEventListener('click', () => show(carousel.index + 1, true));
  dots.forEach(dot => dot.addEventListener('click', () => show(Number(dot.dataset.index), true)));
  return carousel;
}

function bestLine() {
  const best = loadBestClockLeft();
  return best ? `<p class="record">Best on this machine: ${formatClock(best)} to spare.</p>` : '';
}

function verdictFor(bug) {
  const name = culpritName(bug);
  const misses = bug.wrongGuesses === 1 ? 'one wrong guess' : `${bug.wrongGuesses} wrong guesses`;
  if (bug.patched) {
    return bug.wrongGuesses === 0
      ? `Heisenbug: it was <b>${name}</b> — and you found it on the first try.`
      : `Heisenbug: it was <b>${name}</b>. Found after ${misses}.`;
  }
  return `Heisenbug: it was <b>${name}</b> all along. It is still in there.`;
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
