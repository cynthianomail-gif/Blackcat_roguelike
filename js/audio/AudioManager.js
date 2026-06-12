// =====================================================
// AudioManager.js — 單例音訊管理器（音訊規格書 Section 1.2）
// BGM: HTML5 Audio（Suno MP3）/ SFX: Web Audio API 合成
// AudioContext 必須在使用者互動後 init()（瀏覽器自動播放政策）
// =====================================================
import { SFX_PRESETS } from "./SFXPresets.js";

export class AudioManager {
  constructor() {
    this.ctx = null;          // AudioContext（首次互動後初始化）
    this.masterGain = null;
    this.bgmGain   = null;    // BGM 音量控制
    this.sfxGain   = null;    // SFX 音量控制
    this.bgmEl     = null;    // 當前 BGM 的 <audio> 元素
    this.bgmVolume = 0.40;    // BGM 預設音量
    this.sfxVolume = 0.70;    // SFX 預設音量
    this.muted     = false;
    this._initialized = false;
    this._sfxLast  = {};      // SFX 名稱 → 上次播放時間（密集重複合併）
  }

  // ── 初始化（必須在使用者互動後呼叫）────────────────────────
  init() {
    if (this._initialized) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.bgmGain    = this.ctx.createGain();
    this.sfxGain    = this.ctx.createGain();
    this.bgmGain.gain.value  = this.bgmVolume;
    this.sfxGain.gain.value  = this.sfxVolume;
    this.bgmGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
    this._initialized = true;
  }

  // ── BGM 播放（HTML5 Audio + 淡入）────────────────────────
  playBGM(trackName, loop = true) {
    this.stopBGM(0.5);  // 先淡出舊 BGM（0.5s）
    // window.Audio：本模組的 Audio 是 AudioManager 單例，會遮蔽全域建構子
    const audio = new window.Audio(`assets/audio/bgm/${trackName}.mp3`);
    audio.loop = loop;
    audio.volume = 0;
    audio.play().catch(() => {}); // 忽略 autoplay policy
    this.bgmEl = audio;
    // 淡入
    let vol = 0;
    const fadeIn = setInterval(() => {
      vol = Math.min(vol + 0.05, this.bgmVolume);
      audio.volume = this.muted ? 0 : vol;
      if (vol >= this.bgmVolume) clearInterval(fadeIn);
    }, 50);
  }

  stopBGM(fadeTime = 0.3) {
    if (!this.bgmEl) return;
    const audio = this.bgmEl;
    let vol = audio.volume;
    const step = vol / (fadeTime * 20);
    const fadeOut = setInterval(() => {
      vol = Math.max(vol - step, 0);
      audio.volume = vol;
      if (vol <= 0) { audio.pause(); clearInterval(fadeOut); }
    }, 50);
    this.bgmEl = null;
  }

  // ── SFX 播放（Web Audio API 合成）────────────────────────
  playSFX(name) {
    if (!this._initialized || this.muted) return;
    // Audio-4：同名 SFX 35ms 內只播一次——多發子彈同幀命中（四爪/十字
    // 貓掌）或低幀率補幀時，避免同一合成音疊加爆音
    const now = performance.now();
    if (now - (this._sfxLast[name] || 0) < 35) return;
    this._sfxLast[name] = now;
    const preset = SFX_PRESETS[name];
    if (preset) preset(this.ctx, this.sfxGain);
    else console.warn(`[Audio] SFX "${name}" not found`);
  }

  // ── 音量控制 ────────────────────────────────────────────
  setMasterVolume(v) { if(this.masterGain) this.masterGain.gain.value = v; }
  setBGMVolume(v)    { this.bgmVolume = v; if(this.bgmEl) this.bgmEl.volume = v; }
  setSFXVolume(v)    { this.sfxVolume = v; if(this.sfxGain) this.sfxGain.gain.value = v; }
  toggleMute() {
    this.muted = !this.muted;
    this.setMasterVolume(this.muted ? 0 : 1);
    // BGM 走 HTML5 Audio 不經 masterGain，需另外靜音
    if (this.bgmEl) this.bgmEl.volume = this.muted ? 0 : this.bgmVolume;
  }

  // ── 狀態切換時自動換 BGM ─────────────────────────────────
  onFloorChange(floorNum) {
    const tracks = { 1:"bgm_f1_rooftop", 2:"bgm_f2_kitchen",
      3:"bgm_f3_alley", 4:"bgm_f4_warehouse",
      5:"bgm_f5_library", 6:"bgm_f6_shrine",
      7:"bgm_f6_shrine" }; // F7 最終層沿用神社曲（同背景沿用 F6 的邏輯）
    this.playBGM(tracks[floorNum] || "bgm_f1_rooftop");
  }
  onBossStart()  { this.playBGM("bgm_boss"); }
  onBossDeath()  { this.stopBGM(1.5); }
  onMainMenu()   { this.playBGM("bgm_menu"); }
}

export const Audio = new AudioManager(); // 全局單例
