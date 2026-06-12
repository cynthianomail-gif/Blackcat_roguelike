// =====================================================
// HUD.js — 戰鬥資訊列（Camera reset 後繪製，不受震動影響）
// 血量 (10,10)｜EX 條 (10,60)｜金幣/炸彈/鑰匙 (10,90)
// 主動道具（右上角）：名稱 + 充能格，滿格時亮框
// Boss 血條：頂端中央 (200,10) 寬 500
// =====================================================
import { EX_ENERGY_MAX, CANVAS_W, UI_FONT } from "../core/Constants.js";
import { ItemDatabase } from "../items/ItemDatabase.js";
import { EventBus } from "../core/EventBus.js";

const HEART_SIZE = 22;
const HEART_GAP = 6;
const EX_BAR_W = 150, EX_BAR_H = 12;
const EX_BLINK_INTERVAL = 15; // EX 滿時「EX!」閃爍週期（幀）
const HURT_PULSE_FRAMES = 18; // 受傷心跳時長（幀）
const COIN_BOUNCE_FRAMES = 12; // 金幣數字彈跳時長（幀）
const HEART_EMPTY_COLOR = "#4a4a4a"; // 空心底色（drawHeart 以此判斷不畫高光）

export class HUD {
  constructor(player, gm) {
    this.player = player;
    this.gm = gm;
    this.blinkTimer = 0;
    this.hurtPulse = 0;     // 受傷心跳（幀）
    this.coinBounce = 0;    // 金幣數字彈跳（幀）
    this.lastCoins = gm.coins;
    EventBus.on("playerHurt", () => { this.hurtPulse = HURT_PULSE_FRAMES; });
  }

  update(dt) {
    this.blinkTimer += dt;
    if (this.hurtPulse > 0) this.hurtPulse -= dt;
    if (this.coinBounce > 0) this.coinBounce -= dt;
    if (this.gm.coins !== this.lastCoins) { this.coinBounce = COIN_BOUNCE_FRAMES; this.lastCoins = this.gm.coins; }
  }

  draw(ctx) {
    if (!this.player) return;
    ctx.save();
    this.drawHearts(ctx);
    this.drawEXBar(ctx);
    this.drawResources(ctx);
    this.drawActiveItem(ctx);
    this.drawBossBar(ctx);
    ctx.restore();
  }

