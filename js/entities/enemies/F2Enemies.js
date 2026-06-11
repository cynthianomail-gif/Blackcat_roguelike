// =====================================================
// F2Enemies.js — F2 深夜廚房（Section 7 數值）
// 蟑螂 Cockroach：HP8 速4.5 傷0.5，Z字移動迴避子彈
// 老鼠 Mouse：HP12 速3 傷0.5，跑向道具啃食（無道具則衝撞）
// 廚師機器人（精英）：HP40 傷1，固定站位，360°油滴散射（8顆/3秒）
// =====================================================
import { BaseEnemy } from "./BaseEnemy.js";
import { EnemyBullet } from "./EnemyBullet.js";
import { CANVAS_W, WALL_THICKNESS, FLOOR_Y } from "../../core/Constants.js";

const CEILING_Y = WALL_THICKNESS;

const ROACH_HP = 8, ROACH_SPEED = 4.5, ROACH_DMG = 0.5, ROACH_W = 30, ROACH_H = 16;
const ROACH_ZIGZAG_MIN = 12, ROACH_ZIGZAG_MAX = 32; // 隨機換向間隔（幀）

const MOUSE_HP = 12, MOUSE_SPEED = 3, MOUSE_DMG = 0.5, MOUSE_W = 32, MOUSE_H = 22;
const MOUSE_GNAW_FRAMES = 180; // 啃 3 秒摧毀道具

const CHEF_HP = 40, CHEF_DMG = 1, CHEF_W = 52, CHEF_H = 58;
const CHEF_FIRE_INTERVAL = 180; // 3 秒
const CHEF_BULLET_SPEED = 4;

// ── 蟑螂：地面 Z 字爬行，隨機換向迴避 ───────────────
export class Cockroach extends BaseEnemy {
  constructor(x) {
    super(x, FLOOR_Y - ROACH_H, ROACH_W, ROACH_H, ROACH_HP, ROACH_SPEED, ROACH_DMG);
    this.zigzagTimer = 0;
    this.zigzagDir = 1; // 疊加在追玩家方向上的偏移
    this.legTimer = 0;
  }

  behave(dt, player) {
    this.state = "CHASE";
    this.legTimer += 0.5 * dt;
    this.y = FLOOR_Y - this.h;
    if (!player?.active) return;

    // 朝玩家 + 隨機 Z 字偏移（迴避玩家子彈）
    this.zigzagTimer -= dt;
    if (this.zigzagTimer <= 0) {
      this.zigzagTimer = ROACH_ZIGZAG_MIN + Math.random() * (ROACH_ZIGZAG_MAX - ROACH_ZIGZAG_MIN);
      this.zigzagDir = Math.random() < 0.5 ? -1 : 1;
    }
    const toPlayer = Math.sign((player.x + player.w / 2) - (this.x + this.w / 2)) || 1;
    const dir = Math.random() < 0.7 ? toPlayer : this.zigzagDir; // 7:3 追擊:亂竄
    this.x += dir * this.speed * dt;
    this.facing = dir;
  }

  draw(ctx) {
    if (this.drawSprite(ctx, "enemy_cockroach")) return;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(this.facing || 1, 1);
    // 扁橢圓身體（深棕）
    ctx.fillStyle = this.bodyColor("#4a2f1f");
    ctx.beginPath();
    ctx.ellipse(0, 0, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // 六足（爬行擺動）
    ctx.strokeStyle = this.bodyColor("#4a2f1f");
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      const sway = Math.sin(this.legTimer + i) * 3;
      ctx.beginPath();
      ctx.moveTo(i * 8, this.h / 2 - 2);
      ctx.lineTo(i * 8 + sway, this.h / 2 + 6);
      ctx.stroke();
    }
    // 觸鬚
    ctx.beginPath();
    ctx.moveTo(this.w / 2 - 4, -this.h / 2 + 2);
    ctx.lineTo(this.w / 2 + 8, -this.h / 2 - 6);
    ctx.moveTo(this.w / 2 - 2, -this.h / 2 + 3);
    ctx.lineTo(this.w / 2 + 10, -this.h / 2 - 2);
    ctx.stroke();
    ctx.restore();
    this.drawHPBar(ctx);
  }
}

// ── 老鼠：優先啃道具，無道具則衝撞玩家 ───────────────
export class Mouse extends BaseEnemy {
  constructor(x) {
    super(x, FLOOR_Y - MOUSE_H, MOUSE_W, MOUSE_H, MOUSE_HP, MOUSE_SPEED, MOUSE_DMG);
    this.gnawTimer = 0;
  }

  // 房內可被啃的道具（有 itemId 的拾取物）
  findTargetItem() {
    return this.room?.items.find(i => i.active && i.itemId !== undefined) || null;
  }

