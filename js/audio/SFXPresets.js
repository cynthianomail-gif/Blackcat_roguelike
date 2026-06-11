// =====================================================
// SFXPresets.js — 22 個 SFX（音訊規格書 Section 3.2）
// 所有 SFX 均為純 Web Audio API 合成，無外部依賴
// 呼叫方式：SFX_PRESETS["shoot"](audioCtx, sfxGainNode)
// =====================================================

export const SFX_PRESETS = {

  // ── 玩家射擊 ──────────────────────────────────────────────
  shoot: (ctx, dest) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.08);
    g.gain.setValueAtTime(0.35, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    o.connect(g); g.connect(dest);
    o.start(); o.stop(ctx.currentTime + 0.1);
  },

  // ── EX 必殺射擊 ──────────────────────────────────────────
  shoot_ex: (ctx, dest) => {
    // 低頻爆破
    const o1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    o1.type = "sawtooth"; o1.frequency.setValueAtTime(60, ctx.currentTime);
    g1.gain.setValueAtTime(0.8, ctx.currentTime);
    g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    o1.connect(g1); g1.connect(dest);
    o1.start(); o1.stop(ctx.currentTime + 0.3);
    // 高頻掃描
    const o2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    o2.type = "sine";
    o2.frequency.setValueAtTime(200, ctx.currentTime);
    o2.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.2);
    g2.gain.setValueAtTime(0.5, ctx.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    o2.connect(g2); g2.connect(dest);
    o2.start(); o2.stop(ctx.currentTime + 0.25);
  },

  // ── Dash 衝刺 ───────────────────────────────────────────
  dash: (ctx, dest) => {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();
    filter.type = "bandpass"; filter.frequency.value = 1500; filter.Q.value = 0.8;
    g.gain.setValueAtTime(0.4, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    src.buffer = buf;
    src.connect(filter); filter.connect(g); g.connect(dest);
    src.start();
  },

  // ── 跳躍 ────────────────────────────────────────────────
  jump: (ctx, dest) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(300, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    o.connect(g); g.connect(dest);
    o.start(); o.stop(ctx.currentTime + 0.15);
  },

  // ── 落地 ────────────────────────────────────────────────
  land: (ctx, dest) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(80, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.08);
    g.gain.setValueAtTime(0.6, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    o.connect(g); g.connect(dest);
    o.start(); o.stop(ctx.currentTime + 0.1);
  },

  // ── 玩家受傷 ─────────────────────────────────────────────
  player_hurt: (ctx, dest) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sawtooth"; o.frequency.setValueAtTime(200, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.2);
    g.gain.setValueAtTime(0.5, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    o.connect(g); g.connect(dest);
    o.start(); o.stop(ctx.currentTime + 0.25);
  },

  // ── 玩家死亡 ─────────────────────────────────────────────
  player_death: (ctx, dest) => {
    const freqs = [440, 330, 220, 165, 110];
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t = ctx.currentTime + i * 0.1;
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.4, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + 0.2);
    });
  },

  // ── 敵人受傷 ─────────────────────────────────────────────
  enemy_hurt: (ctx, dest) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square"; o.frequency.setValueAtTime(440, ctx.currentTime);
    g.gain.setValueAtTime(0.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    o.connect(g); g.connect(dest);
    o.start(); o.stop(ctx.currentTime + 0.07);
  },

  // ── 敵人死亡 ─────────────────────────────────────────────
  enemy_death: (ctx, dest) => {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i/data.length, 2);
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4, ctx.currentTime);
    src.buffer = buf; src.connect(g); g.connect(dest);
    src.start();
  },

  // ── 拾取道具 ─────────────────────────────────────────────
  item_pickup: (ctx, dest) => {
    [523, 659, 784].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t = ctx.currentTime + i * 0.08;
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + 0.22);
    });
  },

  // ── Synergy 觸發 ─────────────────────────────────────────
  synergy: (ctx, dest) => {
    [261, 329, 392, 523].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f;
      const t = ctx.currentTime + i * 0.05;
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + 0.65);
    });
  },

  // ── Boss 出現 ─────────────────────────────────────────────
  boss_appear: (ctx, dest) => {
    // 低頻轟鳴
    const o1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    o1.type = "sawtooth"; o1.frequency.setValueAtTime(55, ctx.currentTime);
    g1.gain.setValueAtTime(0.8, ctx.currentTime);
    g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
    o1.connect(g1); g1.connect(dest);
    o1.start(); o1.stop(ctx.currentTime + 1.0);
    // 高頻警告
    const o2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    o2.type = "square"; o2.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
    o2.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.8);
    g2.gain.setValueAtTime(0.4, ctx.currentTime + 0.3);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85);
    o2.connect(g2); g2.connect(dest);
    o2.start(ctx.currentTime + 0.3); o2.stop(ctx.currentTime + 0.9);
  },

  // ── Boss Phase 2 觸發 ────────────────────────────────────
  boss_phase2: (ctx, dest) => {
    [440, 466, 493].forEach((f, i) => { // 不和諧小二度
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sawtooth"; o.frequency.value = f;
      g.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      o.connect(g); g.connect(dest);
      o.start(ctx.currentTime + i * 0.02);
      o.stop(ctx.currentTime + 0.85);
    });
  },

  // ── Boss 死亡 ─────────────────────────────────────────────
  boss_death: (ctx, dest) => {
    [392, 523, 659].forEach((f, i) => { // 勝利三連音
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t = ctx.currentTime + i * 0.15;
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + 0.45);
    });
  },

  // ── 開門 ─────────────────────────────────────────────────
  door_open: (ctx, dest) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(300, ctx.currentTime);
    o.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.1);
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    o.connect(g); g.connect(dest);
    o.start(); o.stop(ctx.currentTime + 0.15);
  },

  // ── 清房完成 ─────────────────────────────────────────────
  room_clear: (ctx, dest) => {
    [523, 784].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t = ctx.currentTime + i * 0.12;
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.3, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + 0.28);
    });
  },

  // ── 金幣掉落 ─────────────────────────────────────────────
  coin_drop: (ctx, dest) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(1047, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1318, ctx.currentTime + 0.04);
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    o.connect(g); g.connect(dest);
    o.start(); o.stop(ctx.currentTime + 0.09);
  },

  // ── 商店購買 ─────────────────────────────────────────────
  shop_buy: (ctx, dest) => {
    [659, 784, 1047].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t = ctx.currentTime + i * 0.06;
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + 0.14);
    });
  },

  // ── 錯誤/金幣不足 ──────────────────────────────────────
  error: (ctx, dest) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square"; o.frequency.setValueAtTime(120, ctx.currentTime);
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    o.connect(g); g.connect(dest);
    o.start(); o.stop(ctx.currentTime + 0.13);
  },

  // ── 換層 ─────────────────────────────────────────────────
  floor_transition: (ctx, dest) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(600, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.8);
    g.gain.setValueAtTime(0.4, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    o.connect(g); g.connect(dest);
    o.start(); o.stop(ctx.currentTime + 0.9);
  },

  // ── 使用主動道具 ─────────────────────────────────────────
  active_use: (ctx, dest) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(400, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
    g.gain.setValueAtTime(0.35, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    o.connect(g); g.connect(dest);
    o.start(); o.stop(ctx.currentTime + 0.2);
  },

  // ── 回復血量 ─────────────────────────────────────────────
  heal: (ctx, dest) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(400, ctx.currentTime);
    o.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.3);
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    o.connect(g); g.connect(dest);
    o.start(); o.stop(ctx.currentTime + 0.36);
  },

};
