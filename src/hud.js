// DOM overlay: robot roster, keynote clock, objectives, context prompt and title/end screens.
// Every element is only rewritten when its content actually changes.

import { culpritName } from './glitch.js';
import { formatClock } from './mission.js';
import { loadBestClockLeft } from './records.js';
import { IDOLS, moodOf } from './speech.js';
import { ROBOT_ORDER, ROBOT_SPECS } from './robots.js';

const CLOCK_WARNING_SECONDS = 120;

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
    <ul class="cast">
      <li style="--robot-color: ${ROBOT_SPECS.voxxy.color}"><b>Voxxy</b> light and quick — fits where others don't, carries small things${idolLine('voxxy')}</li>
      <li style="--robot-color: ${ROBOT_SPECS.droid.color}"><b>Droid</b> has been here for years — knows the stairs, the breakers and the service doors${idolLine('droid')}</li>
      <li style="--robot-color: ${ROBOT_SPECS.biggy.color}"><b>Biggy</b> 460 kg of armour — slow to start, hard to stop, moves what nobody else can${idolLine('biggy')}</li>
    </ul>
    <p class="keys"><kbd>WASD</kbd> drive · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd>/<kbd>Tab</kbd> switch robot · <kbd>E</kbd> interact · <kbd>+</kbd><kbd>−</kbd>/wheel zoom · <kbd>M</kbd> sound on/off</p>
    ${bestLine()}
    <p class="start">Press <kbd>Enter</kbd> to start</p>`,
  won: (clock, verdict, record) => `
    <h1>The screen lights up<span>with ${clock} to spare</span></h1>
    <p>Room 8 fills, the projector hums, the speaker's first slide appears. Nobody in the audience
    will ever know about the crates, the fallen booth or the adapter.</p>
    <p class="verdict">${verdict}</p>
    ${record?.isNewBest ? '<p class="record">New best time on this machine.</p>' : bestLine()}
    <p class="start">Press <kbd>R</kbd> to play again</p>`,
  lost: (clock, verdict) => `
    <h1>09:30 — the keynote starts<span>in the dark</span></h1>
    <p>Two thousand developers stare at a black screen. Somewhere, a speaker is still holding a laptop
    with no way to plug it in.</p>
    <p class="verdict">${verdict}</p>
    <p class="start">Press <kbd>R</kbd> to try again</p>`,
};

export function createHud(root) {
  root.innerHTML = `
    <div class="roster"></div>
    <div class="clock"><span class="clock-label">Keynote in</span><span class="clock-value"></span></div>
    <ol class="objectives"></ol>
    <div class="log"><div class="log-title">/var/log/robots</div><div class="log-lines"></div></div>
    <div class="prompt"></div>
    <div class="controls">
      <kbd>WASD</kbd>/<kbd>arrows</kbd> drive · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> or <kbd>Tab</kbd> switch · <kbd>E</kbd> interact · <kbd>+</kbd><kbd>−</kbd> zoom · <kbd>M</kbd> sound
    </div>
    <div class="screen"><div class="panel"></div></div>`;

  const elements = {
    roster: root.querySelector('.roster'),
    clock: root.querySelector('.clock'),
    clockValue: root.querySelector('.clock-value'),
    objectives: root.querySelector('.objectives'),
    logLines: root.querySelector('.log-lines'),
    canvas: document.getElementById('game'),
    prompt: root.querySelector('.prompt'),
    screen: root.querySelector('.screen'),
    panel: root.querySelector('.screen .panel'),
  };
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

    setIfChanged('roster', state.activeIndex, activeIndex => {
      elements.roster.innerHTML = ROBOT_ORDER.map((type, index) => {
        const spec = ROBOT_SPECS[type];
        const active = index === activeIndex ? ' active' : '';
        return `<div class="robot${active}" style="--robot-color: ${spec.color}">
          <span class="key">${index + 1}</span>
          <span class="name">${spec.name} <span class="mood" data-robot="${type}"></span></span>
          ${active ? `<span class="tagline">${spec.tagline}</span>` : ''}
        </div>`;
      }).join('');
    });

    for (const robot of state.robots) {
      const mood = state.phase === 'playing' ? moodOf(robot) : 'calm';
      // Checked against the element itself: the roster is re-rendered when the active robot changes.
      const element = elements.roster.querySelector(`.mood[data-robot="${robot.type}"]`);
      if (element.className !== `mood ${mood}`) {
        element.textContent = mood === 'calm' ? '' : mood;
        element.className = `mood ${mood}`;
      }
    }

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
    elements.canvas.classList.toggle('glitching', bug.flicker > 0);

    const prompt = state.phase === 'playing' ? mission.prompt : '';
    setIfChanged('prompt', prompt, value => {
      elements.prompt.textContent = value;
      elements.prompt.classList.toggle('visible', value !== '');
    });

    const screenKey = state.phase === 'playing' ? '' : `${state.phase}:${state.phase === 'won' ? clock : ''}`;
    setIfChanged('screen', screenKey, () => {
      const screen = SCREENS[state.phase];
      elements.screen.classList.toggle('visible', Boolean(screen));
      elements.panel.innerHTML = screen ? screen(clock, verdictFor(bug), state.record) : '';
    });
  }

  return { update };
}

function idolLine(type) {
  const idol = IDOLS[type];
  return `<span class="idol">Idol: ${idol.name} — ${idol.why}.</span>`;
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
