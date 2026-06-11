// =====================================================
// F6Enemies.js — F6 月光神社（Section 7 數值）
// 靈狐 SpiritFox：HP20 速5 傷0.5，二段閃現（瞬移到玩家附近再攻擊）
// 燈籠鬼 Lantern：HP15 速2 傷0.5，懸浮追蹤，死亡爆裂釋放 4 顆子彈
// 石狛犬（精英）：HP80 速2 傷1.5，旋轉石彈，高防禦（-50% 傷害）
// =====================================================
import { BaseEnemy } from "./BaseEnemy.js";
import { EnemyBullet } from "./EnemyBullet.js";
import { rectsOverlap } from "../Entity.js";
import { CANVAS_W, WALL_THICKNESS, FLOOR_Y } from "../../core/Constants.js";

const CEILING_Y = WALL_THICKNESS;

const FOX_HP = 20, FOX_SPEED = 5, FOX_DMG = 0.5, FOX_W = 40, FOX_H = 30;
const FOX_BLINK_TELEGRAPH = 30; // 閃現前兆（淡出）
const FOX_ATTACK_FRAMES = 60;   // 閃現後追擊時間

const LANTERN_HP = 15, LANTERN_SPEED = 2, LANTERN_DMG = 0.5, LANTERN_W = 30, LANTERN_H = 40;
const LANTERN_BURST_SPEED = 4;

const KOMAINU_HP = 80, KOMAINU_SPEED = 2, KOMAINU_DMG = 1.5, KOMAINU_W = 60, KOMAINU_H = 54;
const KOMAINU_DEFENSE = 0.5;     // 受傷減半
const KOMAINU_ORB_COUNT = 2;     // 旋轉石彈數
const KOMAINU_ORB_RADIUS = 55;
const KOMAINU_ORB_DMG = 1;

// ── 靈狐：淡出 → 瞬移玩家附近 → 突進 →（二段）重複 ────
export class SpiritFox extends BaseEnemy {
  constructor(x, y) {
    super(x, y, FOX_W, FOX_H, FOX_HP, FOX_SPEED, FOX_DMG);
    this.phase = "stalk";       // stalk | fade | strike
    this.phaseTimer = 60;
    this.alpha = 1;
    this.blinkCount = 0;        // 連續閃現計數（二段）
  }

  behave(dt, player) {
    if (!player?.active) return;
    this.phaseTimer -= dt;

    if (this.phase === "stalk") {
      // 保持距離游走
      this.state = "CHASE";
      this.alpha = 1;
      const dx = (player.x + player.w / 2) - (this.x + this.w / 2);
      this.x += Math.sign(dx) * this.speed * 0.5 * dt;
      this.facing = dx > 0 ? 1 : -1;
      if (this.phaseTimer <= 0) {
        this.phase = "fade";
        this.phaseTimer = FOX_BLINK_TELEGRAPH;
      }
    } else if (this.phase === "fade") {
      // 淡出前兆 → 瞬移
      this.state = "IDLE";
      this.alpha = Math.max(0.15, this.phaseTimer / FOX_BLINK_TELEGRAPH);
      if (this.phaseTimer <= 0) {
        const side = Math.random() < 0.5 ? -1 : 1;
        this.x = Math.max(WALL_THICKNESS, Math.min(
          CANVAS_W - WALL_THICKNESS - this.w,
          player.x + side * 90));
        this.y = Math.max(CEILING_Y + 20, player.y - 30);
        this.phase = "strike";
        this.phaseTimer = FOX_ATTACK_FRAMES;
        this.blinkCount++;
      }
    } else { // strike：朝玩家直撲
      this.state = "ATTACK";
      this.alpha = 1;
      const dx = (player.x + player.w / 2) - (this.x + this.w / 2);
      const dy = (player.y + player.h / 2) - (this.y + this.h / 2);
      const dist = Math.hypot(dx, dy) || 1;
      this.x += (dx / dist) * this.speed * 1.4 * dt;
      this.y += (dy / dist) * this.speed * 1.4 * dt;
      this.facing = dx > 0 ? 1 : -1;
      if (this.phaseTimer <= 0) {
        // 二段閃現：第一段結束直接再閃；第二段後回到游走
        if (this.blinkCount % 2 === 1) {
          this.phase = "fade";
          this.phaseTimer = FOX_BLINK_TELEGRAPH * 0.5;
        } else {
          this.phase = "stalk";
          this.phaseTimer = 80;
        }
      }
    }
  }

