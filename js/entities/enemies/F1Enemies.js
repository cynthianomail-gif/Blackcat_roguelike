// =====================================================
// F1Enemies.js — F1 陽光屋頂敵人（Section 7 數值）
// 鴿子 Pigeon：HP6 速4 傷0.5，直線衝向玩家
// 麻雀 Sparrow：HP3 速5 傷0.5，群體移動，3秒射1顆直線子彈
// 胖信鴿 FatPigeon（精英）：HP30 傷1，固定站位，每4秒投彈（半徑60）
// =====================================================
import { BaseEnemy } from "./BaseEnemy.js";
import { EnemyBullet, EnemyBomb } from "./EnemyBullet.js";
import { CANVAS_W, WALL_THICKNESS, FLOOR_Y } from "../../core/Constants.js";

const CEILING_Y = WALL_THICKNESS;

// ── Section 7 數值（F1）──────────────────────────────
const PIGEON_HP = 6, PIGEON_SPEED = 4, PIGEON_DMG = 0.5;
const PIGEON_W = 34, PIGEON_H = 26;
const PIGEON_IDLE_FRAMES = 30;       // 出場停頓，給玩家反應時間

const SPARROW_HP = 3, SPARROW_SPEED = 5, SPARROW_DMG = 0.5;
const SPARROW_W = 24, SPARROW_H = 18;
const SPARROW_FIRE_INTERVAL = 180;   // 3 秒（@60fps）
const SPARROW_BULLET_SPEED = 6;
const SPARROW_HOVER_DIST = 200;      // 與玩家保持的水平距離

const FATPIGEON_HP = 30, FATPIGEON_SPEED = 2, FATPIGEON_DMG = 1;
const FATPIGEON_W = 56, FATPIGEON_H = 50;
const FATPIGEON_BOMB_INTERVAL = 240; // 4 秒
const FATPIGEON_BOMB_RADIUS = 60;
const FATPIGEON_BOMB_FLIGHT = 50;    // 炸彈預計飛行幀數（決定拋物線初速）

// ── 鴿子：直線衝向玩家（飛行，無重力）─────────────────
export class Pigeon extends BaseEnemy {
  constructor(x, y) {
    super(x, y, PIGEON_W, PIGEON_H, PIGEON_HP, PIGEON_SPEED, PIGEON_DMG);
    this.idleTimer = PIGEON_IDLE_FRAMES;
    this.flapTimer = Math.random() * Math.PI * 2;
  }

  behave(dt, player) {
    this.flapTimer += 0.3 * dt;
    if (this.idleTimer > 0) { this.idleTimer -= dt; this.state = "IDLE"; return; }
    this.state = "CHASE";
    if (!player?.active) return;
    const dx = (player.x + player.w / 2) - (this.x + this.w / 2);
    const dy = (player.y + player.h / 2) - (this.y + this.h / 2);
    const dist = Math.hypot(dx, dy) || 1;
    this.x += (dx / dist) * this.speed * dt;
    this.y += (dy / dist) * this.speed * dt;
    if (dx !== 0) this.facing = dx > 0 ? 1 : -1;
  }

