// ─────────────────────────────────────
// Audio
// ─────────────────────────────────────
import * as state from "./state.js";

export function initAudio() {
  if (!state.audioCtx) {
    try { state.setAudioCtx(new (window.AudioContext || window.webkitAudioContext)()); } catch(e) {}
  }
}

export function playTone(freq, endFreq, type, dur, gainVal) {
  if (state.muted || !state.audioCtx) return;
  const audioCtx = state.audioCtx;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(endFreq, audioCtx.currentTime + dur);
  gain.gain.setValueAtTime(gainVal * state.volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  osc.start(); osc.stop(audioCtx.currentTime + dur);
}

export function playClickSound()       { playTone(160, 100, "square",   0.07, 0.12); }
export function playBuySound()         { playTone(220, 280, "triangle", 0.10, 0.18); }
export function playKillSound()        { playTone(280, 420, "triangle", 0.14, 0.22); setTimeout(() => playTone(420, 560, "triangle", 0.12, 0.2), 90); }
export function playAchievementSound() { playTone(880, 880, "sine", 0.18, 0.25); setTimeout(() => playTone(1100,1100,"sine",0.25,0.25), 100); }
export function playBossKillSound()    { [262,330,392,523].forEach((f,i) => setTimeout(() => playTone(f, f*1.5, "square", 0.28, 0.32), i*100)); }
export function playAscendSound()      { [523,659,784,1047].forEach((f,i) => setTimeout(() => playTone(f, f, "sine", 0.45, 0.38), i*160)); }

export function toggleMute() {
  state.setMuted(!state.muted);
  document.getElementById("mute-btn").textContent = state.muted ? "🔇" : "🔊";
  localStorage.setItem("muted", state.muted ? "1" : "0");
}

export function setVolumeLevel(v) {
  const vol = Math.max(0, Math.min(1, Number(v)));
  state.setVolume(vol);
  localStorage.setItem("volume", vol);
}
