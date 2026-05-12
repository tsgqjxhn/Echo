// ============================================================
// HeroAudio - Web Audio API Sound Engine
// All sounds procedurally generated - zero external audio files.
// ============================================================

const HeroAudio = {
  ctx: null,
  masterVolume: 0.35,
  bgmOscillators: [],
  bgmGain: null,
  bgmInterval: null,
  sfxEnabled: true,
  bgmEnabled: true,
  currentBGM: null,

  init() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.warn('Web Audio API not supported');
        return false;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return true;
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  // ===== Internal synthesis helpers =====

  _tone(freq, duration, volume, type, detune) {
    if (!this.sfxEnabled || !this.init()) return;
    const g = this.ctx.createGain();
    const o = this.ctx.createOscillator();
    o.type = type || 'sine';
    o.frequency.value = freq;
    if (detune) o.detune.value = detune;
    const vol = (volume || 0.15) * this.masterVolume;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (duration || 0.15));
    o.connect(g); g.connect(this.ctx.destination);
    o.start(); o.stop(this.ctx.currentTime + (duration || 0.15));
  },

  _noiseBurst(duration, volume, filterFreq, filterType) {
    if (!this.sfxEnabled || !this.init()) return;
    const sz = this.ctx.sampleRate * (duration || 0.1);
    const buf = this.ctx.createBuffer(1, sz, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < sz; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
    const s = this.ctx.createBufferSource(); s.buffer = buf;
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = filterType || 'bandpass';
    f.frequency.value = filterFreq || 1000;
    const vol = (volume || 0.1) * this.masterVolume;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (duration || 0.1));
    s.connect(f); f.connect(g); g.connect(this.ctx.destination);
    s.start();
  },

  _sweep(fromFreq, toFreq, duration, volume, type) {
    if (!this.sfxEnabled || !this.init()) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(fromFreq, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(toFreq, this.ctx.currentTime + duration);
    const vol = (volume || 0.12) * this.masterVolume;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(); o.stop(this.ctx.currentTime + duration);
  },

  _chime(freqs, duration, volume) {
    if (!this.sfxEnabled || !this.init()) return;
    freqs.forEach((f, i) => {
      setTimeout(() => this._tone(f, duration, volume, 'sine'), i * 80);
    });
  },

  _drumHit(freq, decay, volume, noiseAmt) {
    if (!this.sfxEnabled || !this.init()) return;
    // Tone component
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(volume * this.masterVolume, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + decay);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(); o.stop(this.ctx.currentTime + decay);
    // Noise component
    if (noiseAmt > 0) {
      this._noiseBurst(decay * 0.5, volume * noiseAmt, freq * 3, 'highpass');
    }
  },

  // ===== 6 Attack type SFX =====

  playAttackSword() {
    // Sword: metal slash - noise sweep + low tone
    this._noiseBurst(0.12, 0.18, 1200, 'highpass');
    this._sweep(800, 300, 0.1, 0.08, 'sawtooth');
  },

  playAttackBow() {
    // Bow: string snap + arrow whistle
    this._tone(600, 0.04, 0.1, 'sine');
    setTimeout(() => this._noiseBurst(0.08, 0.06, 2500, 'highpass'), 30);
    setTimeout(() => this._sweep(2000, 800, 0.12, 0.06, 'sine'), 40);
  },

  playAttackMagic() {
    // Magic: energy buildup + release
    this._sweep(400, 1600, 0.25, 0.12, 'sine');
    setTimeout(() => this._tone(2000, 0.2, 0.08, 'sine', 30), 100);
    this._noiseBurst(0.15, 0.06, 2000, 'highpass');
  },

  playAttackSpear() {
    // Spear: sharp piercing sound
    this._noiseBurst(0.1, 0.12, 800, 'bandpass');
    this._sweep(600, 1200, 0.08, 0.1, 'sine');
    this._tone(200, 0.06, 0.08, 'triangle');
  },

  playAttackDagger() {
    // Dagger: rapid triple slash
    this._tone(1200, 0.03, 0.08, 'sine');
    setTimeout(() => this._tone(1400, 0.03, 0.08, 'sine'), 60);
    setTimeout(() => this._tone(1000, 0.03, 0.08, 'sine'), 120);
    this._noiseBurst(0.06, 0.06, 2000, 'highpass');
  },

  playAttackStaff() {
    // Staff: heavy blunt thud
    this._drumHit(80, 0.25, 0.18, 0.3);
    this._noiseBurst(0.2, 0.12, 200, 'lowpass');
  },

  playAttack(weaponKey) {
    switch (weaponKey) {
      case 'sword': this.playAttackSword(); break;
      case 'bow': this.playAttackBow(); break;
      case 'staff': this.playAttackMagic(); break;
      case 'crossbow': this.playAttackBow(); break;
      case 'dagger': this.playAttackDagger(); break;
      case 'spear': this.playAttackSpear(); break;
      default: this.playAttackSword(); break;
    }
  },

  // ===== Combat SFX =====

  playHitPlayer() {
    // Player hurt: heavy thud + pain tone
    this._drumHit(120, 0.18, 0.15, 0.4);
    this._sweep(350, 150, 0.2, 0.1, 'sawtooth');
  },

  playEnemyDeath() {
    // Enemy death: burst + descending tone
    this._noiseBurst(0.18, 0.12, 600, 'bandpass');
    this._sweep(800, 200, 0.3, 0.08, 'square');
  },

  playBossEntrance() {
    // Boss entrance: dramatic drum beats
    const beats = [60, 50, 45, 35];
    beats.forEach((f, i) => {
      setTimeout(() => {
        this._drumHit(f, 0.6 + i * 0.1, 0.25, 0.5);
        this._noiseBurst(0.4, 0.15, 150, 'lowpass');
      }, i * 450);
    });
  },

  playLevelUp() {
    // Level up: ascending bright scale
    this._chime([523, 659, 784, 1047], 0.2, 0.12);
  },

  playPickup() {
    // Pickup: crisp bell
    this._tone(1500, 0.05, 0.1, 'sine');
    setTimeout(() => this._tone(2000, 0.06, 0.07, 'sine'), 50);
  },

  playSkillCast() {
    // Skill: energy charge + release
    this._sweep(200, 1500, 0.5, 0.15, 'sine');
    setTimeout(() => {
      this._noiseBurst(0.3, 0.1, 1200, 'highpass');
      this._chime([880, 1100, 1320], 0.2, 0.1);
    }, 400);
  },

  playBuildComplete() {
    // Build complete: hammer + chime
    this._drumHit(500, 0.06, 0.15, 0);
    setTimeout(() => this._drumHit(800, 0.08, 0.12, 0), 100);
    setTimeout(() => this._chime([523, 659, 784], 0.3, 0.1), 200);
  },

  playGachaReveal() {
    // Gacha reveal: tension sweep → reveal chord
    this._sweep(400, 1200, 1.0, 0.08, 'sine');
    setTimeout(() => {
      this._chime([523, 659, 784, 1047], 0.4, 0.12);
      this._noiseBurst(0.3, 0.08, 2000, 'highpass');
    }, 1000);
  },

  playPuzzleSuccess() {
    // Puzzle success: cheerful melody
    this._chime([523, 659, 784, 1047, 784, 1047], 0.25, 0.1);
  },

  playPuzzleFail() {
    // Puzzle fail: discordant low tones
    this._tone(200, 0.3, 0.1, 'sawtooth');
    setTimeout(() => this._tone(180, 0.3, 0.1, 'sawtooth'), 100);
    setTimeout(() => this._tone(160, 0.4, 0.08, 'square'), 250);
  },

  playCritHit() {
    // Critical hit: sharp impact + high shimmer
    this._drumHit(300, 0.12, 0.15, 0.2);
    this._tone(600, 0.08, 0.1, 'square');
    this._noiseBurst(0.1, 0.1, 1500, 'highpass');
  },

  playVictory() {
    // Victory: triumphant fanfare
    this._chime([523, 659, 784, 1047], 0.3, 0.12);
    setTimeout(() => this._chime([1047, 784, 1047], 0.4, 0.12), 500);
  },

  playGameOver() {
    // Game over: descending sad tones
    this._tone(400, 0.3, 0.12, 'sine');
    setTimeout(() => this._tone(300, 0.3, 0.12, 'sine'), 300);
    setTimeout(() => this._tone(200, 0.5, 0.1, 'sine'), 600);
  },

  playShieldBlock() {
    // Shield: bright metallic ring
    this._tone(1200, 0.1, 0.1, 'sine');
    setTimeout(() => this._tone(1800, 0.06, 0.08, 'sine'), 50);
  },

  playWaveStart() {
    // Wave start: two-tone alert
    this._tone(440, 0.15, 0.08, 'sine');
    setTimeout(() => this._tone(550, 0.15, 0.08, 'sine'), 150);
  },

  // ===== BGM System =====

  _stopBGM() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    if (this.bgmOscillators.length > 0) {
      try {
        this.bgmOscillators.forEach(o => {
          if (o && o.stop) {
            try { o.stop(); } catch (_) {}
          }
        });
      } catch (_) {}
      this.bgmOscillators = [];
    }
    if (this.bgmGain) {
      try {
        this.bgmGain.disconnect();
      } catch (_) {}
      this.bgmGain = null;
    }
    this.currentBGM = null;
  },

  stopBGM() {
    this._stopBGM();
  },

  playCityBGM() {
    if (!this.bgmEnabled) return;
    this._stopBGM();
    if (!this.init()) return;
    // Peaceful fantasy town: slow arpeggiated chords
    const chords = [
      [392, 494, 587],  // G major
      [440, 554, 659],  // A major
      [349, 440, 523],  // F major
      [392, 494, 587],  // G major
    ];
    let chordIndex = 0;
    const playChord = () => {
      if (!this.bgmEnabled) return;
      const chord = chords[chordIndex % chords.length];
      chord.forEach((freq, i) => {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0, this.ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.018 * this.masterVolume, this.ctx.currentTime + 0.3);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.8);
        o.connect(g); g.connect(this.ctx.destination);
        o.start(); o.stop(this.ctx.currentTime + 2.0);
        this.bgmOscillators.push(o);
      });
      // Bass note
      const bass = this.ctx.createOscillator();
      const bassG = this.ctx.createGain();
      bass.type = 'sine';
      bass.frequency.value = chord[0] / 2;
      bassG.gain.setValueAtTime(0, this.ctx.currentTime);
      bassG.gain.linearRampToValueAtTime(0.025 * this.masterVolume, this.ctx.currentTime + 0.3);
      bassG.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.8);
      bass.connect(bassG); bassG.connect(this.ctx.destination);
      bass.start(); bass.stop(this.ctx.currentTime + 2.0);
      this.bgmOscillators.push(bass);
      chordIndex++;
    };
    playChord();
    this.bgmInterval = setInterval(playChord, 2000);
    this.currentBGM = 'city';
  },

  playBattleBGM() {
    if (!this.bgmEnabled) return;
    this._stopBGM();
    if (!this.init()) return;
    // Driving bass drone
    const bass = this.ctx.createOscillator();
    bass.type = 'sawtooth';
    bass.frequency.value = 65;
    const bassF = this.ctx.createBiquadFilter();
    bassF.type = 'lowpass';
    bassF.frequency.value = 300;
    const g = this.ctx.createGain();
    g.gain.value = 0.02 * this.masterVolume;
    bass.connect(bassF); bassF.connect(g);
    g.connect(this.ctx.destination);
    bass.start();
    this.bgmOscillators.push(bass);
    // Rhythmic drum pattern
    let beat = 0;
    const playBeat = () => {
      if (!this.bgmEnabled) return;
      if (beat % 4 === 0) {
        this._drumHit(60, 0.15, 0.15, 0.6);
      } else if (beat % 4 === 2) {
        this._drumHit(55, 0.12, 0.1, 0.4);
      }
      if (beat % 2 === 1) {
        this._drumHit(200, 0.05, 0.06, 0.8);
      }
      beat++;
    };
    playBeat();
    this.bgmInterval = setInterval(playBeat, 300);
    this.currentBGM = 'battle';
  },

  playBossBGM() {
    if (!this.bgmEnabled) return;
    this._stopBGM();
    if (!this.init()) return;
    // Boss: ominous low drone
    const drone = this.ctx.createOscillator();
    drone.type = 'square';
    drone.frequency.value = 55;
    const droneF = this.ctx.createBiquadFilter();
    droneF.type = 'lowpass';
    droneF.frequency.value = 250;
    const g = this.ctx.createGain();
    g.gain.value = 0.025 * this.masterVolume;
    drone.connect(droneF); droneF.connect(g);
    g.connect(this.ctx.destination);
    drone.start();
    this.bgmOscillators.push(drone);
    // Slow, heavy drum hits
    let beat = 0;
    const playBeat = () => {
      if (!this.bgmEnabled) return;
      if (beat % 8 === 0) {
        this._drumHit(45, 0.5, 0.22, 0.5);
        this._tone(110, 0.4, 0.06, 'sawtooth');
      } else if (beat % 8 === 4) {
        this._drumHit(50, 0.35, 0.15, 0.4);
      } else if (beat % 8 === 6) {
        this._drumHit(40, 0.6, 0.18, 0.5);
        this._tone(82, 0.5, 0.05, 'sawtooth');
      }
      // Occasional high tension note
      if (beat % 16 === 12) {
        this._sweep(400, 200, 1.5, 0.04, 'sine');
      }
      beat++;
    };
    playBeat();
    this.bgmInterval = setInterval(playBeat, 500);
    this.currentBGM = 'boss';
  },

  setBGM(type) {
    if (type === this.currentBGM) return;
    switch (type) {
      case 'city': this.playCityBGM(); break;
      case 'battle': this.playBattleBGM(); break;
      case 'boss': this.playBossBGM(); break;
      case 'none': this.stopBGM(); break;
      default: break;
    }
  },

  toggleSFX() {
    this.sfxEnabled = !this.sfxEnabled;
    return this.sfxEnabled;
  },

  toggleBGM() {
    this.bgmEnabled = !this.bgmEnabled;
    if (!this.bgmEnabled) {
      this.stopBGM();
    }
    return this.bgmEnabled;
  },

  setMasterVolume(v) {
    this.masterVolume = Math.max(0, Math.min(1, v));
  }
};