  draw(ctx) {
    if (this.drawSprite(ctx, "enemy_pigeon")) return;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(this.facing || 1, 1);
    // 身體（灰色橢圓剪影）
    ctx.fillStyle = this.bodyColor("#5a626a");
    ctx.beginPath();
    ctx.ellipse(0, 0, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // 翅膀（拍動三角形）
    const flap = Math.sin(this.flapTimer) * 8;
    ctx.beginPath();
    ctx.moveTo(-4, -2);
    ctx.lineTo(-14, -10 - flap);
    ctx.lineTo(-12, 2);
    ctx.closePath();
    ctx.fill();
    // 頭 + 喙
    ctx.beginPath();
    ctx.arc(this.w / 2 - 4, -6, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.bodyColor("#e8a13c");
    ctx.beginPath();
    ctx.moveTo(this.w / 2 + 2, -7);
    ctx.lineTo(this.w / 2 + 9, -5);
    ctx.lineTo(this.w / 2 + 2, -3);
    ctx.closePath();
    ctx.fill();
    // 眼
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(this.w / 2 - 3, -7, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.drawHPBar(ctx);
  }
}

// ── 麻雀：群體懸停 + 定時直線子彈 ─────────────────────
export class Sparrow extends BaseEnemy {
  constructor(x, y, flockIndex = 0) {
    super(x, y, SPARROW_W, SPARROW_H, SPARROW_HP, SPARROW_SPEED, SPARROW_DMG);
    this.flockIndex = flockIndex;                 // 群體錯位用
    this.fireTimer = SPARROW_FIRE_INTERVAL * (0.5 + 0.25 * flockIndex); // 錯開射擊
    this.hoverTimer = flockIndex * 1.7;
  }

  behave(dt, player) {
    this.state = "CHASE";
    this.hoverTimer += 0.05 * dt;
    if (!player?.active) return;

    // 群體移動：停在玩家側上方一段距離，依 flockIndex 錯位
    // 高度帶 240~330：玩家跳躍（槍口最高 ≈228）全部搆得到
    const side = (player.x + player.w / 2 < this.x + this.w / 2) ? 1 : -1;
    const targetX = player.x + player.w / 2 + side * (SPARROW_HOVER_DIST + this.flockIndex * 36);
    const targetY = FLOOR_Y - 160 + this.flockIndex * 25 + Math.sin(this.hoverTimer) * 16;
    const dx = targetX - (this.x + this.w / 2);
    const dy = targetY - (this.y + this.h / 2);
    const dist = Math.hypot(dx, dy);
    if (dist > 4) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }
    this.facing = (player.x > this.x) ? 1 : -1;

    // 每 3 秒對玩家射 1 顆直線子彈
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = SPARROW_FIRE_INTERVAL;
      this.shootAt(player);
    }
  }

  shootAt(player) {
    if (!this.room) return;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    const dx = (player.x + player.w / 2) - cx;
    const dy = (player.y + player.h / 2) - cy;
    const dist = Math.hypot(dx, dy) || 1;
    this.room.enemyBullets.push(new EnemyBullet(
      cx, cy,
      (dx / dist) * SPARROW_BULLET_SPEED,
      (dy / dist) * SPARROW_BULLET_SPEED,
      this.damage,
    ));
    this.state = "ATTACK";
  }

  draw(ctx) {
    if (this.drawSprite(ctx, "enemy_sparrow")) return;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(this.facing || 1, 1);
    // 身體（棕色小圓）
    ctx.fillStyle = this.bodyColor("#8a6a4a");
    ctx.beginPath();
    ctx.ellipse(0, 0, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // 尾羽
    ctx.beginPath();
    ctx.moveTo(-this.w / 2, 0);
    ctx.lineTo(-this.w / 2 - 8, -4);
    ctx.lineTo(-this.w / 2 - 8, 4);
    ctx.closePath();
    ctx.fill();
    // 喙
    ctx.fillStyle = this.bodyColor("#e8a13c");
    ctx.beginPath();
    ctx.moveTo(this.w / 2, -2);
    ctx.lineTo(this.w / 2 + 6, 0);
    ctx.lineTo(this.w / 2, 2);
    ctx.closePath();
    ctx.fill();
    // 眼
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(this.w / 2 - 6, -3, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.drawHPBar(ctx);
  }
}

// ── 胖信鴿（精英）：固定站位，每 4 秒投擲炸彈 ──────────
export class FatPigeon extends BaseEnemy {
  constructor(x) {
    super(x, FLOOR_Y - FATPIGEON_H, FATPIGEON_W, FATPIGEON_H,
          FATPIGEON_HP, FATPIGEON_SPEED, FATPIGEON_DMG);
    this.bombTimer = FATPIGEON_BOMB_INTERVAL * 0.6; // 首發稍快
    this.wobble = 0;
  }

  behave(dt, player) {
    this.state = "ATTACK";
    this.wobble += 0.08 * dt;
    this.y = FLOOR_Y - this.h; // 固定站位（擊退後歸位）
    if (!player?.active) return;
    this.facing = (player.x > this.x) ? 1 : -1;

    this.bombTimer -= dt;
    if (this.bombTimer <= 0) {
      this.bombTimer = FATPIGEON_BOMB_INTERVAL;
      this.throwBomb(player);
    }
  }

  throwBomb(player) {
    if (!this.room) return;
    const cx = this.x + this.w / 2, cy = this.y;
    // 以固定飛行幀數反推拋物線初速，讓炸彈落在玩家當前位置
    const t = FATPIGEON_BOMB_FLIGHT;
    const dx = (player.x + player.w / 2) - cx;
    const vx = dx / t;
    const dy = (FLOOR_Y - 8) - cy;
    const vy = (dy - 0.5 * 0.3 * t * t) / t; // dy = vy*t + g*t²/2（g=BOMB_GRAVITY）
    this.room.enemyBullets.push(new EnemyBomb(
      cx, cy, vx, vy, this.damage, FATPIGEON_BOMB_RADIUS,
    ));
  }

  draw(ctx) {
    if (this.drawSprite(ctx, "enemy_fatpigeon")) return;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    const puff = Math.sin(this.wobble) * 2; // 呼吸鼓動
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(this.facing || 1, 1);
    // 圓胖身體
    ctx.fillStyle = this.bodyColor("#6a7278");
    ctx.beginPath();
    ctx.ellipse(0, 2, this.w / 2 + puff, this.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // 頭
    ctx.beginPath();
    ctx.arc(this.w / 4, -this.h / 2 + 4, 11, 0, Math.PI * 2);
    ctx.fill();
    // 信差袋（精英辨識特徵：紅色斜背袋）
    ctx.fillStyle = this.bodyColor("#c8102e");
    ctx.beginPath();
    ctx.roundRect(-this.w / 2 + 6, -4, 16, 14, 3);
    ctx.fill();
    // 喙
    ctx.fillStyle = this.bodyColor("#e8a13c");
    ctx.beginPath();
    ctx.moveTo(this.w / 4 + 9, -this.h / 2 + 2);
    ctx.lineTo(this.w / 4 + 18, -this.h / 2 + 5);
    ctx.lineTo(this.w / 4 + 9, -this.h / 2 + 8);
    ctx.closePath();
    ctx.fill();
    // 眼
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(this.w / 4 + 3, -this.h / 2 + 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.drawHPBar(ctx);
  }
}

// ── 房間敵人生成（RoomGenerator 呼叫；rng = 該層種子）──
// 三種編成：鴿群衝鋒 / 麻雀小隊 / 精英胖信鴿 + 護衛
export function spawnF1Enemies(room, rng) {
  const minX = WALL_THICKNESS + 60;
  const maxX = CANVAS_W - WALL_THICKNESS - 60;
  const airY = () => CEILING_Y + 60 + rng.float() * 160;
  const randX = () => minX + rng.float() * (maxX - minX);

  const roll = rng.float();
  if (roll < 0.5) {
    // 鴿群：2-3 鴿子 + 0-1 麻雀
    const pigeons = 2 + rng.int(0, 1);
    for (let i = 0; i < pigeons; i++) room.enemies.push(new Pigeon(randX(), airY()));
    if (rng.float() < 0.5) room.enemies.push(new Sparrow(randX(), airY(), 0));
  } else if (roll < 0.85) {
    // 麻雀小隊：3-4 隻群體
    const sparrows = 3 + rng.int(0, 1);
    for (let i = 0; i < sparrows; i++) room.enemies.push(new Sparrow(randX(), airY(), i));
  } else {
    // 精英房：胖信鴿 + 1-2 鴿子護衛
    room.enemies.push(new FatPigeon(randX()));
    const guards = 1 + rng.int(0, 1);
    for (let i = 0; i < guards; i++) room.enemies.push(new Pigeon(randX(), airY()));
  }

  room.enemies.forEach(e => { e.room = room; });
}
