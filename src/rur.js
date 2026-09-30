// Easter egg: an R.U.R. poster on the foyer's wall of fame. Karel Čapek's 1920 play "R.U.R. —
// Rossum's Universal Robots" gave the world the word "robot"; his brother Josef suggested it, from
// the Czech "robota", forced labour. Every robot that drives up to the poster pays its respects once.

import { addLog } from './glitch.js';

const POSTER_RANGE = 1.5;   // m between robot edge and poster centre

export function createRur() {
  return { visited: [] };   // robot types, in the order they found the poster
}

export function updateRur(state) {
  const poster = state.level.mission.rurPoster;
  const rur = state.rur;
  for (const robot of state.robots) {
    if (rur.visited.includes(robot.type)) {
      continue;
    }
    if (Math.hypot(robot.x - poster.x, robot.y - poster.y) - robot.radius < POSTER_RANGE) {
      rur.visited.push(robot.type);
      if (rur.visited.length === 1) {
        addLog(state, 'INFO  lore: R.U.R., Čapek 1920: "robot" starts here', 'lore');
      }
      addLog(state, `INFO  lore: ${robot.spec.name} paid its respects (${rur.visited.length}/3)`, 'lore');
    }
  }
}

/** End-screen line; says nothing if the poster was never found, so the secret stays one. */
export function rurLine(rur) {
  if (rur.visited.length === 3) {
    return 'Easter egg: all three robots paid their respects to <b>R.U.R.</b> — Karel Čapek\'s 1920 play '
      + 'that gave the world the word "robot".';
  }
  if (rur.visited.length > 0) {
    return `Easter egg: ${rur.visited.length} of 3 robots found the <b>R.U.R.</b> poster in the foyer.`;
  }
  return '';
}