  // ── 主動道具欄（右上角）：方框 + 名稱 + 充能格 ──
  drawActiveItem(ctx) {
    const item = ItemDatabase[this.gm.activeItem];
    if (!item) return;
    const boxS = 44;
    const x = CANVAS_W - boxS - 14, y = 10;
    const charge = this.gm.activeItemCharge;
    const full = charge >= item.chargeMax;

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.roundRect(x - 3, y - 3, boxS + 6, boxS + 6, 6);
    ctx.fill();
    ctx.fillStyle = "#2a2a2a";
    ctx.beginPath();
    ctx.roundRect(x, y, boxS, boxS, 4);
    ctx.fill();
    // 滿充能：金框閃爍
    if (full) {
      ctx.strokeStyle = Math.floor(this.blinkTimer / 15) % 2 === 0 ? "#ffd75e" : "#b8860b";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(x, y, boxS, boxS, 4);
      ctx.stroke();
    }
    // 道具首字
    ctx.fillStyle = full ? "#ffd75e" : "#888";
    ctx.font = `bold 22px ${UI_FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(item.name[0], x + boxS / 2, y + boxS / 2 + 8);

    // 充能格（直列在框左側）
    const pipH = Math.max(4, (boxS - (item.chargeMax - 1) * 2) / item.chargeMax);
    for (let i = 0; i < item.chargeMax; i++) {
      const py = y + boxS - (i + 1) * pipH - i * 2;
      ctx.fillStyle = i < charge ? "#ffd75e" : "#3a3a3a";
      ctx.fillRect(x - 9, py, 6, pipH);
    }

    // 名稱 + 操作提示
    ctx.fillStyle = "#fff";
    ctx.font = `bold 11px ${UI_FONT}`;
    ctx.fillText(item.name, x + boxS / 2, y + boxS + 14);
    if (full) {
      ctx.fillStyle = "#ffd75e";
      ctx.fillText("[E]", x + boxS / 2, y + boxS + 27);
    }
  }

  // ── 血量：愛心 × maxHP；紅=有血（支援半顆）、灰=空 ──
  // 每排 12 顆換行（血上限道具疊多時不撞 Boss 血條/主動道具欄）
  drawHearts(ctx) {
    const p = this.player;
    const PER_ROW = 12, ROW_H = HEART_SIZE + 6;
    const slot = (i) => ({
      x: 10 + (i % PER_ROW) * (HEART_SIZE + HEART_GAP),
      y: 10 + Math.floor(i / PER_ROW) * ROW_H,
    });
    // 心形縮放：受傷瞬間放大回彈；剩 1 心（無魂心）持續脈動（恆 ≥1，避免縮小露出灰底環）
    const low = p.hp <= 1 && p.soulHearts <= 0;
    const beat = this.hurtPulse > 0 ? 1 + (this.hurtPulse / HURT_PULSE_FRAMES) * 0.25
               : low ? 1 + Math.abs(Math.sin(this.blinkTimer * 0.18)) * 0.08 : 1;
    for (let i = 0; i < p.maxHP; i++) {
      const { x, y } = slot(i);
      const filled = Math.max(0, Math.min(1, p.hp - i)); // 0 | 0.5 | 1
      this.drawHeart(ctx, x, y, HEART_EMPTY_COLOR);      // 底：灰色空心
      if (filled > 0) this.drawHeart(ctx, x, y, "#c8102e", filled, beat);
    }
    // 魂心（藍色）接在紅心後面；魂心優先扣血，受傷心跳也要跳（低血持續脈動仍只限紅心）
    const soulBeat = this.hurtPulse > 0 ? beat : 1;
    for (let i = 0; i < Math.ceil(p.soulHearts); i++) {
      const { x, y } = slot(p.maxHP + i);
      const filled = Math.max(0, Math.min(1, p.soulHearts - i));
      this.drawHeart(ctx, x, y, "#5a8fd1", filled, soulBeat);
    }
  }

  // 愛心形狀：兩圓 + 下三角；fillRatio<1 時只畫左半；scale 以心形中心縮放
  drawHeart(ctx, x, y, color, fillRatio = 1, scale = 1) {
    const s = HEART_SIZE;
    ctx.save();
    if (scale !== 1) {
      ctx.translate(x + s / 2, y + s / 2);
      ctx.scale(scale, scale);
      ctx.translate(-(x + s / 2), -(y + s / 2));
    }
    if (fillRatio < 1) {
      ctx.beginPath();
      ctx.rect(x, y, s * fillRatio, s + 4);
      ctx.clip();
    }
    // 兩圓+三角合成單一 path：先粗描邊、再填色蓋掉內側線，外露一半即整顆心的描邊
    ctx.beginPath();
    ctx.moveTo(x + s * 0.56, y + s * 0.3);
    ctx.arc(x + s * 0.28, y + s * 0.3, s * 0.28, 0, Math.PI * 2);
    ctx.moveTo(x + s, y + s * 0.3);
    ctx.arc(x + s * 0.72, y + s * 0.3, s * 0.28, 0, Math.PI * 2);
    // 三角形頂點順序須與 arc 同繞向，否則 nonzero winding 在重疊區破洞
    ctx.moveTo(x + s * 0.98, y + s * 0.42);
    ctx.lineTo(x + s * 0.5, y + s);
    ctx.lineTo(x + s * 0.02, y + s * 0.42);
    ctx.closePath();
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fill();
    // 滿心加左上高光點（灰色空心不加）
    if (fillRatio >= 1 && color !== HEART_EMPTY_COLOR) {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.arc(x + s * 0.3, y + s * 0.26, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── EX 能量條：金色；滿時閃爍「EX!」──
  drawEXBar(ctx) {
    const ratio = this.player.exEnergy / EX_ENERGY_MAX;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(8, 58, EX_BAR_W + 4, EX_BAR_H + 4);
    ctx.fillStyle = "#3a3a3a";
    ctx.fillRect(10, 60, EX_BAR_W, EX_BAR_H);
    ctx.fillStyle = "#ffd75e";
    ctx.fillRect(10, 60, EX_BAR_W * ratio, EX_BAR_H);

    if (ratio >= 1 && Math.floor(this.blinkTimer / EX_BLINK_INTERVAL) % 2 === 0) {
      ctx.fillStyle = "#ffd75e";
      ctx.font = `bold 14px ${UI_FONT}`;
      ctx.textAlign = "left";
      ctx.fillText("EX!", 10 + EX_BAR_W + 10, 60 + EX_BAR_H - 1);
    }
  }

  // ── 金幣/炸彈/鑰匙：小圖示 + 數字 ──
  drawResources(ctx) {
    const y = 90;
    ctx.font = `bold 14px ${UI_FONT}`;
    ctx.textAlign = "left";

    // 金幣（金色圓）
    ctx.fillStyle = "#ffd75e";
    ctx.beginPath();
    ctx.arc(18, y + 8, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#b8860b";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    const coinY = y + 13 - (this.coinBounce > 0 ? Math.sin((this.coinBounce / COIN_BOUNCE_FRAMES) * Math.PI) * 5 : 0);
    ctx.fillText(`× ${this.gm.coins}`, 32, coinY);

    // 炸彈（黑圓 + 紅引信）
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(88, y + 9, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c8102e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(88, y + 2);
    ctx.lineTo(92, y - 3);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.fillText(`× ${this.gm.bombs}`, 102, y + 13);

    // 鑰匙（金色柄 + 齒）
    ctx.strokeStyle = "#ffd75e";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(158, y + 4, 4, 0, Math.PI * 2);
    ctx.moveTo(158, y + 8);
    ctx.lineTo(158, y + 16);
    ctx.moveTo(158, y + 12);
    ctx.lineTo(163, y + 12);
    ctx.moveTo(158, y + 16);
    ctx.lineTo(162, y + 16);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.fillText(`× ${this.gm.keys}`, 172, y + 13);
  }

  // ── Boss 血條：頂端中央 (200,10) 寬 500、名牌底框＋漸變血條、顯示名稱 ──
  drawBossBar(ctx) {
    const boss = this.gm.currentRoom?.boss;
    if (!boss || !boss.active || boss.isDying) return;
    const x = 200, y = 10, w = 500, h = 14;
    // 名牌底框 + 雙層漸變血條
    ctx.fillStyle = "rgba(8,8,12,0.7)";
    ctx.beginPath();
    ctx.roundRect(x - 8, y - 6, w + 16, h + 34, 8);
    ctx.fill();
    ctx.fillStyle = "#3a3a3a";
    ctx.fillRect(x, y, w, h);
    const ratio = boss.hp / boss.maxHP;
    const grad = ctx.createLinearGradient(0, y, 0, y + h);
    const main = boss.phase === 2 ? "#ff5e3a" : "#c8102e";
    grad.addColorStop(0, "#ff8a6a");
    grad.addColorStop(0.4, main);
    grad.addColorStop(1, "#7a0a1c");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w * ratio, h);
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = "#fff";
    ctx.font = `bold 13px ${UI_FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(boss.pattern.name, x + w / 2, y + h + 16);
  }
}
