// =====================================================
// EnemyBullet.js — 敵人投射物
// EnemyBullet：直線飛行，撞牆/撞玩家銷毀
// EnemyBomb：拋物線炸彈，落地爆炸（範圍傷害）
// 由 Room.enemyBullets 統一更新與繪製
// =====================================================
import { Entity, rectsOverlap } from "../Entity.js";
import { CANVAS_W, WALL_THICKNESS, FLOOR_Y } from "../../core/Constants.js";

const CEILING_Y = WALL_THICKNESS;
const BOMB_GRAVITY = 0.3;        // 炸彈重力（比玩家輕，拋物線較緩）
const BOMB_EXPLOSION_FRAMES = 14; // 爆炸特效持續幀數

export class EnemyBullet extends Entity {
  constructor(x, y, vx, vy, damage, r = 5) {
    super(x - r, y - r, r * 2, r * 2);
    this.vx = vx; this.vy = vy;
    this.damage = damage;
    this.r = r;
  }

  update(dt, player) {
    if (!this.active) return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // 撞牆/地板/天花板銷毀
    if (this.x <= WALL_THICKNESS || this.x + this.w >= CANVAS_W - WALL_THICKNESS ||
        this.y <= CEILING_Y || this.y + this.h >= FLOOR_Y) {
      this.active = false;
      return;
    }

    // 命中玩家（無敵幀由 Player.takeDamage 處理；命中即銷毀）
    if (player?.active && rectsOverlap(this.hitbox, player.hitbox)) {
      player.takeDamage(this.damage);
      this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.fillStyle = "#e8e8e8";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.x + this.r, this.y + this.r, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

export class EnemyBomb extends Entity {
  constructor(x, y, vx, vy, damage, radius) {
    const size = 16;
    super(x - size / 2, y - size / 2, size, size);
    this.vx = vx; this.vy = vy;
    this.damage = damage;
    this.radius = radius;        // 爆炸半徑
    this.exploding = 0;          // >0 = 爆炸動畫倒數
  }

  update(dt, player) {
    if (!this.active) return;

    // ── 爆炸階段：只播特效 ──
    if (this.exploding > 0) {
      this.exploding -= dt;
      if (this.exploding <= 0) this.active = false;
      return;
    }

    // ── 飛行階段：拋物線 ──
    this.vy += BOMB_GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // 落地或撞牆 → 爆炸
    if (this.y + this.h >= FLOOR_Y ||
        this.x <= WALL_THICKNESS || this.x + this.w >= CANVAS_W - WALL_THICKNESS) {
      this.y = Math.min(this.y, FLOOR_Y - this.h);
      this.explode(player);
    }
  }

  explode(player) {
    this.exploding = BOMB_EXPLOSION_FRAMES;
    // 範圍傷害：玩家中心點距爆炸中心 <= radius
    if (player?.active) {
      const dx = (player.x + player.w / 2) - (this.x + this.w / 2);
      const dy = (player.y + player.h / 2) - (this.y + this.h / 2);
      if (Math.hypot(dx, dy) <= this.radius + player.w / 2) {
        player.takeDamage(this.damage);
      }
    }
  }

  draw(ctx) {
    if (!this.active) return;
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    ctx.save();
    if (this.exploding > 0) {
      // 爆炸：擴張的橘色圓 + 淡出
      const t = 1 - this.exploding / BOMB_EXPLOSION_FRAMES;
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = "#ff8c42";
      ctx.beginPath();
      ctx.arc(cx, cy, this.radius * (0.4 + 0.6 * t), 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 飛行中：黑色圓形炸彈 + 引信
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(cx, cy, this.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#c8102e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - this.h / 2);
      ctx.lineTo(cx + 4, cy - this.h / 2 - 6);
      ctx.stroke();
    }
    ctx.restore();
  }
}
