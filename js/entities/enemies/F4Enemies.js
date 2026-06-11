// =====================================================
// F4Enemies.js — F4 廢棄倉庫（Section 7 數值）
// 大鼠 GiantRat：HP25 速3.5 傷1，鑽入牆內、從玩家背後突現
// 貨箱機器人 BoxBot：HP20 速0 傷1，固定砲台，每2秒1顆追蹤彈
// 精英鼠王 EliteRat：HP50 速7 傷1.5，高速衝刺（速18/0.3s）+毒爪（中毒2s）
// =====================================================
import { BaseEnemy } from "./BaseEnemy.js";
import { EnemyBullet } from "./EnemyBullet.js";
import { rectsOverlap } from "../Entity.js";
import { CANVAS_W, WALL_THICKNESS, FLOOR_Y } from "../../core/Constants.js";

const CEILING_Y = WALL_THICKNESS;

const GRAT_HP = 25, GRAT_SPEED = 3.5, GRAT_DMG = 1, GRAT_W = 44, GRAT_H = 28;
const GRAT_BURROW_FRAMES = 100;  // 牆內穿行時間
const GRAT_SURFACE_FRAMES = 170; // 地面追擊時間

const BOXBOT_HP = 20, BOXBOT_DMG = 1, BOXBOT_W = 44, BOXBOT_H = 44;
const BOXBOT_FIRE_INTERVAL = 120; // 2 秒
const BOXBOT_BULLET_SPEED = 4;
const BOXBOT_HOMING = 0.03;

const ERAT_HP = 50, ERAT_SPEED = 7, ERAT_DMG = 1.5, ERAT_W = 56, ERAT_H = 36;
const ERAT_DASH_SPEED = 18, ERAT_DASH_FRAMES = 18; // 0.3 秒
const ERAT_DASH_COOLDOWN = 140;
const ERAT_POISON_DUR = 120; // 中毒 2 秒

// ── 大鼠：鑽牆（無敵隱形）→ 玩家背後突現 → 追擊 ──────
export class GiantRat extends BaseEnemy {
  constructor(x) {
    super(x, FLOOR_Y - GRAT_H, GRAT_W, GRAT_H, GRAT_HP, GRAT_SPEED, GRAT_DMG);
    this.burrowed = false;
    this.phaseTimer = GRAT_SURFACE_FRAMES * 0.4;
  }

  behave(dt, player) {
    this.y = FLOOR_Y - this.h;
    this.phaseTimer -= dt;

    if (this.burrowed) {
      this.state = "IDLE";
      if (this.phaseTimer <= 0 && player?.active) {
        // 從玩家背後突現
        this.burrowed = false;
        this.phaseTimer = GRAT_SURFACE_FRAMES;
        const behind = player.facing === 1 ? -70 : 70;
        this.x = Math.max(WALL_THICKNESS, Math.min(
          CANVAS_W - WALL_THICKNESS - this.w,
          player.x + behind));
      }
      return;
    }

    this.state = "CHASE";
    if (player?.active) {
      const dir = Math.sign((player.x + player.w / 2) - (this.x + this.w / 2)) || 1;
      this.x += dir * this.speed * dt;
      this.facing = dir;
    }
    if (this.phaseTimer <= 0) {
      this.burrowed = true; // 鑽回牆內
      this.phaseTimer = GRAT_BURROW_FRAMES;
    }
  }

  // 牆內穿行：無敵 + 不造成接觸傷害
  takeDamage(dmg, kx, ky) {
    if (this.burrowed) return;
    super.takeDamage(dmg, kx, ky);
  }

  update(dt, player) {
    this.contactDamage = !this.burrowed;
    super.update(dt, player);
  }