// Legacy AudioManager compatibility wrapper (for roguelike.js)
class AudioManager {
  constructor() {
    this.enabled = true;
  }
  _ensure() { return HeroAudio.init(); }
  get masterVolume() { return HeroAudio.masterVolume; }

  shoot()      { if (this.enabled) HeroAudio.playAttackSword(); }
  shootBow()   { if (this.enabled) HeroAudio.playAttackBow(); }
  shootMagic() { if (this.enabled) HeroAudio.playAttackMagic(); }
  hit()        { if (this.enabled) HeroAudio.playEnemyDeath(); }
  critHit()    { if (this.enabled) HeroAudio.playCritHit(); }
  playerHurt() { if (this.enabled) HeroAudio.playHitPlayer(); }
  enemyDeath() { if (this.enabled) HeroAudio.playEnemyDeath(); }
  bossDeath()  { if (this.enabled) HeroAudio.playEnemyDeath(); }
  levelUp()    { if (this.enabled) HeroAudio.playLevelUp(); }
  pickup()     { if (this.enabled) HeroAudio.playPickup(); }
  skillUse()   { if (this.enabled) HeroAudio.playSkillCast(); }
  bossSkill()  { if (this.enabled) HeroAudio.playBossEntrance(); }
  waveStart()  { if (this.enabled) HeroAudio.playWaveStart(); }
  shieldBlock(){ if (this.enabled) HeroAudio.playShieldBlock(); }
  gameOver()   { if (this.enabled) HeroAudio.playGameOver(); }
  victory()    { if (this.enabled) HeroAudio.playVictory(); }
}

// Ensure global sfx instance exists
var oldSfx = (typeof sfx !== 'undefined') ? sfx : null;
var sfx = new AudioManager();
if (oldSfx) sfx.enabled = oldSfx.enabled;

// Echo Game Settings Bridge
window.heroSetSoundEnabled = function(enabled) {
  if (typeof HeroAudio !== 'undefined') HeroAudio.sfxEnabled = !!enabled;
};
window.heroSetBgmEnabled = function(enabled) {
  if (typeof HeroAudio !== 'undefined') {
    HeroAudio.bgmEnabled = !!enabled;
    if (!enabled) HeroAudio.stopBGM();
  }
};
