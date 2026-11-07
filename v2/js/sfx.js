/**
 * Zero-file retro CRT synthesizer + mobile haptics.
 * Uses Web Audio API & navigator.vibrate (100% static, offline-safe).
 */
window.SFX = (function () {
  const MUTE_KEY = "taharoot-v2-muted";
  let ctx = null;
  let noiseBuffer = null;
  let lastTickAt = 0;
  let muted = false;

  try {
    muted = localStorage.getItem(MUTE_KEY) === "1";
  } catch (e) {}

  function ensureCtx() {
    if (muted) return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctx) {
      try {
        ctx = new AudioCtx();
      } catch (e) {
        return null;
      }
    }
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function anyVideoPlaying() {
    const videos = document.querySelectorAll("video");
    for (let i = 0; i < videos.length; i++) {
      const v = videos[i];
      if (!v.paused && !v.ended && v.currentTime > 0) return true;
    }
    return false;
  }

  function vibrate(pattern) {
    if (muted) return;
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (e) {}
  }

  function tone(freq, duration, type, volume, delaySec, endFreq) {
    const c = ensureCtx();
    if (!c) return;
    const start = c.currentTime + (delaySec || 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), start + duration);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume || 0.04, start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(start);
    osc.stop(start + duration + 0.01);
  }

  function getNoiseBuffer(c) {
    if (noiseBuffer) return noiseBuffer;
    const len = Math.floor(c.sampleRate * 0.18);
    noiseBuffer = c.createBuffer(1, len, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return noiseBuffer;
  }

  let cachedVoices = [];
  if ("speechSynthesis" in window) {
    const loadVoices = () => {
      try {
        cachedVoices = window.speechSynthesis.getVoices() || [];
      } catch (e) {}
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    }
  }

  function pickHebrewVoice() {
    if (!cachedVoices.length && "speechSynthesis" in window) {
      try {
        cachedVoices = window.speechSynthesis.getVoices() || [];
      } catch (e) {}
    }
    return (
      cachedVoices.find((v) => v.lang && /^(he|iw)(-|$)/i.test(v.lang)) ||
      cachedVoices.find((v) => v.lang && v.lang.toLowerCase().includes("he")) ||
      null
    );
  }

  function cancelSpeech() {
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
  }

  return {
    unlockAudio: function () {
      ensureCtx();
    },

    isMuted: function () {
      return muted;
    },

    setMuted: function (val) {
      muted = Boolean(val);
      if (muted) cancelSpeech();
      try {
        localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
      } catch (e) {}
      return muted;
    },

    toggleMute: function () {
      const next = !muted;
      this.setMuted(next);
      if (!next) this.click();
      return next;
    },

    tick: function () {
      if (muted || anyVideoPlaying()) return;
      const now = performance.now();
      if (now - lastTickAt < 44) return;
      lastTickAt = now;
      tone(920 + Math.random() * 180, 0.014, "triangle", 0.018);
    },

    click: function () {
      if (muted || anyVideoPlaying()) return;
      tone(660, 0.024, "triangle", 0.028, 0, 420);
    },

    scanBlip: function (ratio) {
      if (muted || anyVideoPlaying()) return;
      const r = Math.max(0, Math.min(1, ratio || 0));
      tone(380 + r * 480, 0.032, "sine", 0.025);
    },

    correct: function () {
      vibrate(25);
      if (muted) return;
      tone(587.33, 0.09, "triangle", 0.05, 0);
      tone(880, 0.16, "triangle", 0.055, 0.08);
    },

    wrong: function () {
      vibrate([55, 35, 75]);
      if (muted) return;
      tone(150, 0.22, "sawtooth", 0.045, 0, 115);
      tone(142, 0.22, "sawtooth", 0.035, 0.02, 108);
    },

    unlock: function () {
      vibrate([35, 25, 35, 25, 95]);
      if (muted) return;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((n, i) => tone(n, 0.14, "triangle", 0.055, i * 0.075));
    },

    alert: function () {
      vibrate([70, 45, 70]);
      if (muted) return;
      tone(960, 0.09, "square", 0.035, 0);
      tone(960, 0.12, "square", 0.038, 0.13);
    },

    ring: function () {
      vibrate([180, 90, 180]);
      if (muted) return;
      // Dual-tone encrypted military phone ring
      [0, 0.06, 0.12, 0.18].forEach((d) => {
        tone(740, 0.045, "sine", 0.045, d);
        tone(932, 0.045, "sine", 0.035, d + 0.025);
      });
      [0.36, 0.42, 0.48, 0.54].forEach((d) => {
        tone(740, 0.045, "sine", 0.045, d);
        tone(932, 0.045, "sine", 0.035, d + 0.025);
      });
    },

    radioSquelch: function () {
      const c = ensureCtx();
      if (!c) return;
      const src = c.createBufferSource();
      src.buffer = getNoiseBuffer(c);
      const filter = c.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1600, c.currentTime);
      filter.Q.setValueAtTime(2.2, c.currentTime);
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.06, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.12);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);
      src.start(c.currentTime);
      src.stop(c.currentTime + 0.13);
      tone(1240, 0.05, "sine", 0.03, 0.02);
    },

    speakHebrew: function (text, opts) {
      const callbacks = opts || {};
      cancelSpeech();
      if (muted || !("speechSynthesis" in window)) {
        if (callbacks.onEnd) callbacks.onEnd();
        return false;
      }
      try {
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "he-IL";
        const heVoice = pickHebrewVoice();
        if (heVoice) utter.voice = heVoice;
        // Slightly lowered pitch for disguised informant voice
        utter.pitch = 0.78;
        utter.rate = 0.96;
        utter.volume = 1;
        utter.onstart = () => {
          if (callbacks.onStart) callbacks.onStart();
        };
        utter.onend = () => {
          if (callbacks.onEnd) callbacks.onEnd();
        };
        utter.onerror = () => {
          if (callbacks.onEnd) callbacks.onEnd();
        };
        window.speechSynthesis.speak(utter);
        return true;
      } catch (e) {
        if (callbacks.onEnd) callbacks.onEnd();
        return false;
      }
    },

    stopSpeech: cancelSpeech,

    stamp: function () {
      vibrate([110, 45, 65]);
      const c = ensureCtx();
      if (!c) return;
      tone(135, 0.19, "sine", 0.14, 0, 36);
      const src = c.createBufferSource();
      src.buffer = getNoiseBuffer(c);
      const filter = c.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(900, c.currentTime);
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.09, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.14);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);
      src.start(c.currentTime);
      src.stop(c.currentTime + 0.15);
    },
  };
})();

