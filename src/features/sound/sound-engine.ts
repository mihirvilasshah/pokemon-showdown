type Sfx = "select" | "hit" | "super" | "resist" | "crit" | "miss" | "faint" | "victory" | "start" | "heal" | "status";

/**
 * Procedural audio built with the Web Audio API: no copyrighted samples, no downloads.
 * Audio is only created after the user explicitly unmutes (a user gesture).
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicNodes: { stop: () => void } | null = null;
  sfxEnabled = false;
  musicEnabled = false;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  setSfx(on: boolean) {
    this.sfxEnabled = on;
  }

  /** Must be called from a user gesture handler to allow audio output. */
  unlock() {
    this.ensure();
  }

  setMusic(on: boolean) {
    this.musicEnabled = on;
    if (!on) {
      this.musicNodes?.stop();
      this.musicNodes = null;
      return;
    }
    if (this.musicNodes) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 2);
    gain.connect(this.master);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    filter.connect(gain);
    // Slow ambient pad: A minor add9 drone.
    const oscs = [110, 164.81, 220, 329.63].map((f, i) => {
      const o = ctx.createOscillator();
      o.type = i % 2 ? "triangle" : "sine";
      o.frequency.value = f;
      o.detune.value = (i - 1.5) * 6;
      o.connect(filter);
      o.start();
      return o;
    });
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 300;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    this.musicNodes = {
      stop: () => {
        const t = ctx.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        setTimeout(() => {
          oscs.forEach((o) => o.stop());
          lfo.stop();
          gain.disconnect();
        }, 700);
      },
    };
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, slideTo?: number) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol: number, delay = 0) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(g);
    g.connect(this.master);
    src.start(ctx.currentTime + delay);
  }

  play(kind: Sfx) {
    if (!this.sfxEnabled) return;
    switch (kind) {
      case "select":
        this.tone(660, 0.08, "triangle", 0.2);
        break;
      case "start":
        this.tone(220, 0.5, "sawtooth", 0.15, 0, 440);
        this.tone(330, 0.5, "triangle", 0.15, 0.1, 660);
        break;
      case "hit":
        this.noise(0.12, 0.35);
        this.tone(180, 0.15, "square", 0.2, 0, 70);
        break;
      case "super":
        this.noise(0.18, 0.45);
        this.tone(260, 0.25, "sawtooth", 0.25, 0, 90);
        this.tone(520, 0.2, "triangle", 0.18, 0.05);
        break;
      case "resist":
        this.noise(0.08, 0.15);
        this.tone(120, 0.18, "sine", 0.18);
        break;
      case "crit":
        this.noise(0.22, 0.5);
        this.tone(880, 0.2, "square", 0.2, 0, 220);
        this.tone(1175, 0.15, "triangle", 0.15, 0.06);
        break;
      case "miss":
        this.tone(400, 0.2, "sine", 0.12, 0, 150);
        break;
      case "heal":
        this.tone(523, 0.12, "sine", 0.18);
        this.tone(784, 0.18, "sine", 0.18, 0.1);
        break;
      case "status":
        this.tone(300, 0.25, "sawtooth", 0.12, 0, 200);
        break;
      case "faint":
        this.tone(440, 0.7, "triangle", 0.25, 0, 70);
        break;
      case "victory":
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.28, "triangle", 0.22, i * 0.14));
        break;
    }
  }
}

export const sound = new SoundEngine();
export type { Sfx };