  draw(ctx) {
    if (this.burrowed) {
      // 只露出地面塵土波紋提示
      ctx.save();
      ctx.strokeStyle = "rgba(110,90,70,0.6)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x + this.w / 2, FLOOR_Y, 12, Math.PI, 0);
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (this.drawSprite(ctx, "enemy_giantrat")) return;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(this.facing || 1, 1);
    ctx.fillStyle = this.bodyColor("#5a4a3a");
    ctx.beginPath();
    ctx.ellipse(0, 0, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // 大耳 + 尖鼻
    ctx.beginPath();
    ctx.arc(this.w / 4, -this.h / 2 + 2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(this.w / 2 - 2, -4);
    ctx.lineTo(this.w / 2 + 10, 0);
    ctx.lineTo(this.w / 2 - 2, 4);
    ctx.closePath();
    ctx.fill();
    // 紅眼
    ctx.fillStyle = "#c8102e";
    ctx.beginPath();
    ctx.arc(this.w / 2 - 10, -4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.drawHPBar(ctx);
  }
}

// ── 貨箱機器人：固定砲台，追蹤彈 ─────────────────────
export class BoxBot extends BaseEnemy {
  constructor(x, y = null) {
    super(x, y ?? FLOOR_Y - BOXBOT_H, BOXBOT_W, BOXBOT_H, BOXBOT_HP, 0, BOXBOT_DMG);
    this.fireTimer = BOXBOT_FIRE_INTERVAL * 0.6;
    this.eyeAngle = 0;
  }

  behave(dt, player) {
    this.state = "ATTACK";
    if (!player?.active) return;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    this.eyeAngle = Math.atan2(
      (player.y + player.h / 2) - cy, (player.x + player.w / 2) - cx);

    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = BOXBOT_FIRE_INTERVAL;
      this.room?.enemyBullets.push(new EnemyBullet(
        cx, cy,
        Math.cos(this.eyeAngle) * BOXBOT_BULLET_SPEED,
        Math.sin(this.eyeAngle) * BOXBOT_BULLET_SPEED,
        this.damage, 6, { homing: BOXBOT_HOMING, life: 360 },
      ));
    }
  }

  draw(ctx) {
    if (this.drawSprite(ctx, "enemy_boxbot", { noFlip: true })) {
      // 紅色瞄準燈疊在素材上（射擊方向預警，玩家需要這資訊）
      ctx.save();
      ctx.fillStyle = "#c8102e";
      ctx.beginPath();
      ctx.arc(this.x + this.w / 2 + Math.cos(this.eyeAngle) * 8,
              this.y + this.h / 2 + Math.sin(this.eyeAngle) * 8, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.translate(this.x, this.y);
    // 木箱
    ctx.fillStyle = this.bodyColor("#8a6f4d");
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, this.w, this.h);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(this.w, this.h);
    ctx.moveTo(this.w, 0); ctx.lineTo(0, this.h);
    ctx.stroke();
    // 砲眼（朝向玩家）
    const ex = this.w / 2 + Math.cos(this.eyeAngle) * 6;
    const ey = this.h / 2 + Math.sin(this.eyeAngle) * 6;
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(this.w / 2, this.h / 2, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c8102e";
    ctx.beginPath();
    ctx.arc(ex, ey, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.drawHPBar(ctx);
  }
}

// ── 精英鼠王：高速衝刺 + 毒爪 ────────────────────────
export class EliteRat extends BaseEnemy {
  constructor(x) {
    super(x, FLOOR_Y - ERAT_H, ERAT_W, ERAT_H, ERAT_HP, ERAT_SPEED, ERAT_DMG);
    this.dashTimer = 0;        // >0 = 衝刺中
    this.dashCooldown = ERAT_DASH_COOLDOWN * 0.5;
    this.dashDir = 1;
  }

  behave(dt, player) {
    this.y = FLOOR_Y - this.h;
    if (!player?.active) return;

    if (this.dashTimer > 0) {
      // 高速衝刺（速度 18，0.3 秒）
      this.state = "ATTACK";
      this.dashTimer -= dt;
      this.x += this.dashDir * ERAT_DASH_SPEED * dt;
      return;
    }

    this.state = "CHASE";
    const dir = Math.sign((player.x + player.w / 2) - (this.x + this.w / 2)) || 1;
    this.x += dir * this.speed * dt;
    this.facing = dir;

    this.dashCooldown -= dt;
    if (this.dashCooldown <= 0) {
      this.dashCooldown = ERAT_DASH_COOLDOWN;
      this.dashTimer = ERAT_DASH_FRAMES;
      this.dashDir = dir;
    }
  }

  update(dt, player) {
    super.update(dt, player);
    // 毒爪：接觸命中後（玩家剛進無敵幀）附加中毒 2 秒
    if (player?.active && player.invincibleFrames > 88 &&
        rectsOverlap(this.hitbox, player.hitbox)) {
      player.applyPoison(0.5, ERAT_POISON_DUR);
    }
  }

  draw(ctx) {
    if (this.drawSprite(ctx, "enemy_eliterat", { facing: this.dashDir || this.facing || 1 })) return;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(this.dashDir || this.facing || 1, 1);
    // 壯碩鼠身（深灰）
    ctx.fillStyle = this.bodyColor("#3f3f46");
    ctx.beginPath();
    ctx.ellipse(0, 0, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.w / 4 + 4, -this.h / 2 + 4, 10, 0, Math.PI * 2);
    ctx.fill();
    // 王冠疤痕（精英特徵：金色刻痕）
    ctx.strokeStyle = "#ffd75e";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-10, -this.h / 2 + 2);
    ctx.lineTo(-4, -this.h / 2 - 6);
    ctx.lineTo(2, -this.h / 2 + 1);
    ctx.lineTo(8, -this.h / 2 - 6);
    ctx.lineTo(14, -this.h / 2 + 2);
    ctx.stroke();
    // 毒爪（綠色）
    ctx.strokeStyle = this.dashTimer > 0 ? "#7ddf64" : "#4a7a40";
    ctx.lineWidth = 3;
    for (const off of [-4, 2, 8]) {
      ctx.beginPath();
      ctx.moveTo(this.w / 2 - 2, off);
      ctx.lineTo(this.w / 2 + 8, off + 4);
      ctx.stroke();
    }
    // 紅眼
    ctx.fillStyle = "#c8102e";
    ctx.beginPath();
    ctx.arc(this.w / 4 + 8, -this.h / 2 + 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.drawHPBar(ctx);
  }
}

// ── F4 房間編成 ──────────────────────────────────────
export function spawnF4Enemies(room, rng) {
  const minX = WALL_THICKNESS + 60;
  const maxX = CANVAS_W - WALL_THICKNESS - 60;
  const randX = () => minX + rng.float() * (maxX - minX);

  const roll = rng.float();
  if (roll < 0.45) {
    const rats = 1 + rng.int(0, 1);
    for (let i = 0; i < rats; i++) room.enemies.push(new GiantRat(randX()));
    room.enemies.push(new BoxBot(randX()));
  } else if (roll < 0.85) {
    const bots = 2 + rng.int(0, 1);
    for (let i = 0; i < bots; i++) room.enemies.push(new BoxBot(randX()));
  } else {
    room.enemies.push(new EliteRat(randX()));
    if (rng.float() < 0.5) room.enemies.push(new GiantRat(randX()));
  }
  room.enemies.forEach(e => { e.room = room; });
}
