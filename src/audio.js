// Synthesised sound — no audio files. Motors are continuous voices whose pitch and volume follow
// each robot's speed; everything else is a one-shot triggered by diffing the game state between
// frames, so the rest of the game does not need to know sound exists.

const MASTER_VOLUME = 0.5;
const HEARING_RANGE = 22;            // m — robots further from the camera are silent
const BIGGY_STEP_LENGTH = 0.9;       // m, matches the footfall dust in effects.js
const IMPACT_THRESHOLD = 0.6;        // m/s
const CRATE_SCRAPE_THRESHOLD = 0.15; // m/s
const MOTOR_SMOOTHING = 0.05;        // s time constant for motor parameter changes

const MOTORS = {
  voxxy: { type: 'sawtooth', baseHz: 160, hzPerMps: 55, filterHz: 1800, volume: 0.05 },
  droid: { type: 'square', baseHz: 70, hzPerMps: 40, filterHz: 700, volume: 0.045 },
  biggy: { type: 'sawtooth', baseHz: 38, hzPerMps: 18, filterHz: 260, volume: 0.12 },
};

export function createAudio() {
  let context = null;
  let master = null;
  let noise = null;
  let muted = false;
  const motors = {};
  let scrape = null;
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
      motors[type] = createMotorVoice(context, master, spec);
    }
    scrape = createScrapeVoice(context, master, noise);
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
    const playing = state.phase === 'playing';

    for (const robot of state.robots) {
      const spec = MOTORS[robot.type];
      const speed = Math.hypot(robot.vx, robot.vy);
      const presence = playing ? proximity(state, robot) : 0;
      const voice = motors[robot.type];
      voice.oscillator.frequency.setTargetAtTime(spec.baseHz + speed * spec.hzPerMps, now, MOTOR_SMOOTHING);
      voice.gain.gain.setTargetAtTime(spec.volume * Math.min(1, speed) * presence, now, MOTOR_SMOOTHING);

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

function createMotorVoice(context, destination, spec) {
  const oscillator = context.createOscillator();
  oscillator.type = spec.type;
  oscillator.frequency.value = spec.baseHz;
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = spec.filterHz;
  const gain = context.createGain();
  gain.gain.value = 0;
  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  oscillator.start();
  return { oscillator, gain };
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
