let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine", vol = 0.15) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

export function playGameStart() {
  playTone(523, 0.15, "square", 0.1);
  setTimeout(() => playTone(659, 0.15, "square", 0.1), 120);
  setTimeout(() => playTone(784, 0.25, "square", 0.12), 240);
}

export function playTurnSound() {
  playTone(880, 0.1, "sine", 0.08);
  setTimeout(() => playTone(1100, 0.12, "sine", 0.1), 80);
}

export function playWinSound() {
  playTone(523, 0.12, "square", 0.1);
  setTimeout(() => playTone(659, 0.12, "square", 0.1), 100);
  setTimeout(() => playTone(784, 0.12, "square", 0.1), 200);
  setTimeout(() => playTone(1047, 0.3, "square", 0.15), 300);
}

export function playDiceSound() {
  playTone(200, 0.08, "triangle", 0.12);
  setTimeout(() => playTone(300, 0.08, "triangle", 0.12), 60);
  setTimeout(() => playTone(400, 0.1, "triangle", 0.1), 120);
}

export function playSpinSound() {
  playTone(600, 0.06, "sine", 0.06);
}

export function playSpinStop() {
  playTone(440, 0.15, "square", 0.1);
  setTimeout(() => playTone(660, 0.2, "square", 0.12), 100);
  setTimeout(() => playTone(880, 0.3, "square", 0.15), 200);
}
