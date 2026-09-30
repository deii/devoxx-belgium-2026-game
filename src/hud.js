// DOM overlay: robot roster and controls. Updated only when something changes.

import { ROBOT_ORDER, ROBOT_SPECS } from './robots.js';

export function createHud(root) {
  root.innerHTML = `
    <div class="roster"></div>
    <div class="controls">
      <kbd>WASD</kbd>/<kbd>arrows</kbd> drive · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> or <kbd>Tab</kbd> switch robot
    </div>`;
  const roster = root.querySelector('.roster');
  let shownIndex = -1;

  function update(state) {
    if (state.activeIndex === shownIndex) {
      return;
    }
    shownIndex = state.activeIndex;
    roster.innerHTML = ROBOT_ORDER.map((type, index) => {
      const spec = ROBOT_SPECS[type];
      const active = index === state.activeIndex ? ' active' : '';
      return `<div class="robot${active}" style="--robot-color: ${spec.color}">
        <span class="key">${index + 1}</span>
        <span class="name">${spec.name}</span>
        ${active ? `<span class="tagline">${spec.tagline}</span>` : ''}
      </div>`;
    }).join('');
  }

  return { update };
}