  draw(ctx) {
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(cx, cy);
    ctx.scale(this.facing || 1, 1);
    // 狐身（月白）
    ctx.fillStyle = this.bodyColor("#e8e2d4");
    ctx.beginPath();
    ctx.ellipse(0, 0, this.w / 2, this.h / 2 - 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // 尖耳
    ctx.beginPath();
    ctx.moveTo(this.w / 4 - 6, -this.h / 2 + 2);
    ctx.lineTo(this.w / 4 - 2, -this.h / 2 - 10);
    ctx.lineTo(this.w / 4 + 4, -this.h / 2 + 2);
    ctx.closePath();
    ctx.fill();
    // 大尾（藍火焰感）
    ctx.fillStyle = this.bodyColor("#9ad1ff");
    ctx.beginPath();
    ctx.moveTo(-this.w / 2 + 4, 0);
    ctx.quadraticCurveTo(-this.w - 8, -16, -this.w / 2 - 6, 8);
    ctx.closePath();
    ctx.fill();
    // 紅眼紋
    ctx.strokeStyle = "#c8102e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.w / 4, -4);
    ctx.lineTo(this.w / 4 + 8, -8);
    ctx.stroke();
    ctx.restore();
    this.drawHPBar(ctx);
  }
}

// ── 燈籠鬼：緩慢懸浮追蹤；死亡時四向爆裂 ──────────────
export class Lantern extends BaseEnemy {
  constructor(x, y) {
    super(x, y, LANTERN_W, LANTERN_H, LANTERN_HP, LANTERN_SPEED, LANTERN_DMG);
    this.swing = Math.random() * Math.PI * 2;
  }

  behave(dt, player) {
    this.state = "CHASE";
    this.swing += 0.07 * dt;
    if (!player?.active) return;
    const dx = (player.x + player.w / 2) - (this.x + this.w / 2);
    const dy = (player.y + player.h / 2) - (this.y + this.h / 2);
    const dist = Math.hypot(dx, dy) || 1;
    this.x += (dx / dist) * this.speed * dt;
    this.y += (dy / dist) * this.speed * dt + Math.sin(this.swing) * 0.8 * dt;
  }

  die() {
    // 爆裂：釋放 4 顆子彈（對角四向）
    if (this.room) {
      const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
      for (let i = 0; i < 4; i++) {
        const angle = Math.PI / 4 + (i / 4) * Math.PI * 2;
        this.room.enemyBullets.push(new EnemyBullet(
          cx, cy,
          Math.cos(angle) * LANTERN_BURST_SPEED,
          Math.sin(angle) * LANTERN_BURST_SPEED,
          this.damage, 6,
        ));
      }
    }
    super.die();
  }

