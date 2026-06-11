// =====================================================
// F3Enemies.js — F3 雨夜暗巷（Section 7 數值）
// 流浪狗 StrayDog：HP20 速6 傷1，快速衝撞 + 擊退玩家
// 醉漢幽靈 Ghost：HP10 速2 傷0.5，不規則移動，幽靈彈穿牆
// 垃圾桶怪（精英）：HP35 速0 傷1，受傷時吐 5 顆隨機方向子彈
// =====================================================
import { BaseEnemy } from "./BaseEnemy.js";
import { EnemyBullet } from "./EnemyBullet.js";
import { CANVAS_W, WALL_THICKNESS, FLOOR_Y } from "../../core/Constants.js";

const CEILING_Y = WALL_THICKNESS;

const DOG_HP = 20, DOG_SPEED = 6, DOG_DMG = 1, DOG_W = 48, DOG_H = 30;
const DOG_KNOCKBACK = 36;      // 接觸時把玩家推開的距離
const DOG_REST_FRAMES = 50;    // 衝撞後喘息

const GHOST_HP = 10, GHOST_SPEED = 2, GHOST_DMG = 0.5, GHOST_W = 34, GHOST_H = 40;
const GHOST_FIRE_INTERVAL = 150;
const GHOST_BULLET_SPEED = 3.5;

const TRASH_HP = 35, TRASH_DMG = 1, TRASH_W = 46, TRASH_H = 54;
const TRASH_SPIT_SPEED = 5;

// ── 流浪狗：衝撞 → 喘息 → 再衝撞；接觸擊退玩家 ──────
export class StrayDog extends BaseEnemy {
  constructor(x) {
    super(x, FLOOR_Y - DOG_H, DOG_W, DOG_H, DOG_HP, DOG_SPEED, DOG_DMG);
    this.restTimer = 30;
    this.chargeDir = 1;
  }

  behave(dt, player) {
    this.y = FLOOR_Y - this.h;
    if (!player?.active) return;

    if (this.restTimer > 0) {
      this.restTimer -= dt;
      this.state = "IDLE";
      this.facing = Math.sign((player.x) - this.x) || 1;
      if (this.restTimer <= 0) this.chargeDir = this.facing; // 鎖定衝撞方向
      return;
    }

    this.state = "CHASE";
    this.x += this.chargeDir * this.speed * dt;
    this.facing = this.chargeDir;
    // 撞到牆 → 喘息
    if (this.x <= WALL_THICKNESS || this.x + this.w >= CANVAS_W - WALL_THICKNESS) {
      this.restTimer = DOG_REST_FRAMES;
    }
  }

  update(dt, player) {
    const wasHit = player?.active && !player.isInvincible &&
      player.x < this.x + this.w && player.x + player.w > this.x &&
      player.y < this.y + this.h && player.y + player.h > this.y;
    super.update(dt, player); // 含接觸傷害
    // 接觸成功造成傷害時擊退玩家
    if (wasHit && player.invincibleFrames > 0) {
      player.x += this.chargeDir * DOG_KNOCKBACK;
      player.x = Math.max(WALL_THICKNESS, Math.min(CANVAS_W - WALL_THICKNESS - player.w, player.x));
      this.restTimer = DOG_REST_FRAMES;
    }
  }

  draw(ctx) {
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(this.facing || 1, 1);
    // 低伏身軀（暗灰棕）
    ctx.fillStyle = this.bodyColor("#3d3630");
    ctx.beginPath();
    ctx.roundRect(-this.w / 2, -this.h / 2 + 4, this.w - 8, this.h - 4, 8);
    ctx.fill();
    // 頭（前傾）
    ctx.beginPath();
    ctx.roundRect(this.w / 2 - 18, -this.h / 2 - 4, 20, 18, 5);
    ctx.fill();
    // 耳
    ctx.beginPath();
    ctx.moveTo(this.w / 2 - 16, -this.h / 2 - 4);
    ctx.lineTo(this.w / 2 - 12, -this.h / 2 - 14);
    ctx.lineTo(this.w / 2 - 6, -this.h / 2 - 4);
    ctx.closePath();
    ctx.fill();
    // 紅眼
    ctx.fillStyle = "#c8102e";
    ctx.beginPath();
    ctx.arc(this.w / 2 - 6, -this.h / 2 + 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // 四腿
    ctx.strokeStyle = this.bodyColor("#3d3630");
    ctx.lineWidth = 4;
    for (const lx of [-this.w / 2 + 6, -8, 6, this.w / 2 - 12]) {
      ctx.beginPath();
      ctx.moveTo(lx, this.h / 2 - 4);
      ctx.lineTo(lx, this.h / 2 + 2);
      ctx.stroke();
    }
    ctx.restore();
    this.drawHPBar(ctx);
  }
}

// ── 醉漢幽靈：飄忽不定，發射穿牆幽靈彈 ───────────────
export class Ghost extends BaseEnemy {
  constructor(x, y) {
    super(x, y, GHOST_W, GHOST_H, GHOST_HP, GHOST_SPEED, GHOST_DMG);
    this.driftTimer = Math.random() * Math.PI * 2;
    this.fireTimer = GHOST_FIRE_INTERVAL * (0.5 + Math.random() * 0.5);
  }

