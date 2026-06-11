// =====================================================
// Bullet.js — 玩家子彈
// Task 12 引擎完成：piercing / homing / bounces / split /
// returns / hover / arc / ghost / bomb / poison / stun / slow
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
    this.pool = null;    // BulletPool 回填（分裂/爆裂生成新彈用）
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
    // ── Task 12 進階屬性 ──
    this.returns = false;        // 回力標：飛 returnDistance 後折返
    this.returnDistance = 300;
    this.returning = false;
    this.hoverTime = 0;          // 慵懶子彈：懸停幀數後 ×3 加速
    this.hoverElapsed = 0;
    this.hoverDone = false;
    this.gravity = 0;            // 毒魚：拋物線
    this.ghost = false;          // 幽靈彈：穿牆（幽靈尾巴跟班）
    this.splitOnHit = 0;         // 命中分裂數
    this.splitOnBounce = false;  // 彈跳大師 Synergy
    this.explosionBullets = 0;   // 炸裂毛：消滅時爆射數
    this.bombType = false;       // 炸魚排：命中爆炸 AoE
    this.poison = null;          // { dmg, dur }
    this.stunOnHit = 0;          // 鐵頭功：命中暈眩幀數
    this.slowOnHit = null;       // { amt, dur }（毛糰仔跟班）
    this.damagePerPx = 0;        // 遠距獵手：每 px +傷害（上限 ×2）
    this.isCharged = false;      // 蓄力彈（視覺放大）
    this.fromFamiliar = false;
    this.isSplitChild = false;   // 分裂子彈不再分裂
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

  // 命中時的實際傷害（遠距獵手按飛行距離加成）
  get effectiveDamage() {
    if (this.damagePerPx <= 0) return this.damage;
    return Math.min(this.damage + this.damagePerPx * this.traveled, this.damage * 2);
  }

  update(dt, enemies = [], player = null) {
    if (!this.active) return;

    // 慵懶子彈：先懸停，結束時爆衝 ×3
    if (this.hoverTime > 0 && !this.hoverDone) {
      this.hoverElapsed += dt;
      if (this.hoverElapsed >= this.hoverTime) {
        this.hoverDone = true;
        this.vx *= 3; this.vy *= 3;
      } else {
        return; // 懸停中：不移動
      }
    }

    // 追蹤效果（彎爪勾道具）：緩慢轉向最近敵人
    if (this.homingStrength > 0 && enemies.length > 0 && !this.returning) {
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

    // 拋物線（毒魚）
    if (this.gravity > 0) this.vy += this.gravity * dt;

    // 回力標：飛到折返點 → 朝玩家飛回
    if (this.returns && !this.returning && this.traveled >= this.returnDistance) {
      this.returning = true;
      this.range = this.returnDistance * 2 + 200;
      this.hitEnemies?.clear(); // 回程可再次命中
    }
    if (this.returning && player) {
      const speed = Math.hypot(this.vx, this.vy) || 1;
      const dx = player.x + player.w / 2 - (this.x + this.w / 2);
      const dy = player.y + player.h / 2 - (this.y + this.h / 2);
      const d = Math.hypot(dx, dy) || 1;
      this.vx = (dx / d) * speed;
      this.vy = (dy / d) * speed;
      if (d < 24) { this.active = false; return; } // 回到玩家手上
    }

    this.prevX = this.x; this.prevY = this.y; // 掃掠碰撞用（高速子彈防穿透）
    const moveX = this.vx * dt;
    const moveY = this.vy * dt;
    this.x += moveX;
    this.y += moveY;
    this.traveled += Math.hypot(moveX, moveY);

    // 超出射程或飛出畫面 → 銷毀（含爆裂/爆炸效果）
    if (this.traveled >= this.range) this.pool ? this.pool.killBullet(this, enemies) : (this.active = false);
    if (this.x < -50 || this.x > CANVAS_W + 50 || this.y < -50 || this.y > CANVAS_H + 50) {
      this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active) return;
    if (this.hoverTime > 0 && !this.hoverDone && this.hoverElapsed === 0) return;
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const r = (this.w / 2) * this.sizeMulti * (this.isCharged ? 1.6 : 1);
    ctx.save();
    if (this.isEX) {
      // EX 巨型穿透彈：金色光暈
      ctx.fillStyle = "#ffd75e";
      ctx.shadowColor = "#ffb300";
      ctx.shadowBlur = 12;
    } else if (this.bombType) {
      ctx.fillStyle = "#3a2a1a";
      ctx.strokeStyle = "#ff5e3a";
      ctx.lineWidth = 2;
    } else if (this.poison) {
      ctx.fillStyle = "#4a6a2a";
      ctx.strokeStyle = "rgba(160,220,90,0.9)";
      ctx.lineWidth = 1.5;
    } else if (this.ghost) {
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "#cfd8e0";
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1.5;
    } else if (this.isCharged) {
      ctx.fillStyle = "#1a1a1a";
      ctx.shadowColor = "#9ad1ff";
      ctx.shadowBlur = 10;
      ctx.strokeStyle = "rgba(154,209,255,0.9)";
      ctx.lineWidth = 2;
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
