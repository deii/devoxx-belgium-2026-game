// DOM overlay: robot roster, keynote clock, objectives, context prompt and title/end screens.
// Every element is only rewritten when its content actually changes.

import { formatClock } from './mission.js';
import { ROBOT_ORDER, ROBOT_SPECS } from './robots.js';

const CLOCK_WARNING_SECONDS = 120;

const SCREENS = {
  title: `
    <h1>Heisenbug<span>Keynote in 10</span></h1>
    <p>Kinepolis Antwerp, Devoxx morning. The opening keynote in <strong>Room 8</strong> starts in ten
    minutes — and the floor is dark, the room is locked, and the speaker's HDMI adapter is lying in
    the speakers' lounge behind a queue of barriers.</p>
    <p>Three robots are awake. None of them can do this alone.</p>
    <ul class="cast">
      <li style="--robot-color: ${ROBOT_SPECS.voxxy.color}"><b>Voxxy</b> light and quick — fits where others don't, carries small things</li>
      <li style="--robot-color: ${ROBOT_SPECS.droid.color}"><b>Droid</b> has been here for years — knows the fuse panel and the service doors</li>
      <li style="--robot-color: ${ROBOT_SPECS.biggy.color}"><b>Biggy</b> 460 kg of armour — slow to start, hard to stop, moves what nobody else can</li>
    </ul>
    <p class="keys"><kbd>WASD</kbd> drive · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd>/<kbd>Tab</kbd> switch robot · <kbd>E</kbd> interact</p>
    <p class="start">Press <kbd>Enter</kbd> to start</p>`,
  won: clock => `
    <h1>The screen lights up<span>with ${clock} to spare</span></h1>
    <p>Room 8 fills, the projector hums, the speaker's first slide appears. Nobody in the audience
    will ever know about the crates, the fuses or the adapter.</p>
    <p class="start">Press <kbd>R</kbd> to play again</p>`,
  lost: () => `
    <h1>09:30 — the keynote starts<span>in the dark</span></h1>
    <p>Two thousand developers stare at a black screen. Somewhere, a speaker is still holding a laptop
    with no way to plug it in.</p>
    <p class="start">Press <kbd>R</kbd> to try again</p>`,
};

export function createHud(root) {
  root.innerHTML = `
    <div class="roster"></div>
    <div class="clock"><span class="clock-label">Keynote in</span><span class="clock-value"></span></div>
    <ol class="objectives"></ol>
    <div class="prompt"></div>
    <div class="controls">
      <kbd>WASD</kbd>/<kbd>arrows</kbd> drive · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> or <kbd>Tab</kbd> switch · <kbd>E</kbd> interact
    </div>
    <div class="screen"><div class="panel"></div></div>`;

  const elements = {
    roster: root.querySelector('.roster'),
    clock: root.querySelector('.clock'),
    clockValue: root.querySelector('.clock-value'),
    objectives: root.querySelector('.objectives'),
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
          <span class="name">${spec.name}</span>
          ${active ? `<span class="tagline">${spec.tagline}</span>` : ''}
        </div>`;
      }).join('');
    });

    setIfChanged('clock', clock, value => { elements.clockValue.textContent = value; });
    elements.clock.classList.toggle('warning', mission.clock < CLOCK_WARNING_SECONDS);

    const objectivesKey = mission.objectives.map(objective => (objective.done ? 1 : 0)).join('');
    setIfChanged('objectives', objectivesKey, () => {
      elements.objectives.innerHTML = mission.objectives.map(objective => {
        const spec = ROBOT_SPECS[objective.robot];
        return `<li class="${objective.done ? 'done' : ''}" style="--robot-color: ${spec.color}">
          <b>${spec.name}</b> ${objective.text}</li>`;
      }).join('');
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
      elements.panel.innerHTML = typeof screen === 'function' ? screen(clock) : (screen || '');
    });
  }

  return { update };
}
