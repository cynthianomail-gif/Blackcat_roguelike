// =====================================================
// Bullet.js — 玩家子彈
// 道具系統（Task 7+）會動態修改子彈屬性：
// piercing / homing / bounces / split / returns / size 等
// =====================================================
import { Entity } from "./Entity.js";
import {
  PLAYER_BULLET_W, PLAYER_BULLET_H, CANVAS_W, CANVAS_H,
} from "../core/Constants.js";

export class Bullet extends Entity {
  constructor() {
    super(0, 0, PLAYER_BULLET_W, PLAYER_BULLET_H);
    this.active = false;
    this.spawnOrder = 0; // FIFO 淘汰用
    this.reset();
  }

  reset() {
    this.damage = 1;
    this.traveled = 0;
    this.range = 420;
    this.isEX = false;
    // ── 道具可改造屬性（預設關閉）──
    this.piercing = false;
    this.homingStrength = 0;
    this.maxBounces = 0;
    this.bounces = 0;
    this.sizeMulti = 1;
    this.knockback = 0;
    this.hitEnemies = null; // piercing 時記錄已命中敵人，避免同一敵人每幀重複扣血
  }

  spawn({ x, y, vx, vy, damage, range, w, h, isEX = false, piercing = false }) {
    this.reset();
    this.x = x; this.y = y;
    this.prevX = x; this.prevY = y;
    this.vx = vx; this.vy = vy;
    this.damage = damage;
    this.range = range;
    this.w = w; this.h = h;
    this.isEX = isEX;
    this.piercing = piercing || isEX; // EX 必殺為穿透彈
    if (this.piercing) this.hitEnemies = new Set();
    this.active = true;
  }

  update(dt, enemies = []) {
    if (!this.active) return;

    // 追蹤效果（彎爪勾道具）：緩慢轉向最近敵人
    if (this.homingStrength > 0 && enemies.length > 0) {
      let nearest = null, nearestDist = Infinity;
      for (const e of enemies) {
        if (!e.active) continue;
        const dx = (e.x + e.w / 2) - (this.x + this.w / 2);
        const dy = (e.y + e.h / 2) - (this.y + this.h / 2);
        const d = dx * dx + dy * dy;
        if (d < nearestDist) { nearestDist = d; nearest = { dx, dy }; }
      }
      if (nearest) {
        const speed = Math.hypot(this.vx, this.vy);
        const cur = Math.atan2(this.vy, this.vx);
        const target = Math.atan2(nearest.dy, nearest.dx);
        let diff = target - cur;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const turn = Math.max(-this.homingStrength * dt, Math.min(this.homingStrength * dt, diff));
        this.vx = Math.cos(cur + turn) * speed;
        this.vy = Math.sin(cur + turn) * speed;
      }
    }

    this.prevX = this.x; this.prevY = this.y; // 掃掠碰撞用（高速子彈防穿透）
    const moveX = this.vx * dt;
    const moveY = this.vy * dt;
    this.x += moveX;
    this.y += moveY;
    this.traveled += Math.hypot(moveX, moveY);

    // 超出射程或飛出畫面 → 銷毀
    if (this.traveled >= this.range) this.active = false;
    if (this.x < -50 || this.x > CANVAS_W + 50 || this.y < -50 || this.y > CANVAS_H + 50) {
      this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active) return;
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const r = (this.w / 2) * this.sizeMulti;
    ctx.save();
    if (this.isEX) {
      // EX 巨型穿透彈：金色光暈
      ctx.fillStyle = "#ffd75e";
      ctx.shadowColor = "#ffb300";
      ctx.shadowBlur = 12;
    } else {
      ctx.fillStyle = "#1a1a1a";
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 1.5;
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    if (!this.isEX) ctx.stroke();
    ctx.restore();
  }
}
