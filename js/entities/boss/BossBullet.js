// =====================================================
// BossBullet.js — Boss 彈幕子彈 + 物件池（BOSS_BULLET_POOL=80）
// 羽毛狀橢圓彈；撞牆/命中玩家銷毀
// =====================================================
import { Entity, rectsOverlap } from "../Entity.js";
import {
  CANVAS_W, WALL_THICKNESS, FLOOR_Y, BOSS_BULLET_POOL,
} from "../../core/Constants.js";

const CEILING_Y = WALL_THICKNESS;

export class BossBullet extends Entity {
  constructor() {
    super(0, 0, 14, 14);
    this.active = false;
    this.damage = 1;
    this.spawnOrder = 0;
  }

  spawn({ x, y, vx, vy, damage = 1, bounces = 0 }) {
    this.x = x - this.w / 2; this.y = y - this.h / 2;
    this.vx = vx; this.vy = vy;
    this.damage = damage;
    this.bounces = bounces; // 牆壁彈射次數（鼠王/壓路機彈幕）
    this.active = true;
  }

  update(dt, player) {
    if (!this.active) return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    let reflectX = false, reflectY = false;
    if (this.x <= WALL_THICKNESS) { reflectX = true; this.x = WALL_THICKNESS; }
    if (this.x + this.w >= CANVAS_W - WALL_THICKNESS) { reflectX = true; this.x = CANVAS_W - WALL_THICKNESS - this.w; }
    if (this.y <= CEILING_Y) { reflectY = true; this.y = CEILING_Y; }
    if (this.y + this.h >= FLOOR_Y) { reflectY = true; this.y = FLOOR_Y - this.h; }

    if (reflectX || reflectY) {
      if (this.bounces > 0) {
        this.bounces--;
        if (reflectX) this.vx = -this.vx;
        if (reflectY) this.vy = -this.vy;
      } else {
        this.active = false;
        return;
      }
    }

    if (player?.active && rectsOverlap(this.hitbox, player.hitbox)) {
      player.takeDamage(this.damage);
      this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active) return;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    const angle = Math.atan2(this.vy, this.vx);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    // 羽毛形：白色橢圓 + 黑描邊 + 中軸線
    ctx.fillStyle = "#f4f4f4";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 3; // 粗黑邊：亮彩背景上靠黑邊讀、黑前景上靠亮核心讀
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-7, 0); ctx.lineTo(7, 0);
    ctx.stroke();
    ctx.restore();
  }
}

export class BossBulletPool {
  constructor(size = BOSS_BULLET_POOL) {
    this.bullets = Array.from({ length: size }, () => new BossBullet());
    this._spawnCounter = 0;
  }

  spawn(opts) {
    let b = this.bullets.find(x => !x.active);
    if (!b) {
      b = this.bullets.reduce((oldest, x) =>
        x.spawnOrder < oldest.spawnOrder ? x : oldest);
    }
    b.spawn(opts);
    b.spawnOrder = this._spawnCounter++;
    return b;
  }

  update(dt, player) { this.bullets.forEach(b => b.update(dt, player)); }
  clear() { this.bullets.forEach(b => { b.active = false; }); }
}
