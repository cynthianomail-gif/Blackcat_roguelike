// =====================================================
// Coin.js — 金幣掉落物
// 噴出 → 重力落地 → 玩家接觸拾取（gm.coins +1）
// =====================================================
import { Entity, rectsOverlap } from "../entities/Entity.js";
import { GameManager } from "../core/GameManager.js";
import { EventBus } from "../core/EventBus.js";
import { CANVAS_W, WALL_THICKNESS, FLOOR_Y } from "../core/Constants.js";

const COIN_GRAVITY = 0.5;
const COIN_BOUNCE = -0.4; // 落地反彈係數

export class Coin extends Entity {
  constructor(x, y) {
    super(x - 7, y - 7, 14, 14);
    this.vx = (Math.random() - 0.5) * 5;
    this.vy = -4 - Math.random() * 3; // 向上噴出
    this.spinTimer = Math.random() * Math.PI * 2;
  }

  update(dt, player) {
    if (!this.active) return;
    this.spinTimer += 0.15 * dt;

    this.vy += COIN_GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // 落地反彈 → 靜止
    if (this.y + this.h >= FLOOR_Y) {
      this.y = FLOOR_Y - this.h;
      this.vy = Math.abs(this.vy) > 1 ? this.vy * COIN_BOUNCE : 0;
      this.vx *= 0.85;
    }
    this.x = Math.max(WALL_THICKNESS, Math.min(CANVAS_W - WALL_THICKNESS - this.w, this.x));

    if (player?.active && rectsOverlap(this.hitbox, player.hitbox)) {
      const gm = GameManager.getInstance();
      gm.coins += 1;
      EventBus.emit("coinPickup", { total: gm.coins });
      this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active) return;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    const squash = Math.abs(Math.sin(this.spinTimer)); // 旋轉視覺：寬度壓縮
    ctx.save();
    ctx.fillStyle = "#ffd75e";
    ctx.strokeStyle = "#b8860b";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, (this.w / 2) * (0.4 + 0.6 * squash), this.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
