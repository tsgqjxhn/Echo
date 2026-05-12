/**
 * 《问道长生》Phaser 3 重构版 —— 音频管理器
 * Phase 1: 核心基础设施
 *
 * 基于原生 Web Audio API 实现，不依赖 Howler 等外部音频库。
 * 提供 BGM 循环播放、SFX 即时播放、音量控制、淡入淡出等功能。
 */

/**
 * 音频轨道缓存项
 * 存储解码后的 AudioBuffer，避免重复加载解码
 */
interface AudioCacheItem {
  /** 解码后的音频数据 */
  buffer: AudioBuffer;
  /** 资源路径 */
  src: string;
  /** 缓存时间戳 */
  cachedAt: number;
}

/**
 * BGM 播放状态
 */
interface BGMState {
  /** 当前播放的音频源节点 */
  sourceNode: AudioBufferSourceNode | null;
  /** 控制音量的 GainNode */
  gainNode: GainNode;
  /** 当前轨道 ID */
  currentTrack: string | null;
  /** 是否正在播放 */
  isPlaying: boolean;
  /** 淡入淡出动画帧 ID */
  fadeFrameId: number | null;
}

/**
 * 音频管理器
 * 单例模式，基于 Web Audio API 管理所有游戏音频。
 */
export class AudioManager {
  private static _instance: AudioManager | null = null;

  /** Web Audio API 主上下文 */
  private _audioContext: AudioContext | null = null;
  /** 主音量控制节点（所有音频的总输出） */
  private _masterGain: GainNode | null = null;
  /** BGM 专用音量节点 */
  private _bgmGain: GainNode | null = null;
  /** SFX 专用音量节点 */
  private _sfxGain: GainNode | null = null;

  /** 音频缓存：key 为资源路径 */
  private _cache: Map<string, AudioCacheItem> = new Map();
  /** 最大缓存数量，LRU 淘汰 */
  private readonly _maxCacheSize: number = 50;

  /** BGM 当前状态 */
  private _bgm: BGMState = {
    sourceNode: null,
    gainNode: null as unknown as GainNode,
    currentTrack: null,
    isPlaying: false,
    fadeFrameId: null,
  };

  /** 音量设置 */
  private _masterVolume: number = 1.0;
  private _bgmVolume: number = 0.7;
  private _sfxVolume: number = 0.8;
  private _muted: boolean = false;

  private constructor() {
    // 延迟初始化 AudioContext，等待用户交互（浏览器策略要求）
  }

  /** 获取 AudioManager 单例实例 */
  public static getInstance(): AudioManager {
    if (!AudioManager._instance) {
      AudioManager._instance = new AudioManager();
    }
    return AudioManager._instance;
  }

  // ==========================================================================
  // 初始化
  // ==========================================================================

