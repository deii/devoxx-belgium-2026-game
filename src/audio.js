// Synthesised sound — the only audio file is the elevator music for Biggy's lift ride. Motors are
// continuous voices whose pitch and volume follow each robot's speed; everything else is a one-shot
// triggered by diffing the game state between frames, so the rest of the game does not need to know
// sound exists.

import { LIFT_RIDE_DURATION } from './travel.js';

const MASTER_VOLUME = 0.5;
const HEARING_RANGE = 22;            // m — robots further from the camera are silent
const BIGGY_STEP_LENGTH = 0.9;       // m, matches the footfall dust in effects.js
const IMPACT_THRESHOLD = 0.6;        // m/s
const CRATE_SCRAPE_THRESHOLD = 0.15; // m/s
const MOTOR_SMOOTHING = 0.05;        // s time constant for motor parameter changes
// "Local Forecast – Elevator" by Kevin MacLeod (incompetech.com), CC BY 4.0, trimmed to 24 s.
const LIFT_MUSIC_URL = 'assets/audio/local-forecast-elevator.mp3';
const LIFT_MUSIC_VOLUME = 0.7;
const LIFT_MUSIC_BACKGROUND_SHARE = 0.4; // volume share while another robot is selected
const LIFT_MUSIC_FADE = 0.4;             // s time constant of the fade-out after arrival
const LIFT_DING = [1319, 1047];          // Hz — the arrival chime
const WANDER_SMOOTHING = 1.5;        // 1/s — how quickly the pitch drifts towards a new random offset
const WANDER_INTERVAL = [0.4, 1.4];  // s between new random pitch offsets

// A motor is two slightly detuned oscillators (they beat against each other), a low-pass filter
// that opens with speed and strain, a pulse that follows the distance travelled (wheel turns,
// servo steps, footfalls), a noise layer for the surface, and a slow random pitch drift, so that
// even at a steady top speed the sound keeps moving.
//   pulse:  LFO shape, pulses per metre travelled, depth of the volume modulation
//   strain: extra pitch (Hz) and brightness while the motor pulls harder than the speed it has
//   turnHz: pitch change at full turn rate (servos whine up, Biggy's gearbox grinds down)
const MOTORS = {
  voxxy: {
    type: 'sawtooth', baseHz: 160, hzPerMps: 55, detuneCents: 14, filterHz: 1800, volume: 0.05,
    pulse: { type: 'triangle', perMetre: 2.5, depth: 0.35 }, strainHz: 45, turnHz: 70, wander: 0.025,
    surface: { hz: 3200, q: 1.2, volume: 0.025 },                    // tyre hiss
  },
  droid: {
    type: 'square', baseHz: 70, hzPerMps: 40, detuneCents: 22, filterHz: 700, volume: 0.045,
    pulse: { type: 'square', perMetre: 3, depth: 0.5 }, strainHz: 20, turnHz: 35, wander: 0.04,
    surface: { hz: 1300, q: 5, volume: 0.02 },                       // servo chatter
  },
  biggy: {
    type: 'sawtooth', baseHz: 38, hzPerMps: 18, detuneCents: 30, filterHz: 260, volume: 0.12,
    pulse: { type: 'sine', perMetre: 1 / BIGGY_STEP_LENGTH, depth: 0.6 }, strainHz: 10, turnHz: -8, wander: 0.05,
    surface: { hz: 170, q: 0.8, volume: 0.07 },                      // rumble through the floor
  },
};

