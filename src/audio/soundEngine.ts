class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxVolume = 0.7;
  private crowdVolume = 0.45;
  private enabled = true;
  private crowdGain: GainNode | null = null;
  private crowdNoiseSource: AudioBufferSourceNode | null = null;
  private crowdFilter: BiquadFilterNode | null = null;

  private ensureContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setSoundEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopCrowdAmbience();
    }
  }

  public setVolumes(sfx: number, crowd: number) {
    this.sfxVolume = Math.max(0, Math.min(1, sfx));
    this.crowdVolume = Math.max(0, Math.min(1, crowd));
    if (this.crowdGain && this.ctx) {
      this.crowdGain.gain.setTargetAtTime(this.crowdVolume * 0.14, this.ctx.currentTime, 0.2);
    }
  }

  public startCrowdAmbience() {
    const ctx = this.ensureContext();
    if (!ctx || this.crowdNoiseSource) return;

    const bufferSize = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.03 * white) / 1.03;
      lastOut = data[i];
      data[i] *= 2.5;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 420;
    filter.Q.value = 0.7;

    const gain = ctx.createGain();
    gain.gain.value = this.crowdVolume * 0.14;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();

    this.crowdNoiseSource = noise;
    this.crowdFilter = filter;
    this.crowdGain = gain;
  }

  public stopCrowdAmbience() {
    if (this.crowdNoiseSource) {
      try {
        this.crowdNoiseSource.stop();
        this.crowdNoiseSource.disconnect();
      } catch {}
      this.crowdNoiseSource = null;
    }
    this.crowdGain = null;
    this.crowdFilter = null;
  }

  public modulateCrowdExcitement(level: number) {
    if (!this.ctx || !this.crowdGain || !this.crowdFilter) return;
    const clamped = Math.max(0, Math.min(1, level));
    this.crowdGain.gain.setTargetAtTime(this.crowdVolume * (0.12 + clamped * 0.28), this.ctx.currentTime, 0.25);
    this.crowdFilter.frequency.setTargetAtTime(380 + clamped * 520, this.ctx.currentTime, 0.25);
  }

  public playKick(power = 0.6) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140 + power * 70, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.11);

    gain.gain.setValueAtTime(this.sfxVolume * (0.35 + power * 0.4), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playWhistle(kind: 'short' | 'long' | 'double' = 'short') {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const blow = (startOffset: number, dur: number) => {
      const now = ctx.currentTime + startOffset;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const master = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(2820, now);
      osc2.frequency.setValueAtTime(2950, now);

      lfo.frequency.value = 38;
      lfoGain.gain.value = 65;
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);

      master.gain.setValueAtTime(0.001, now);
      master.gain.linearRampToValueAtTime(this.sfxVolume * 0.22, now + 0.02);
      master.gain.setValueAtTime(this.sfxVolume * 0.22, now + dur - 0.04);
      master.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc1.connect(master);
      osc2.connect(master);
      master.connect(ctx.destination);

      lfo.start(now);
      osc1.start(now);
      osc2.start(now);
      lfo.stop(now + dur);
      osc1.stop(now + dur);
      osc2.stop(now + dur);
    };

    if (kind === 'short') blow(0, 0.22);
    else if (kind === 'long') blow(0, 0.55);
    else {
      blow(0, 0.18);
      blow(0.24, 0.32);
    }
  }

  public playPostHit() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(290, now + 0.25);
    gain.gain.setValueAtTime(this.sfxVolume * 0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playGoalNet() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.18);
    gain.gain.setValueAtTime(this.sfxVolume * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  public playGoalCelebration() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.modulateCrowdExcitement(1);
    setTimeout(() => this.modulateCrowdExcitement(0.25), 2400);

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const now = ctx.currentTime + i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(this.sfxVolume * 0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    });
  }

  public playUiClick() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.045);
    gain.gain.setValueAtTime(this.sfxVolume * 0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }
}

export const soundEngine = new SoundEngine();
