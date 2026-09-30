// Keyboard input: held keys for movement, a queue of fresh presses for one-shot actions.

const MOVE_KEYS = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};
const GAME_KEYS = new Set([...Object.keys(MOVE_KEYS), 'Tab', 'Space', 'KeyE', 'Digit1', 'Digit2', 'Digit3']);

export function createInput(target = window) {
  const held = new Set();
  const presses = [];

  target.addEventListener('keydown', event => {
    if (GAME_KEYS.has(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) {
      presses.push(event.code);
    }
    held.add(event.code);
  });
  target.addEventListener('keyup', event => held.delete(event.code));
  target.addEventListener('blur', () => held.clear());

  return {
    /** Requested direction in world space (screen up is -y), length 0 or 1. */
    moveVector() {
      let x = 0;
      let y = 0;
      for (const code of held) {
        const direction = MOVE_KEYS[code];
        if (direction) {
          x += direction[0];
          y += direction[1];
        }
      }
      const length = Math.hypot(x, y);
      return length > 0 ? { x: x / length, y: y / length } : { x: 0, y: 0 };
    },
    isHeld(code) {
      return held.has(code);
    },
    /** Key presses since the last call (each press reported once). */
    consumePresses() {
      return presses.splice(0);
    },
  };
}