  behave(dt, player) {
    this.state = "CHASE";
    this.driftTimer += 0.04 * dt;
    if (!player?.active) return;

    // 不規則移動：朝玩家緩慢漂 + 大幅正弦擺動
    const dx = (player.x + player.w / 2) - (this.x + this.w / 2);
    const dy = (player.y + player.h / 2) - (this.y + this.h / 2);
    const dist = Math.hypot(dx, dy) || 1;
    this.x += (dx / dist) * this.speed * dt + Math.sin(this.driftTimer * 1.7) * 1.8 * dt;
    this.y += (dy / dist) * this.speed * 0.6 * dt + Math.cos(this.driftTimer) * 2.2 * dt;
    this.facing = dx > 0 ? 1 : -1;

    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = GHOST_FIRE_INTERVAL;
      const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
      this.room?.enemyBullets.push(new EnemyBullet(
        cx, cy,
        (dx / dist) * GHOST_BULLET_SPEED, (dy / dist) * GHOST_BULLET_SPEED,
        this.damage, 6, { ignoreWalls: true, life: 300 },
      ));
      this.state = "ATTACK";
    }
  }

  draw(ctx) {
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    const wave = Math.sin(this.driftTimer * 3) * 3;
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.translate(cx, cy + wave);
    // 半透明鬼影（青白）
    ctx.fillStyle = this.bodyColor("#9fb8c8");
    ctx.beginPath();
    ctx.arc(0, -this.h / 4, this.w / 2, Math.PI, 0);
    // 下襬波浪
    ctx.lineTo(this.w / 2, this.h / 3);
    for (let i = 2; i >= -2; i--) {
      ctx.quadraticCurveTo(i * this.w / 5 + this.w / 10, this.h / 2 + (i % 2 ? 6 : -2),
                           i * this.w / 5, this.h / 3);
    }
    ctx.closePath();
    ctx.fill();
    // 醉態紅暈 + 黑眼
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(-6, -this.h / 4, 3, 0, Math.PI * 2);
    ctx.arc(7, -this.h / 4 + 2, 3, 0, Math.PI * 2); // 歪斜醉眼
    ctx.fill();
    ctx.restore();
    this.drawHPBar(ctx);
  }
}

// ── 垃圾桶怪（精英）：不動；受傷反擊 5 顆隨機彈 ───────
export class TrashcanMonster extends BaseEnemy {
  constructor(x) {
    super(x, FLOOR_Y - TRASH_H, TRASH_W, TRASH_H, TRASH_HP, 0, TRASH_DMG);
    this.lidPop = 0;
  }

  takeDamage(dmg, knockX = 0, knockY = 0) {
    const wasAlive = this.hp > 0 && this.state !== "DEAD";
    super.takeDamage(dmg, 0, 0); // 精英不受擊退
    if (wasAlive && this.active) this.spitTrash();
  }

  spitTrash() {
    if (!this.room) return;
    this.lidPop = 10;
    const cx = this.x + this.w / 2, cy = this.y + 6;
    for (let i = 0; i < 5; i++) {
      // 隨機方向（偏上半圓，像從桶口噴出）
      const angle = Math.PI + Math.random() * Math.PI;
      this.room.enemyBullets.push(new EnemyBullet(
        cx, cy,
        Math.cos(angle) * TRASH_SPIT_SPEED,
        Math.sin(angle) * TRASH_SPIT_SPEED,
        this.damage, 5,
      ));
    }
  }

  behave(dt) {
    this.state = "IDLE";
    if (this.lidPop > 0) this.lidPop -= dt;
    this.y = FLOOR_Y - this.h;
  }

  draw(ctx) {
    const cx = this.x + this.w / 2;
    ctx.save();
    ctx.translate(cx, this.y);
    // 桶身（鏽綠）
    ctx.fillStyle = this.bodyColor("#4a5a48");
    ctx.beginPath();
    ctx.roundRect(-this.w / 2, 8, this.w, this.h - 8, 4);
    ctx.fill();
    // 桶蓋（受擊彈起）
    const lidY = this.lidPop > 0 ? -10 - this.lidPop : 0;
    ctx.beginPath();
    ctx.roundRect(-this.w / 2 - 4, lidY, this.w + 8, 10, 3);
    ctx.fill();
    // 偷看的眼睛
    ctx.fillStyle = "#ffd75e";
    ctx.beginPath();
    ctx.arc(-8, 22, 3.5, 0, Math.PI * 2);
    ctx.arc(8, 22, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // 桶身橫紋
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-this.w / 2 + 4, 30); ctx.lineTo(this.w / 2 - 4, 30);
    ctx.moveTo(-this.w / 2 + 4, 42); ctx.lineTo(this.w / 2 - 4, 42);
    ctx.stroke();
    ctx.restore();
    this.drawHPBar(ctx);
  }
}

// ── F3 房間編成 ──────────────────────────────────────
export function spawnF3Enemies(room, rng) {
  const minX = WALL_THICKNESS + 60;
  const maxX = CANVAS_W - WALL_THICKNESS - 60;
  const randX = () => minX + rng.float() * (maxX - minX);
  const airY = () => CEILING_Y + 60 + rng.float() * 180;

  const roll = rng.float();
  if (roll < 0.45) {
    const dogs = 1 + rng.int(0, 1);
    for (let i = 0; i < dogs; i++) room.enemies.push(new StrayDog(randX()));
    if (rng.float() < 0.5) room.enemies.push(new Ghost(randX(), airY()));
  } else if (roll < 0.85) {
    const ghosts = 2 + rng.int(0, 1);
    for (let i = 0; i < ghosts; i++) room.enemies.push(new Ghost(randX(), airY()));
  } else {
    room.enemies.push(new TrashcanMonster(randX()));
    room.enemies.push(new Ghost(randX(), airY()));
  }
  room.enemies.forEach(e => { e.room = room; });
}