  /**
   * 初始化音频上下文
   * 必须在用户交互后调用（如点击事件），否则浏览器可能拒绝自动播放
   * @returns 是否初始化成功
   */
  public init(): boolean {
    if (this._audioContext) return true;

    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this._audioContext = new AudioContextClass();

      // 创建音量控制链
      // masterGain -> destination
      this._masterGain = this._audioContext.createGain();
      this._masterGain.gain.value = this._masterVolume;
      this._masterGain.connect(this._audioContext.destination);

      // bgmGain -> masterGain
      this._bgmGain = this._audioContext.createGain();
      this._bgmGain.gain.value = this._bgmVolume;
      this._bgmGain.connect(this._masterGain);

      // sfxGain -> masterGain
      this._sfxGain = this._audioContext.createGain();
      this._sfxGain.gain.value = this._sfxVolume;
      this._sfxGain.connect(this._masterGain);

      // 初始化 BGM 状态中的 gainNode
      this._bgm.gainNode = this._bgmGain;

      return true;
    } catch (error) {
      console.error('[AudioManager] Web Audio API 初始化失败:', error);
      return false;
    }
  }

  /** 检查是否已初始化 */
  public get isInitialized(): boolean {
    return this._audioContext !== null;
  }

  // ==========================================================================
  // BGM 播放
  // ==========================================================================

  /**
   * 播放 BGM（循环）
   * 如果已有 BGM 在播放，先执行淡出再切换
   * @param track 音频资源路径
   * @param fadeDuration 淡入/淡出持续时间（毫秒），默认 1000ms
   */
  public async playBGM(track: string, fadeDuration: number = 1000): Promise<void> {
    if (!this._ensureInit()) return;
    if (this._bgm.currentTrack === track && this._bgm.isPlaying) return;

    // 停止当前 BGM（带淡出）
    if (this._bgm.isPlaying) {
      await this._fadeOutBGM(fadeDuration);
    }

    try {
      const buffer = await this._loadAudio(track);
      if (!buffer) return;

      this._bgm.currentTrack = track;
      this._bgm.isPlaying = true;

      const source = this._audioContext!.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(this._bgm.gainNode);
      source.onended = () => {
        // 仅在非正常停止时触发（如音频解码错误）
        if (this._bgm.currentTrack === track) {
          this._bgm.isPlaying = false;
          this._bgm.sourceNode = null;
        }
      };

      this._bgm.sourceNode = source;
      source.start(0);

      // 淡入
      this._fadeBGMVolume(0, this._bgmVolume, fadeDuration);
    } catch (error) {
      console.error(`[AudioManager] BGM 播放失败: ${track}`, error);
    }
  }

  /**
   * 停止 BGM 播放
   * @param fadeDuration 淡出持续时间（毫秒），默认 1000ms
   */
  public async stopBGM(fadeDuration: number = 1000): Promise<void> {
    if (!this._bgm.isPlaying) return;
    await this._fadeOutBGM(fadeDuration);
  }

  // ==========================================================================
  // SFX 播放
  // ==========================================================================

  /**
   * 播放音效（一次性）
   * @param sound 音频资源路径
   */
  public async playSFX(sound: string): Promise<void> {
    if (!this._ensureInit()) return;
    if (this._muted) return;

    try {
      const buffer = await this._loadAudio(sound);
      if (!buffer) return;

      const source = this._audioContext!.createBufferSource();
      source.buffer = buffer;
      source.loop = false;
      source.connect(this._sfxGain!);
      source.start(0);

      // 播放完成后自动清理引用
      source.onended = () => {
        source.disconnect();
      };
    } catch (error) {
      console.error(`[AudioManager] SFX 播放失败: ${sound}`, error);
    }
  }

  // ==========================================================================
  // 音量控制
  // ==========================================================================

  /** 设置主音量（0-1） */
  public setMasterVolume(vol: number): void {
    this._masterVolume = this._clampVolume(vol);
    if (this._masterGain) {
      this._masterGain.gain.value = this._muted ? 0 : this._masterVolume;
    }
  }

  /** 设置 BGM 音量（0-1） */
  public setBGMVolume(vol: number): void {
    this._bgmVolume = this._clampVolume(vol);
    if (this._bgmGain && !this._muted) {
      this._bgmGain.gain.value = this._bgmVolume;
    }
  }

  /** 设置 SFX 音量（0-1） */
  public setSFXVolume(vol: number): void {
    this._sfxVolume = this._clampVolume(vol);
    if (this._sfxGain && !this._muted) {
      this._sfxGain.gain.value = this._sfxVolume;
    }
  }

  /** 静音（保留各轨道音量设置） */
  public mute(): void {
    this._muted = true;
    if (this._masterGain) {
      this._masterGain.gain.value = 0;
    }
  }

  /** 取消静音（恢复各轨道音量） */
  public unmute(): void {
    this._muted = false;
    if (this._masterGain) {
      this._masterGain.gain.value = this._masterVolume;
    }
    if (this._bgmGain) {
      this._bgmGain.gain.value = this._bgmVolume;
    }
    if (this._sfxGain) {
      this._sfxGain.gain.value = this._sfxVolume;
    }
  }

  /** 切换静音状态 */
  public toggleMute(): void {
    if (this._muted) {
      this.unmute();
    } else {
      this.mute();
    }
  }

  /** 获取当前是否静音 */
  public get muted(): boolean {
    return this._muted;
  }

  /** 获取各轨道当前音量设置 */
  public get volumes(): { master: number; bgm: number; sfx: number } {
    return {
      master: this._masterVolume,
      bgm: this._bgmVolume,
      sfx: this._sfxVolume,
    };
  }

  // ==========================================================================
  // 资源管理
  // ==========================================================================

  /**
   * 预加载音频资源到缓存
   * @param src 音频资源路径
   * @returns 是否加载成功
   */
  public async preload(src: string): Promise<boolean> {
    if (this._cache.has(src)) return true;
    const buffer = await this._loadAudio(src);
    return buffer !== null;
  }

  /** 清空音频缓存 */
  public clearCache(): void {
    this._cache.clear();
  }

  /** 获取缓存中的音频数量 */
  public get cacheSize(): number {
    return this._cache.size;
  }

  // ==========================================================================
  // 内部方法
  // ==========================================================================

  /** 确保 AudioContext 已初始化 */
  private _ensureInit(): boolean {
    if (!this._audioContext) {
      console.warn('[AudioManager] 音频上下文未初始化，请先调用 init()');
      return false;
    }
    // 处理浏览器自动挂起策略
    if (this._audioContext.state === 'suspended') {
      this._audioContext.resume().catch((err) => {
        console.warn('[AudioManager] 恢复 AudioContext 失败:', err);
      });
    }
    return true;
  }

  /** 裁剪音量值到 [0, 1] */
  private _clampVolume(vol: number): number {
    return Math.max(0, Math.min(1, vol));
  }

  /**
   * 加载并解码音频
   * 优先从缓存读取，未缓存则从网络加载
   * @param src 音频资源路径
   */
  private async _loadAudio(src: string): Promise<AudioBuffer | null> {
    if (!this._audioContext) return null;

    // 检查缓存
    const cached = this._cache.get(src);
    if (cached) {
      return cached.buffer;
    }

    try {
      const response = await fetch(src);
      if (!response.ok) {
        console.warn(`[AudioManager] 音频加载失败: ${src} (${response.status})`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this._audioContext.decodeAudioData(arrayBuffer);

      // 写入缓存，LRU 淘汰
      this._addToCache(src, audioBuffer);

      return audioBuffer;
    } catch (error) {
      console.error(`[AudioManager] 音频加载/解码失败: ${src}`, error);
      return null;
    }
  }

  /** 添加缓存项（LRU 淘汰策略） */
  private _addToCache(src: string, buffer: AudioBuffer): void {
    if (this._cache.size >= this._maxCacheSize) {
      // 移除最旧的缓存项
      const oldest = this._cache.keys().next().value;
      if (oldest !== undefined) {
        this._cache.delete(oldest);
      }
    }
    this._cache.set(src, { buffer, src, cachedAt: Date.now() });
  }

  /** BGM 淡出 */
  private _fadeOutBGM(duration: number): Promise<void> {
    return new Promise((resolve) => {
      if (!this._bgm.gainNode || !this._bgm.isPlaying) {
        resolve();
        return;
      }

      this._fadeBGMVolume(this._bgmVolume, 0, duration, () => {
        this._stopBGMInternal();
        resolve();
      });
    });
  }

  /** 立即停止 BGM（内部方法） */
  private _stopBGMInternal(): void {
    if (this._bgm.sourceNode) {
      try {
        this._bgm.sourceNode.stop();
        this._bgm.sourceNode.disconnect();
      } catch {
        // 可能已经停止
      }
      this._bgm.sourceNode = null;
    }
    this._bgm.isPlaying = false;
    this._bgm.currentTrack = null;
  }

  /**
   * BGM 音量渐变动画
   * @param from 起始音量
   * @param to 目标音量
   * @param duration 持续时间（毫秒）
   * @param onComplete 完成回调
   */
  private _fadeBGMVolume(
    from: number,
    to: number,
    duration: number,
    onComplete?: () => void
  ): void {
    if (!this._bgm.gainNode) return;

    // 取消正在进行的淡入淡出
    if (this._bgm.fadeFrameId !== null) {
      cancelAnimationFrame(this._bgm.fadeFrameId);
      this._bgm.fadeFrameId = null;
    }

    const startTime = performance.now();
    const gainParam = this._bgm.gainNode.gain;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = from + (to - from) * progress;

      gainParam.value = current;

      if (progress < 1) {
        this._bgm.fadeFrameId = requestAnimationFrame(tick);
      } else {
        this._bgm.fadeFrameId = null;
        onComplete?.();
      }
    };

    this._bgm.fadeFrameId = requestAnimationFrame(tick);
  }
}

/** 全局便捷访问导出 */
export const audioManager = AudioManager.getInstance();
