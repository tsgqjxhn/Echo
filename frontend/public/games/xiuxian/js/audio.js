// ============================================================
// Web Audio API Sound System — XiuAudio
// Zero external audio files, all sounds generated procedurally
// ============================================================

const XiuAudio = {
  ctx: null,
  currentBGM: null,
  bgmTimeout: null,
  _enabled: true,
  _bgmEnabled: true,
  _sfxEnabled: true,

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  // ---- Settings ----
  get enabled() { return this._enabled; },
  get bgmEnabled() { return this._bgmEnabled; },
  get sfxEnabled() { return this._sfxEnabled; },

  setEnabled(v) { this._enabled = v; if (!v) this.stopBGM(); },
  setBgmEnabled(v) {
    this._bgmEnabled = v;
    if (!v) this.stopBGM();
    else if (this._lastBGM) this._lastBGM();
  },
  setSfxEnabled(v) { this._sfxEnabled = v; },

  // ==========================================================
  // SFX Public API
  // ==========================================================

  playButtonClick() {
    // 水墨滴答声：短促高频click
    this._tone(2000, 0.03, 0.05);
    this._tone(3000, 0.02, 0.03, 'sine', 0.06);
  },

  playBreakthroughSuccess() {
    // 突破成功：金光炸裂+钟声
    this._chime([523, 659, 784, 1047], 0.3, 0.15);
    this._sweep(800, 2000, 0.5, 0.2);
    setTimeout(() => this._chime([1047, 1319, 1568, 2093], 0.4, 0.1), 300);
  },

  playBreakthroughFailure() {
    // 突破失败：低沉碎裂声
    this._noiseBurst(200, 0.5, 0.15, 'lowpass');
    this._tone(150, 0.3, 0.2);
    this._sweep(300, 80, 0.6, 0.15);
    setTimeout(() => this._noiseBurst(100, 0.3, 0.1, 'lowpass'), 200);
  },

  playGetItem() {
    // 获得物品：清脆叮声
    this._tone(1200, 0.06, 0.08);
    setTimeout(() => this._tone(1800, 0.04, 0.05), 50);
  },

  playGetRareItem() {
    // 获得稀有物品：升调连响
    this._tone(1000, 0.08, 0.08);
    setTimeout(() => this._tone(1400, 0.08, 0.1), 80);
    setTimeout(() => this._tone(1800, 0.12, 0.12), 160);
    setTimeout(() => this._tone(2400, 0.15, 0.08), 260);
  },

  playAlchemySuccess() {
    // 炼丹成功：药炉开盖+灵气散出
    this._noiseBurst(600, 0.2, 0.1, 'bandpass');
    this._sweep(1000, 1800, 0.3, 0.12);
    setTimeout(() => this._tone(880, 0.15, 0.08), 150);
  },

  playAlchemyFailure() {
    // 炼丹失败：爆炸/噗嗤声
    this._noiseBurst(150, 0.3, 0.2, 'lowpass');
    this._sweep(500, 100, 0.2, 0.1);
    setTimeout(() => this._noiseBurst(80, 0.2, 0.15, 'lowpass'), 150);
  },

  playBattleAttack() {
    // 战斗攻击：刀剑劈砍声
    this._noiseBurst(800, 0.08, 0.12, 'highpass');
    this._sweep(600, 200, 0.06, 0.08);
  },

  playBattleHit() {
    // 战斗受击：闷响
    this._noiseBurst(200, 0.12, 0.15, 'lowpass');
    this._tone(100, 0.1, 0.1);
  },

  playBattleWin() {
    // 战斗胜利：凯旋号角
    this._chime([523, 659, 784, 1047], 0.4, 0.12);
    setTimeout(() => this._chime([784, 1047, 1319], 0.5, 0.15), 250);
  },

  playBattleLose() {
    // 战斗失败：低沉鼓声
    this._tone(80, 0.5, 0.2);
    setTimeout(() => this._tone(60, 0.6, 0.15), 300);
    setTimeout(() => this._tone(50, 0.8, 0.1), 600);
  },

  playLevelUp() {
    // 升级：轻快上升音阶
    this._sweep(600, 1200, 0.4, 0.1);
    setTimeout(() => this._tone(1600, 0.2, 0.08), 200);
  },

  playLingshi() {
    // 灵石声：硬币碰撞
    this._tone(1500, 0.04, 0.06);
    setTimeout(() => this._tone(2000, 0.03, 0.05), 40);
    setTimeout(() => this._tone(2500, 0.02, 0.03), 80);
  },

  playToast() {
    // Toast通知：轻柔提示音
    this._tone(1000, 0.04, 0.04);
  },

  playEncounter() {
    // 奇遇触发：神秘钟声
    this._tone(800, 0.3, 0.08);
    setTimeout(() => this._tone(600, 0.4, 0.06), 250);
    setTimeout(() => this._tone(800, 0.5, 0.08), 500);
    setTimeout(() => this._tone(1000, 0.3, 0.06), 800);
  },

  playEquip() {
    // 装备法宝：灵气灌注声
    this._sweep(400, 800, 0.3, 0.08);
    setTimeout(() => this._tone(1200, 0.1, 0.05), 150);
  },

  playAuctionBid() {
    // 拍卖出价：木槌声
    this._tone(300, 0.08, 0.1);
    setTimeout(() => this._noiseBurst(400, 0.05, 0.08, 'lowpass'), 50);
  },

  playAuctionWin() {
    // 拍卖获胜：成交锣声
    this._tone(523, 0.3, 0.15);
    setTimeout(() => this._chime([659, 784, 1047], 0.4, 0.1), 150);
  },

  // ==========================================================
  // BGM (procedural loops)
  // ==========================================================

  _lastBGM: null,

  playMainBGM() {
    this._lastBGM = () => this.playMainBGM();
    this._stopBGM();
    // 主界面：空灵古风，古琴+笛子
    this._startGuzhengLoop([
      { note: 392, dur: 1500 }, { note: 440, dur: 1500 },
      { note: 523, dur: 1500 }, { note: 440, dur: 1500 },
    ], 0.04);
  },

  playExploreBGM() {
    this._lastBGM = () => this.playExploreBGM();
    this._stopBGM();
    // 探险BGM：悬疑古风
    this._startGuzhengLoop([
      { note: 330, dur: 2000 }, { note: 262, dur: 2000 },
      { note: 294, dur: 2000 }, { note: 349, dur: 2000 },
    ], 0.035);
  },

  playBattleBGM() {
    this._lastBGM = () => this.playBattleBGM();
    this._stopBGM();
    // 战斗BGM：持续低音+节奏鼓点
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 65;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.03;
    // LFO for rhythmic feel
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 2;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain).connect(gain.gain);
    lfo.start();
    osc.connect(gain).connect(this.ctx.destination);
    osc.start();
    this.currentBGM = { nodes: [osc, gain, lfo, lfoGain] };
    // 节奏loop
    this._drumLoop(0.25);
  },

  playAuctionBGM() {
    this._lastBGM = () => this.playAuctionBGM();
    this._stopBGM();
    // 拍卖会：热闹市集风
    this._startGuzhengLoop([
      { note: 523, dur: 800 }, { note: 587, dur: 800 },
      { note: 659, dur: 800 }, { note: 587, dur: 800 },
      { note: 523, dur: 800 }, { note: 392, dur: 800 },
    ], 0.03);
  },

  playBreakthroughBGM() {
    this._lastBGM = () => this.playBreakthroughBGM();
    this._stopBGM();
    // 突破BGM：庄严史诗感
    this._chime([262, 330, 392, 523, 659], 2.0, 0.1);
    setTimeout(() => this._chime([523, 659, 784, 1047, 1319], 2.5, 0.08), 800);
  },

  stopBGM() {
    this._lastBGM = null;
    this._stopBGM();
  },

  // ==========================================================
  // Internal utility methods
  // ==========================================================

  _ensure() {
    if (!this._enabled || !this._sfxEnabled) return false;
    this.init();
    return true;
  },

  _tone(freq, duration, volume, type = 'sine', delay = 0) {
    if (!this._ensure()) return;
    try {
      const t = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + duration);
    } catch (e) { /* ignore audio errors */ }
  },

  _noiseBurst(freq, duration, volume, filterType = 'bandpass') {
    if (!this._ensure()) return;
    try {
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.value = freq;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      source.connect(filter).connect(gain).connect(this.ctx.destination);
      source.start();
      source.stop(this.ctx.currentTime + duration);
    } catch (e) { /* ignore audio errors */ }
  },

  _sweep(fromFreq, toFreq, duration, volume) {
    if (!this._ensure()) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(fromFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(toFreq, this.ctx.currentTime + duration);
      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) { /* ignore audio errors */ }
  },

  _chime(freqs, duration, volume) {
    if (!this._ensure()) return;
    freqs.forEach((freq, i) => {
      setTimeout(() => {
        try {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(volume, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
          osc.connect(gain).connect(this.ctx.destination);
          osc.start();
          osc.stop(this.ctx.currentTime + duration);
        } catch (e) {}
      }, i * 120);
    });
  },

  _startGuzhengLoop(notes, volume) {
    if (!this._ensure() || !this._bgmEnabled) return;
    try {
      let noteIdx = 0;
      const playNext = () => {
        if (!this.currentBGM) return;
        const n = notes[noteIdx % notes.length];
        noteIdx++;
        // Pluck-like envelope (guzheng simulation)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = n.note;
        const t = this.ctx.currentTime;
        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
        // Add harmonics for richer guzheng sound
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.value = n.note * 2;
        gain2.gain.setValueAtTime(volume * 0.3, t);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(gain).connect(this.ctx.destination);
        osc2.connect(gain2).connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.8);
        osc2.start(t);
        osc2.stop(t + 0.5);
        this.bgmTimeout = setTimeout(playNext, n.dur);
      };
      // Create a dummy currentBGM marker
      this.currentBGM = { nodes: [], stop() {} };
      playNext();
    } catch (e) { /* ignore audio errors */ }
  },

  _stopBGM() {
    if (this.currentBGM && this.currentBGM.nodes) {
      this.currentBGM.nodes.forEach(n => {
        try { n.stop && n.stop(); n.disconnect && n.disconnect(); } catch (e) {}
      });
    }
    this.currentBGM = null;
    if (this.bgmTimeout) {
      clearTimeout(this.bgmTimeout);
      this.bgmTimeout = null;
    }
  },

  _drumLoop(interval) {
    if (!this._bgmEnabled) return;
    const play = () => {
      if (!this.currentBGM) return;
      try {
        // Low thud for drum beat
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
      } catch (e) {}
      this.bgmTimeout = setTimeout(play, interval * 1000);
    };
    play();
  }
};

// Auto-init on first user interaction (browser requirement for AudioContext)
function _initXiuAudio() {
  XiuAudio.init();
  document.removeEventListener('click', _initXiuAudio);
  document.removeEventListener('touchstart', _initXiuAudio);
}
document.addEventListener('click', _initXiuAudio);
document.addEventListener('touchstart', _initXiuAudio);