  behave(dt, player) {
    this.y = FLOOR_Y - this.h;
    const item = this.findTargetItem();
    const target = item ?? player;
    if (!target) return;

    const tx = target.x + (target.w || 0) / 2;
    const dx = tx - (this.x + this.w / 2);

    if (item && Math.abs(dx) < 24) {
      // 啃食：3 秒後摧毀道具
      this.state = "ATTACK";
      this.gnawTimer += dt;
      if (this.gnawTimer >= MOUSE_GNAW_FRAMES) {
        item.active = false;
        this.gnawTimer = 0;
      }
      return;
    }

    this.state = "CHASE";
    this.gnawTimer = 0;
    const dir = Math.sign(dx) || 1;
    this.x += dir * this.speed * dt;
    this.facing = dir;
  }

  draw(ctx) {
    if (this.drawSprite(ctx, "enemy_mouse")) return;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(this.facing || 1, 1);
    // 身體（灰）
    ctx.fillStyle = this.bodyColor("#6e6e6e");
    ctx.beginPath();
    ctx.ellipse(0, 0, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // 耳朵
    ctx.beginPath();
    ctx.arc(this.w / 4, -this.h / 2 + 2, 6, 0, Math.PI * 2);
    ctx.fill();
    // 尾巴
    ctx.strokeStyle = this.bodyColor("#6e6e6e");
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-this.w / 2, 0);
    ctx.quadraticCurveTo(-this.w / 2 - 14, -6, -this.w / 2 - 10, -14);
    ctx.stroke();
    // 眼
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(this.w / 2 - 8, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.drawHPBar(ctx);
  }
}

// ── 廚師機器人（精英）：固定砲台，360° 油滴 8 顆/3秒 ──
export class ChefBot extends BaseEnemy {
  constructor(x) {
    super(x, FLOOR_Y - CHEF_H, CHEF_W, CHEF_H, CHEF_HP, 1, CHEF_DMG);
    this.fireTimer = CHEF_FIRE_INTERVAL * 0.5;
  }

  behave(dt, player) {
    this.state = "ATTACK";
    this.y = FLOOR_Y - this.h; // 固定站位
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = CHEF_FIRE_INTERVAL;
      this.sprayOil();
    }
  }

  sprayOil() {
    if (!this.room) return;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 3;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      this.room.enemyBullets.push(new EnemyBullet(
        cx, cy,
        Math.cos(angle) * CHEF_BULLET_SPEED,
        Math.sin(angle) * CHEF_BULLET_SPEED,
        this.damage, 6,
      ));
    }
  }

  draw(ctx) {
    if (this.drawSprite(ctx, "enemy_chefbot")) return;
    const cx = this.x + this.w / 2;
    ctx.save();
    ctx.translate(cx, this.y);
    // 方形機身（鐵灰）
    ctx.fillStyle = this.bodyColor("#5a5f66");
    ctx.beginPath();
    ctx.roundRect(-this.w / 2, 12, this.w, this.h - 12, 6);
    ctx.fill();
    // 廚師帽（精英辨識特徵）
    ctx.fillStyle = this.bodyColor("#f0f0f0");
    ctx.beginPath();
    ctx.roundRect(-14, -8, 28, 22, 6);
    ctx.fill();
    // 單眼（紅燈）
    ctx.fillStyle = "#c8102e";
    ctx.beginPath();
    ctx.arc(0, 26, 5, 0, Math.PI * 2);
    ctx.fill();
    // 鍋鏟手
    ctx.strokeStyle = this.bodyColor("#5a5f66");
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(this.w / 2, 30);
    ctx.lineTo(this.w / 2 + 12, 18);
    ctx.stroke();
    ctx.restore();
    this.drawHPBar(ctx);
  }
}

// ── F2 房間編成 ──────────────────────────────────────
export function spawnF2Enemies(room, rng) {
  const minX = WALL_THICKNESS + 60;
  const maxX = CANVAS_W - WALL_THICKNESS - 60;
  const randX = () => minX + rng.float() * (maxX - minX);

  const roll = rng.float();
  if (roll < 0.5) {
    const roaches = 2 + rng.int(0, 2); // 蟑螂群 2-4
    for (let i = 0; i < roaches; i++) room.enemies.push(new Cockroach(randX()));
  } else if (roll < 0.85) {
    const mice = 2 + rng.int(0, 1);
    for (let i = 0; i < mice; i++) room.enemies.push(new Mouse(randX()));
    if (rng.float() < 0.5) room.enemies.push(new Cockroach(randX()));
  } else {
    room.enemies.push(new ChefBot(randX()));
    room.enemies.push(new Cockroach(randX()));
  }
  room.enemies.forEach(e => { e.room = room; });
}
