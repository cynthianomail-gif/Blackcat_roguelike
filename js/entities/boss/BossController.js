// =====================================================
// BossController.js — Boss 主控（兩段式 Phase）
// Phase 1 → 2 門檻：BOSS_PHASE2_THRESHOLD（50%）
// 受傷：白閃 BOSS_HIT_FLASH_FRAMES（3幀）+ 微幅抖動
// 死亡：縮放至 0（BOSS_DEATH_DURATION 40幀）→ emit "bossDied"
//       → 掉落金幣（BOSS_REWARD_COINS[樓層]）
// =====================================================
import { BaseEnemy } from "../enemies/BaseEnemy.js";
import { BossBulletPool } from "./BossBullet.js";
import { EventBus } from "../../core/EventBus.js";
import { Coin } from "../../items/Coin.js";
import { getAsset } from "../../render/AssetLoader.js";
import {
  CANVAS_W, WALL_THICKNESS,
  BOSS_PHASE2_THRESHOLD, BOSS_HIT_FLASH_FRAMES, BOSS_DEATH_DURATION,
  BOSS_REWARD_COINS, BOSS_HP_SCALE,
} from "../../core/Constants.js";

const CEILING_Y = WALL_THICKNESS;
const HOVER_BASE_Y = CEILING_Y + 60; // 懸浮高度基準

export class BossController extends BaseEnemy {
  constructor(pattern, floorNum = 1) {
    super(CANVAS_W / 2 - pattern.w / 2, HOVER_BASE_Y,
          pattern.w, pattern.h, pattern.hp, 0, 1);
    // Boss 不吃 ENEMY_HP_SCALE（BaseEnemy 已套用），改用獨立 BOSS_HP_SCALE
    this.maxHP = Math.round(pattern.hp * BOSS_HP_SCALE);
    this.hp = this.maxHP;
    this.pattern = pattern;
    this.floorNum = floorNum;
    this.phase = 1;
    this.fireTimer = pattern.phase1.interval * 0.5; // 開場半輪後首發
    this.deathTimer = -1;   // >=0 = 死亡動畫中
    this.patternAngle = 0;  // Phase 2 旋轉散射累積角
    this.hoverTimer = 0;
    this.bulletPool = new BossBulletPool();
    this.contactDamage = true;
  }

  get isDying() { return this.deathTimer >= 0; }
  get currentPhase() { return this.phase === 1 ? this.pattern.phase1 : this.pattern.phase2; }

  takeDamage(dmg, knockX = 0, knockY = 0) {
    if (this.isDying || this.state === "DEAD") return;
    this.hp -= dmg;
    this.hurtFrames = BOSS_HIT_FLASH_FRAMES; // 白閃 3 幀；Boss 不受擊退
    EventBus.emit("enemyHurt", { enemy: this, dmg });

    // Phase 2：血量降至 50%
    if (this.phase === 1 && this.hp / this.maxHP <= BOSS_PHASE2_THRESHOLD) {
      this.phase = 2;
      this.fireTimer = 30; // 短暫停頓後立刻進入新彈幕
      EventBus.emit("bossPhase2", this);
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.deathTimer = BOSS_DEATH_DURATION; // 進入死亡動畫（期間 active 維持 true）
      this.bulletPool.clear();
    }
  }

