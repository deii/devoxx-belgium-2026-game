// Touch controls for tablets and phones: a floating stick on the left half of the screen, buttons on
// the right, tap a portrait to switch robots, tap the panel to start. Nothing here drives the game
// directly — the stick feeds input.setStick() and every button queues the key press it stands for,
// so main.js handles touch and keyboard the same way.

const STICK_RADIUS = 60;       // px the thumb travels for full throttle
const STICK_DEAD_ZONE = 0.12;  // fraction of the radius that still means "no input"

const BUTTONS = [
  { code: 'KeyE', label: 'E', title: 'Interact', className: 'act' },
  { code: 'KeyR', label: '⟲', title: 'Restart (tap twice)' },
  { code: 'Equal', label: '+', title: 'Zoom in' },
  { code: 'Minus', label: '−', title: 'Zoom out' },
  { code: 'KeyM', label: '♪', title: 'Sound on/off' },
];

/**
 * Adds the touch layer to the HUD. It shows only on touch screens: on a coarse pointer at load,
 * or from the first touch on a hybrid device. onGesture runs inside every touch, which is where
 * browsers allow audio to start.
 */
export function createTouchControls(root, input, onGesture) {
  const layer = document.createElement('div');
  layer.className = 'touch-layer';
  layer.innerHTML = `
    <div class="stick-zone"><div class="stick-base"><div class="stick-knob"></div></div></div>
    <div class="touch-buttons">${BUTTONS.map(button =>
      `<button class="${button.className ?? ''}" data-code="${button.code}" aria-label="${button.title}">${button.label}</button>`).join('')}
    </div>`;
  root.insertBefore(layer, root.querySelector('.screen'));

  if (window.matchMedia('(pointer: coarse)').matches) {
    enableTouchMode();
  }
  window.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') {
      enableTouchMode();
      onGesture();
    }
  }, { capture: true });

  attachStick(layer.querySelector('.stick-zone'), input);

  layer.querySelectorAll('.touch-buttons button').forEach(button => {
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      input.press(button.dataset.code);
    });
  });

  root.querySelectorAll('.roster .robot').forEach((card, index) => {
    card.addEventListener('pointerdown', () => input.press(`Digit${index + 1}`));
  });

  // "Tap to start" / "Tap to play again" on the title and end screens. The panel is rebuilt with
  // every screen, so the listener sits on the HUD root.
  root.addEventListener('click', event => {
    if (event.target.closest('.start')) {
      input.press('Enter');
    }
  });
}

function enableTouchMode() {
  document.body.classList.add('touch');
}

function attachStick(zone, input) {
  const base = zone.querySelector('.stick-base');
  const knob = zone.querySelector('.stick-knob');
  let pointerId = null;
  let origin = null;

  zone.addEventListener('pointerdown', event => {
    if (pointerId !== null) {
      return;
    }
    pointerId = event.pointerId;
    zone.setPointerCapture(pointerId);
    origin = { x: event.clientX, y: event.clientY };
    base.style.left = `${origin.x}px`;
    base.style.top = `${origin.y}px`;
    base.classList.add('visible');
    moveKnob(0, 0);
  });

  zone.addEventListener('pointermove', event => {
    if (event.pointerId !== pointerId) {
      return;
    }
    let dx = event.clientX - origin.x;
    let dy = event.clientY - origin.y;
    const distance = Math.hypot(dx, dy);
    if (distance > STICK_RADIUS) {
      dx *= STICK_RADIUS / distance;
      dy *= STICK_RADIUS / distance;
    }
    moveKnob(dx, dy);
    const magnitude = Math.min(distance, STICK_RADIUS) / STICK_RADIUS;
    input.setStick(magnitude < STICK_DEAD_ZONE ? { x: 0, y: 0 } : { x: dx / STICK_RADIUS, y: dy / STICK_RADIUS });
  });

  const release = event => {
    if (event.pointerId !== pointerId) {
      return;
    }
    pointerId = null;
    base.classList.remove('visible');
    input.setStick({ x: 0, y: 0 });
  };
  zone.addEventListener('pointerup', release);
  zone.addEventListener('pointercancel', release);

  function moveKnob(dx, dy) {
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }
}