  draw(ctx) {
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    const sway = Math.sin(this.swing) * 4;
    ctx.save();
    ctx.translate(cx + sway, cy);
    // 提把
    ctx.strokeStyle = this.bodyColor("#3a3a3a");
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -this.h / 2 + 2, 6, Math.PI, 0);
    ctx.stroke();
    // 燈籠身（暖橘光）
    ctx.fillStyle = this.bodyColor("#ff9d42");
    ctx.shadowColor = "#ff9d42";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.ellipse(0, 2, this.w / 2, this.h / 2 - 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // 骨架橫紋
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1.5;
    for (const oy of [-8, 0, 8]) {
      ctx.beginPath();
      ctx.ellipse(0, 2 + oy, this.w / 2 - 2, 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // 鬼火眼 + 嘴
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(-6, -2, 3, 0, Math.PI * 2);
    ctx.arc(6, -2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 8, 5, 0, Math.PI);
    ctx.fill();
    ctx.restore();
    this.drawHPBar(ctx);
  }
}

// ── 石狛犬（精英）：高防禦緩行 + 旋轉石彈 ─────────────
export class Komainu extends BaseEnemy {
  constructor(x) {
    super(x, FLOOR_Y - KOMAINU_H, KOMAINU_W, KOMAINU_H, KOMAINU_HP, KOMAINU_SPEED, KOMAINU_DMG);
    this.orbAngle = 0;
  }

  takeDamage(dmg, kx, ky) {
    super.takeDamage(dmg * KOMAINU_DEFENSE, 0, 0); // 高防禦：-50%；不受擊退
  }

  behave(dt, player) {
    this.state = "CHASE";
    this.y = FLOOR_Y - this.h;
    this.orbAngle += 0.06 * dt;
    if (!player?.active) return;
    const dir = Math.sign((player.x + player.w / 2) - (this.x + this.w / 2)) || 1;
    this.x += dir * this.speed * dt;
    this.facing = dir;
  }

  update(dt, player) {
    super.update(dt, player);
    // 旋轉石彈：環繞本體，接觸傷害
    if (player?.active && this.state !== "DEAD") {
      for (let i = 0; i < KOMAINU_ORB_COUNT; i++) {
        const pos = this.orbPos(i);
        const orbBox = { x: pos.x - 8, y: pos.y - 8, w: 16, h: 16 };
        if (rectsOverlap(orbBox, player.hitbox)) player.takeDamage(KOMAINU_ORB_DMG);
      }
    }
  }

  orbPos(i) {
    const angle = this.orbAngle + (i / KOMAINU_ORB_COUNT) * Math.PI * 2;
    return {
      x: this.x + this.w / 2 + Math.cos(angle) * KOMAINU_ORB_RADIUS,
      y: this.y + this.h / 2 + Math.sin(angle) * KOMAINU_ORB_RADIUS * 0.7,
    };
  }

  draw(ctx) {
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(this.facing || 1, 1);
    // 石獅身（石灰）
    ctx.fillStyle = this.bodyColor("#8d9296");
    ctx.beginPath();
    ctx.roundRect(-this.w / 2, -this.h / 2 + 10, this.w, this.h - 10, 10);
    ctx.fill();
    // 頭 + 鬃毛捲
    ctx.beginPath();
    ctx.arc(this.w / 4, -this.h / 2 + 8, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(this.w / 4 - 10 + i * 4, -this.h / 2 + 2, 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    // 怒目
    ctx.fillStyle = "#c8102e";
    ctx.beginPath();
    ctx.arc(this.w / 4 + 6, -this.h / 2 + 6, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // 前腳
    ctx.fillStyle = this.bodyColor("#8d9296");
    ctx.fillRect(this.w / 2 - 14, this.h / 2 - 14, 10, 14);
    ctx.fillRect(-this.w / 2 + 6, this.h / 2 - 14, 10, 14);
    ctx.restore();

    // 旋轉石彈
    for (let i = 0; i < KOMAINU_ORB_COUNT; i++) {
      const pos = this.orbPos(i);
      ctx.save();
      ctx.fillStyle = "#6e7378";
      ctx.strokeStyle = "#3a3a3a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    this.drawHPBar(ctx);
  }
}

// ── F6 房間編成 ──────────────────────────────────────
export function spawnF6Enemies(room, rng) {
  const minX = WALL_THICKNESS + 60;
  const maxX = CANVAS_W - WALL_THICKNESS - 60;
  const randX = () => minX + rng.float() * (maxX - minX);
  const airY = () => CEILING_Y + 60 + rng.float() * 160;

  const roll = rng.float();
  if (roll < 0.45) {
    const foxes = 1 + rng.int(0, 1);
    for (let i = 0; i < foxes; i++) room.enemies.push(new SpiritFox(randX(), airY()));
    if (rng.float() < 0.5) room.enemies.push(new Lantern(randX(), airY()));
  } else if (roll < 0.85) {
    const lanterns = 2 + rng.int(0, 1);
    for (let i = 0; i < lanterns; i++) room.enemies.push(new Lantern(randX(), airY()));
  } else {
    room.enemies.push(new Komainu(randX()));
    if (rng.float() < 0.5) room.enemies.push(new Lantern(randX(), airY()));
  }
  room.enemies.forEach(e => { e.room = room; });
}