export function createAudio() {
  let context = null;
  let master = null;
  let noise = null;
  let muted = false;
  const motors = {};
  let scrape = null;
  let lastUpdateTime = null;
  let liftMusic = null;                  // decoded AudioBuffer, loaded after the first key press
  let liftMusicVoice = null;
  const previous = {};

  /** Browsers only allow audio after a user gesture; call this from a key handler. */
  function unlock() {
    if (context) {
      context.resume();
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }
    context = new AudioContextClass();
    master = context.createGain();
    master.gain.value = muted ? 0 : MASTER_VOLUME;
    master.connect(context.destination);
    noise = createNoiseBuffer(context);
    for (const [type, spec] of Object.entries(MOTORS)) {
      motors[type] = createMotorVoice(context, master, noise, spec);
    }
    scrape = createScrapeVoice(context, master, noise);
    loadLiftMusic();
  }

  function loadLiftMusic() {
    fetch(LIFT_MUSIC_URL)
      .then(response => response.arrayBuffer())
      .then(data => context.decodeAudioData(data))
      .then(buffer => { liftMusic = buffer; })
      .catch(() => { /* no music then — the ride still whooshes */ });
  }

  function startLiftMusic(volume) {
    if (!liftMusic || liftMusicVoice) {
      return false;
    }
    const source = context.createBufferSource();
    source.buffer = liftMusic;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + 0.15);
    source.connect(gain);
    gain.connect(master);
    source.start();
    liftMusicVoice = { source, gain };
    return true;
  }

  function stopLiftMusic() {
    if (!liftMusicVoice) {
      return;
    }
    const now = context.currentTime;
    liftMusicVoice.gain.gain.setTargetAtTime(0, now, LIFT_MUSIC_FADE);
    liftMusicVoice.source.stop(now + LIFT_MUSIC_FADE * 6);
    liftMusicVoice = null;
  }

  function toggleMute() {
    muted = !muted;
    if (master) {
      master.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, context.currentTime, 0.02);
    }
    return muted;
  }

  function update(state) {
    if (!context) {
      return;
    }
    const now = context.currentTime;
    const dt = lastUpdateTime === null ? 0 : Math.min(0.1, now - lastUpdateTime);
    lastUpdateTime = now;
    const playing = state.phase === 'playing';

    for (const robot of state.robots) {
      const presence = playing ? proximity(state, robot) : 0;
      updateMotorVoice(motors[robot.type], MOTORS[robot.type], robot, presence, now, dt);

      if (robot.lastImpact > IMPACT_THRESHOLD && presence > 0) {
        thump(robot.lastImpact * robot.mass / 300 * presence, robot.type === 'biggy' ? 90 : 400);
      }
      if (robot.type === 'biggy') {
        const step = Math.floor(robot.stride / BIGGY_STEP_LENGTH);
        if (previous.biggyStep !== undefined && step !== previous.biggyStep && presence > 0) {
          thump(0.35 * presence, 70);
        }
        previous.biggyStep = step;
      }
    }

    const crateSpeed = Math.max(0, ...state.mission.crates.map(crate =>
      Math.hypot(crate.vx, crate.vy) * proximity(state, crate)));
    const scrapeLevel = playing && crateSpeed > CRATE_SCRAPE_THRESHOLD ? Math.min(1, crateSpeed) * 0.25 : 0;
    scrape.gain.gain.setTargetAtTime(scrapeLevel, now, 0.05);

    detectEvents(state);
  }

  function detectEvents(state) {
    const mission = state.mission;
    const bug = state.heisenbug;
    const changed = (key, value) => {
      const was = previous[key];
      previous[key] = value;
      return was !== undefined && was !== value;
    };

    if (changed('glitch', bug.active) && bug.active) {
      glitchZap();
    }
    if (changed('power', mission.power) && mission.power) {
      powerOn();
    }
    const rides = state.travel.rides;
    const ridesBefore = previous.rideCount ?? 0;
    previous.rideCount = rides.length;
    if (rides.length > ridesBefore) {
      const biggy = rides.find(ride => ride.robot.type === 'biggy');
      const active = state.robots[state.activeIndex];
      const volume = LIFT_MUSIC_VOLUME * (biggy?.robot === active ? 1 : LIFT_MUSIC_BACKGROUND_SHARE);
      if (!biggy || !startLiftMusic(volume)) {
        whoosh(LIFT_RIDE_DURATION, 180, 420);
      }
    } else if (rides.length < ridesBefore) {
      blip(LIFT_DING, 0.35);
    }
    if (!rides.some(ride => ride.robot.type === 'biggy') || state.phase !== 'playing') {
      stopLiftMusic();
    }
    if (changed('door', mission.doorOpen) && mission.doorOpen) {
      whoosh(1.2, 300, 1200);
    }
    if (changed('carrier', mission.adapter.carrier) && mission.adapter.carrier) {
      blip([880, 1320]);
    }
    if (changed('diagnostic', Boolean(bug.diagnostic)) && bug.diagnostic) {
      blip([660, 660, 660], 0.18);
    }
    if (changed('patched', bug.patched) && bug.patched) {
      blip([523, 659, 784, 1047], 0.09);
    }
    if (changed('wrongGuesses', bug.wrongGuesses)) {
      buzz();
    }
    if (changed('phase', state.phase)) {
      if (state.phase === 'won') {
        chord([261.6, 329.6, 392, 523.3], 2.5);
      } else if (state.phase === 'lost') {
        chord([98, 116.5, 146.8], 3);
      }
    }
  }

  function envelope(peak, attack, decay) {
    const gain = context.createGain();
    const now = context.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);
    gain.connect(master);
    return gain;
  }

  function thump(strength, cutoffHz) {
    const source = context.createBufferSource();
    source.buffer = noise;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoffHz;
    source.connect(filter);
    filter.connect(envelope(Math.min(0.9, strength), 0.005, 0.25));
    source.start();
    source.stop(context.currentTime + 0.3);
  }

  function glitchZap() {
    const oscillator = context.createOscillator();
    oscillator.type = 'square';
    const now = context.currentTime;
    oscillator.frequency.setValueAtTime(1400, now);
    oscillator.frequency.exponentialRampToValueAtTime(90, now + 0.25);
    oscillator.connect(envelope(0.12, 0.005, 0.25));
    oscillator.start();
    oscillator.stop(now + 0.3);
  }

  function powerOn() {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => thump(0.25, 3000), i * 110 + Math.random() * 80);
    }
    const hum = context.createOscillator();
    hum.frequency.value = 100;
    const now = context.currentTime;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 3);
    hum.connect(gain);
    gain.connect(master);
    hum.start();
    hum.stop(now + 3.1);
  }

  function whoosh(duration, fromHz, toHz) {
    const source = context.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    const now = context.currentTime;
    filter.frequency.setValueAtTime(fromHz, now);
    filter.frequency.exponentialRampToValueAtTime(toHz, now + duration);
    source.connect(filter);
    filter.connect(envelope(0.2, 0.1, duration));
    source.start();
    source.stop(now + duration + 0.2);
  }

  function blip(frequencies, spacing = 0.08) {
    frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = 'triangle';
      oscillator.frequency.value = frequency;
      const start = context.currentTime + index * spacing;
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.15, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(start);
      oscillator.stop(start + 0.15);
    });
  }

  function buzz() {
    const oscillator = context.createOscillator();
    oscillator.type = 'sawtooth';
    oscillator.frequency.value = 110;
    oscillator.connect(envelope(0.15, 0.01, 0.5));
    oscillator.start();
    oscillator.stop(context.currentTime + 0.55);
  }

  function chord(frequencies, duration) {
    for (const frequency of frequencies) {
      const oscillator = context.createOscillator();
      oscillator.type = 'triangle';
      oscillator.frequency.value = frequency;
      oscillator.connect(envelope(0.08, 0.05, duration));
      oscillator.start();
      oscillator.stop(context.currentTime + duration + 0.1);
    }
  }

  return { unlock, toggleMute, update };
}

