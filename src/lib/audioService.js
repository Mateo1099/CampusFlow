let audioCtx = null;
let currentOscillator = null;
let currentGain = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

export const resumeAudio = () => {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  } else if (!audioCtx) {
    initAudio();
  }
};

export const playClick = (freq = 800) => {
  const ctx = initAudio();
  
  // Detener sonido anterior si existe (Sistema de un solo canal)
  if (currentOscillator) {
    try {
      currentOscillator.stop();
      currentOscillator.disconnect();
    } catch (e) {
      // Ya estaba detenido
    }
  }

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  
  gain.gain.setValueAtTime(0.05, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.05);
  
  currentOscillator = osc;
  currentGain = gain;
};

// Campana de fin de fase (Pomodoro): 3 tonos ascendentes con envolvente de
// campana real (ataque rápido, decaimiento exponencial largo). Sintetizada
// con Web Audio API en vez de un mp3 para no sumar más peso a los archivos
// de audio ya servidos desde /public/sounds.
export const playPhaseCompleteChime = () => {
  const ctx = initAudio();

  if (currentOscillator) {
    try {
      currentOscillator.stop();
      currentOscillator.disconnect();
    } catch (e) {
      // Ya estaba detenido
    }
  }

  const notes = [880, 1108.73, 1318.51]; // A5, C#6, E6 — acorde mayor brillante
  const noteDuration = 0.9;
  const noteStagger = 0.16;

  notes.forEach((freq, index) => {
    const startTime = ctx.currentTime + index * noteStagger;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.22, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + noteDuration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + noteDuration + 0.05);

    if (index === notes.length - 1) {
      currentOscillator = osc;
    }
  });
};

export const playDropSound = () => {
  const ctx = initAudio();
  
  if (currentOscillator) {
    try {
      currentOscillator.stop();
      currentOscillator.disconnect();
    } catch (e) {}
  }

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
  
  const bufferSize = ctx.sampleRate * 0.05;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(400, ctx.currentTime);
  
  noiseGain.gain.setValueAtTime(0.02, ctx.currentTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.1);
  noise.start();
  noise.stop(ctx.currentTime + 0.1);
  
  currentOscillator = osc;
};