  update(dt, player) {
    if (!this.active) return;

    // ── 死亡動畫：縮放至 0 ──
    if (this.isDying) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) this.finishDeath();
      return;
    }

    if (this.hurtFrames > 0) this.hurtFrames -= dt;

    // ── 懸浮移動：水平正弦漂移（Phase 2 加快）──
    this.hoverTimer += (this.phase === 1 ? 0.015 : 0.025) * dt;
    const range = (CANVAS_W - WALL_THICKNESS * 2 - this.w) / 2 - 20;
    this.x = CANVAS_W / 2 - this.w / 2 + Math.sin(this.hoverTimer) * range;
    this.y = HOVER_BASE_Y + Math.sin(this.hoverTimer * 2.3) * 18;

    // ── 彈幕 ──
    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && player?.active) {
      this.fireTimer = this.currentPhase.interval;
      this.currentPhase.fire(this, player, this.bulletPool);
    }

    this.bulletPool.update(dt, player);

    // 接觸傷害
    if (player?.active && this.contactDamage &&
        player.x < this.x + this.w && player.x + player.w > this.x &&
        player.y < this.y + this.h && player.y + player.h > this.y) {
      player.takeDamage(this.damage);
    }
  }

  finishDeath() {
    this.state = "DEAD";
    this.active = false;
    EventBus.emit("bossDied", this);
    // 掉落金幣
    const coins = BOSS_REWARD_COINS[this.floorNum - 1] || 5;
    if (this.room) {
      for (let i = 0; i < coins; i++) {
        this.room.items.push(new Coin(
          this.x + this.w / 2 + (Math.random() - 0.5) * 60,
          this.y + this.h / 2,
        ));
      }
    }
  }

  draw(ctx) {
    if (!this.active) return;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    // 死亡縮放 / 受傷抖動
    const scale = this.isDying ? Math.max(0, this.deathTimer / BOSS_DEATH_DURATION) : 1;
    const jitterX = this.hurtFrames > 0 ? (Math.random() - 0.5) * 4 : 0;
    const jitterY = this.hurtFrames > 0 ? (Math.random() - 0.5) * 4 : 0;

    ctx.save();
    ctx.translate(cx + jitterX, cy + jitterY);
    ctx.scale(scale, scale);

    const w = this.w, h = this.h;

    // ── Higgsfield 剪影素材（有圖用圖；受傷白閃用 invert）──
    const img = this.pattern.sprite ? getAsset(this.pattern.sprite) : null;
    if (img) {
      // 等比縮放塞進 w×h 範圍，底部對齊碰撞箱底
      const fit = Math.min(w / img.width, h / img.height);
      const dw = img.width * fit, dh = img.height * fit;
      if (this.hurtFrames > 0) ctx.filter = "invert(1)";
      ctx.drawImage(img, -dw / 2, h / 2 - dh, dw, dh);
      ctx.filter = "none";
      ctx.restore();
      return;
    }

    const body = this.hurtFrames > 0 ? "#ffffff" : "#4a525a";

    // 巨大鴿身
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 8, w / 2, h / 2 - 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // 頭
    ctx.beginPath();
    ctx.arc(0, -h / 2 + 18, 24, 0, Math.PI * 2);
    ctx.fill();
    // 王冠（Boss 辨識特徵）
    ctx.fillStyle = this.hurtFrames > 0 ? "#ffffff" : "#ffd75e";
    ctx.beginPath();
    ctx.moveTo(-16, -h / 2 + 2);
    ctx.lineTo(-12, -h / 2 - 14);
    ctx.lineTo(-4, -h / 2 - 2);
    ctx.lineTo(0, -h / 2 - 16);
    ctx.lineTo(4, -h / 2 - 2);
    ctx.lineTo(12, -h / 2 - 14);
    ctx.lineTo(16, -h / 2 + 2);
    ctx.closePath();
    ctx.fill();
    // 翅膀（隨懸浮拍動）
    const flap = Math.sin(this.hoverTimer * 4) * 14;
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 10, 0);
    ctx.quadraticCurveTo(-w / 2 - 26, -20 - flap, -w / 2 - 12, 16);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w / 2 - 10, 0);
    ctx.quadraticCurveTo(w / 2 + 26, -20 - flap, w / 2 + 12, 16);
    ctx.closePath();
    ctx.fill();
    // 眼睛（紅色，Boss 兇相）
    ctx.fillStyle = "#c8102e";
    ctx.beginPath();
    ctx.arc(-8, -h / 2 + 14, 4, 0, Math.PI * 2);
    ctx.arc(8, -h / 2 + 14, 4, 0, Math.PI * 2);
    ctx.fill();
    // 喙
    ctx.fillStyle = this.hurtFrames > 0 ? "#ffffff" : "#e8a13c";
    ctx.beginPath();
    ctx.moveTo(-5, -h / 2 + 24);
    ctx.lineTo(0, -h / 2 + 34);
    ctx.lineTo(5, -h / 2 + 24);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Boss 血條由 HUD.drawBossBar 繪製（不受 Camera 影響）
  }
}