function proximity(state, body) {
  const distance = Math.hypot(body.x - state.camera.x, body.y - state.camera.y);
  return Math.max(0, 1 - distance / HEARING_RANGE);
}

function createNoiseBuffer(context) {
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function createMotorVoice(context, destination, noiseBuffer, spec) {
  const oscillators = [-spec.detuneCents / 2, spec.detuneCents / 2].map(detune => {
    const oscillator = context.createOscillator();
    oscillator.type = spec.type;
    oscillator.frequency.value = spec.baseHz;
    oscillator.detune.value = detune;
    return oscillator;
  });
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = spec.filterHz;
  filter.Q.value = 2;
  const gain = context.createGain();
  gain.gain.value = 0;

  // The pulse modulates the volume around its current level: gain = level + level·depth·lfo.
  const pulse = context.createOscillator();
  pulse.type = spec.pulse.type;
  pulse.frequency.value = 0;
  const pulseDepth = context.createGain();
  pulseDepth.gain.value = 0;
  pulse.connect(pulseDepth);
  pulseDepth.connect(gain.gain);

  const surfaceSource = context.createBufferSource();
  surfaceSource.buffer = noiseBuffer;
  surfaceSource.loop = true;
  const surfaceFilter = context.createBiquadFilter();
  surfaceFilter.type = 'bandpass';
  surfaceFilter.frequency.value = spec.surface.hz;
  surfaceFilter.Q.value = spec.surface.q;
  const surfaceGain = context.createGain();
  surfaceGain.gain.value = 0;

  oscillators.forEach(oscillator => oscillator.connect(filter));
  filter.connect(gain);
  gain.connect(destination);
  surfaceSource.connect(surfaceFilter);
  surfaceFilter.connect(surfaceGain);
  surfaceGain.connect(destination);
  [...oscillators, pulse, surfaceSource].forEach(source => source.start());
  return { oscillators, filter, gain, pulse, pulseDepth, surfaceGain, wander: 0, wanderTarget: 0, nextWander: 0 };
}

function updateMotorVoice(voice, spec, robot, presence, now, dt) {
  const speed = Math.hypot(robot.vx, robot.vy);
  const topSpeed = robot.spec.driveForce / (robot.spec.mass * robot.spec.drag);
  const speedShare = Math.min(1, speed / topSpeed);
  const strain = Math.max(0, robot.throttle - speedShare);        // pulling harder than it moves
  const turn = Math.min(1, Math.abs(robot.angularVelocity) / robot.spec.maxTurnRate);

  voice.nextWander -= dt;
  if (voice.nextWander <= 0) {
    voice.wanderTarget = (Math.random() * 2 - 1) * spec.wander;
    voice.nextWander = WANDER_INTERVAL[0] + Math.random() * (WANDER_INTERVAL[1] - WANDER_INTERVAL[0]);
  }
  voice.wander += (voice.wanderTarget - voice.wander) * (1 - Math.exp(-WANDER_SMOOTHING * dt));

  const pitch = (spec.baseHz + speed * spec.hzPerMps + strain * spec.strainHz + turn * spec.turnHz) * (1 + voice.wander);
  voice.oscillators.forEach(oscillator => oscillator.frequency.setTargetAtTime(pitch, now, MOTOR_SMOOTHING));
  voice.filter.frequency.setTargetAtTime(spec.filterHz * (0.6 + 0.7 * speedShare + 0.8 * strain), now, MOTOR_SMOOTHING);

  const level = spec.volume * Math.min(1, speed) * (0.8 + 0.4 * strain) * presence;
  voice.gain.gain.setTargetAtTime(level, now, MOTOR_SMOOTHING);
  voice.pulse.frequency.setTargetAtTime(speed * spec.pulse.perMetre, now, MOTOR_SMOOTHING);
  voice.pulseDepth.gain.setTargetAtTime(level * spec.pulse.depth, now, MOTOR_SMOOTHING);
  voice.surfaceGain.gain.setTargetAtTime(spec.surface.volume * speedShare * presence, now, MOTOR_SMOOTHING);
}

function createScrapeVoice(context, destination, noiseBuffer) {
  const source = context.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;
  const filter = context.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 450;
  filter.Q.value = 2;
  const gain = context.createGain();
  gain.gain.value = 0;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start();
  return { gain };
}
