// =====================================================
// RoomEffects.js — 主動道具的場域特效實體
// 推入 room.items（Room.update 會呼叫 update 並在
// active=false 時移除；drawObjects 負責繪製）。
// 各實體持有 room 引用以取得敵人清單。
// =====================================================
import { Entity, rectsOverlap } from "../entities/Entity.js";
import { CANVAS_W, WALL_THICKNESS, FLOOR_Y } from "../core/Constants.js";

// ── 爆炸：延遲 fuse 幀後對半徑內敵人造成一次傷害 ──────
export class Explosion extends Entity {
  constructor(room, x, y, radius, damage, fuse = 0) {
    super(x - radius, y - radius, radius * 2, radius * 2);
    this.room = room;
    this.cx = x; this.cy = y;
    this.radius = radius;
    this.damage = damage;
    this.fuse = fuse;
    this.flashFrames = 14; // 爆炸視覺停留
    this.exploded = false;
  }

  update(dt) {
    if (this.fuse > 0) { this.fuse -= dt; return; }
    if (!this.exploded) {
      this.exploded = true;
      for (const e of this.room.enemies) {
        if (!e.active) continue;
        const dx = e.x + e.w / 2 - this.cx, dy = e.y + e.h / 2 - this.cy;
        if (Math.hypot(dx, dy) <= this.radius + Math.max(e.w, e.h) / 2) {
          e.takeDamage(this.damage, Math.sign(dx) * 4, -2);
        }
      }
      if (this.room.boss?.active) {
        const b = this.room.boss;
        const dx = b.x + b.w / 2 - this.cx, dy = b.y + b.h / 2 - this.cy;
        if (Math.hypot(dx, dy) <= this.radius + Math.max(b.w, b.h) / 2) {
          b.takeDamage(this.damage);
        }
      }
    }
    this.flashFrames -= dt;
    if (this.flashFrames <= 0) this.active = false;
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    if (this.fuse > 0) {
      // 引信中：紅圈警示
      ctx.strokeStyle = "rgba(200,16,46,0.6)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, this.radius, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const a = Math.max(0, this.flashFrames / 14);
      ctx.fillStyle = `rgba(255,160,60,${0.55 * a})`;
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, this.radius * (1.2 - 0.2 * a), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,235,180,${0.8 * a})`;
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, this.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ── 光柱（80 利爪天罰）：警示 → 落下 15 傷害 ──────────
export class LightPillar extends Entity {
  constructor(room, x, delay = 30) {
    super(x - 20, 0, 40, FLOOR_Y);
    this.room = room;
    this.delay = delay;     // 警示幀
    this.strikeFrames = 12; // 傷害判定幀
    this.hit = new Set();
  }

  update(dt) {
    if (this.delay > 0) { this.delay -= dt; return; }
    this.strikeFrames -= dt;
    for (const e of this.room.enemies) {
      if (e.active && !this.hit.has(e) && rectsOverlap(this.hitbox, e.hitbox)) {
        e.takeDamage(15);
        this.hit.add(e);
      }
    }
    if (this.strikeFrames <= 0) this.active = false;
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    if (this.delay > 0) {
      ctx.fillStyle = "rgba(255,215,94,0.18)";
      ctx.fillRect(this.x, 0, this.w, FLOOR_Y);
    } else {
      ctx.fillStyle = "rgba(255,245,200,0.85)";
      ctx.fillRect(this.x, 0, this.w, FLOOR_Y);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillRect(this.x + 12, 0, this.w - 24, FLOOR_Y);
    }
    ctx.restore();
  }
}

// ── 落鼠（81 老鼠從天降）：自空中落下，著地 20 傷害 ────
export class FallingRat extends Entity {
  constructor(room, x) {
    super(x - 14, -30, 28, 22);
    this.room = room;
    this.vy = 0;
    this.landed = false;
    this.landFrames = 20;
  }

  update(dt) {
    if (!this.landed) {
      this.vy = Math.min(this.vy + 0.8 * dt, 16);
      this.y += this.vy * dt;
      // 落下途中命中敵人也算
      for (const e of this.room.enemies) {
        if (e.active && rectsOverlap(this.hitbox, e.hitbox)) {
          e.takeDamage(20);
          this.landed = true;
          break;
        }
      }
      if (this.y + this.h >= FLOOR_Y) {
        this.y = FLOOR_Y - this.h;
        this.landed = true;
        // 著地震擊：腳下小範圍傷害
        for (const e of this.room.enemies) {
          if (!e.active) continue;
          const dx = Math.abs(e.x + e.w / 2 - (this.x + this.w / 2));
          if (dx < 60 && e.y + e.h >= FLOOR_Y - 20) e.takeDamage(20);
        }
      }
    } else {
      this.landFrames -= dt;
      if (this.landFrames <= 0) this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active) return;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    ctx.save();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(cx, cy, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // 尾巴
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.x, cy);
    ctx.quadraticCurveTo(this.x - 12, cy - 6, this.x - 16, cy + 2);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cx + 6, cy - 3, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── 緩速水窪（89 墨水陷阱）：對敵減速 + 持續傷害 ───────
export class SlowPuddle extends Entity {
  constructor(room, x, y, { radius = 60, dps = 2, duration = 480, slowAmt = 0.5, poison = false } = {}) {
    super(x - radius, FLOOR_Y - 14, radius * 2, 14);
    this.room = room;
    this.cx = x;
    this.radius = radius;
    this.dps = dps;
    this.duration = duration;
    this.slowAmt = slowAmt;
    this.poison = poison; // 毒爆地圖 Synergy：毒雲視覺
    this.tick = 0;
  }

  update(dt) {
    this.duration -= dt;
    if (this.duration <= 0) { this.active = false; return; }
    this.tick += dt;
    const doDamage = this.tick >= 30; // 每 0.5s 結算一次 dps/2
    if (doDamage) this.tick = 0;
    for (const e of this.room.enemies) {
      if (!e.active) continue;
      const inZone = Math.abs(e.x + e.w / 2 - this.cx) < this.radius &&
                     e.y + e.h >= FLOOR_Y - (this.poison ? 80 : 30);
      if (!inZone) continue;
      e.applySlow?.(10, this.slowAmt);
      if (doDamage) e.takeDamage(this.dps / 2);
    }
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    const fade = Math.min(1, this.duration / 60);
    if (this.poison) {
      // 毒雲：綠色霧團
      ctx.fillStyle = `rgba(110,160,60,${0.35 * fade})`;
      ctx.beginPath();
      ctx.ellipse(this.cx, FLOOR_Y - 36, this.radius, 44, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = `rgba(20,20,40,${0.75 * fade})`;
      ctx.beginPath();
      ctx.ellipse(this.cx, FLOOR_Y - 4, this.radius, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ── 飛彈打擊（82 精準飛爪）：鎖定最高 HP 敵人，
//    2 秒準星跟隨後落下 50 傷害（規格的手動準星簡化為自動鎖定）──
export class TargetStrike extends Entity {
  constructor(room, damage = 50, lockFrames = 120) {
    super(0, 0, 60, 60);
    this.room = room;
    this.damage = damage;
    this.lockFrames = lockFrames;
    this.target = this.pickTarget();
    if (!this.target) this.active = false;
  }

  pickTarget() {
    let best = null;
    for (const e of this.room.enemies) {
      if (e.active && (!best || e.hp > best.hp)) best = e;
    }
    return best || (this.room.boss?.active ? this.room.boss : null);
  }

  update(dt) {
    if (!this.target?.active) this.target = this.pickTarget();
    if (!this.target) { this.active = false; return; }
    this.x = this.target.x + this.target.w / 2 - this.w / 2;
    this.y = this.target.y + this.target.h / 2 - this.h / 2;
    this.lockFrames -= dt;
    if (this.lockFrames <= 0) {
      this.room.items.push(new Explosion(
        this.room, this.x + this.w / 2, this.y + this.h / 2, 70, this.damage));
      this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active) return;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    const r = 24 + (this.lockFrames / 120) * 16;
    ctx.save();
    ctx.strokeStyle = "#c8102e";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.moveTo(cx - r - 6, cy); ctx.lineTo(cx - r + 8, cy);
    ctx.moveTo(cx + r - 8, cy); ctx.lineTo(cx + r + 6, cy);
    ctx.moveTo(cx, cy - r - 6); ctx.lineTo(cx, cy - r + 8);
    ctx.moveTo(cx, cy + r - 8); ctx.lineTo(cx, cy + r + 6);
    ctx.stroke();
    ctx.restore();
  }
}
