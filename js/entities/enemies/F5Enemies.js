// =====================================================
// F5Enemies.js — F5 神秘圖書館（Section 7 數值）
// 書魂 BookSoul：HP15 速3 傷0.5，從書架（牆側）直線衝出，衝完消失再刷
// 墨水章魚 Inkpus：HP20 速1.5 傷0.5，噴墨水（地板減速區 3s）/2.5秒
// 圓規怪（精英）：HP45 速3 傷1，旋轉繞場，每 180° 射環形彈（8顆）
// =====================================================
import { BaseEnemy } from "./BaseEnemy.js";
import { EnemyBullet } from "./EnemyBullet.js";
import { Entity, rectsOverlap } from "../Entity.js";
import { CANVAS_W, WALL_THICKNESS, FLOOR_Y } from "../../core/Constants.js";

const CEILING_Y = WALL_THICKNESS;

const BOOK_HP = 15, BOOK_SPEED = 3, BOOK_DMG = 0.5, BOOK_W = 36, BOOK_H = 26;
const BOOK_DASH_SPEED = 7;      // 衝出時的實際速度
const BOOK_RESPAWN_FRAMES = 90; // 消失後再刷間隔

const INK_HP = 20, INK_SPEED = 1.5, INK_DMG = 0.5, INK_W = 44, INK_H = 38;
const INK_SPIT_INTERVAL = 150;  // 2.5 秒
const INK_ZONE_FRAMES = 180;    // 減速區 3 秒

const COMPASS_HP = 45, COMPASS_SPEED = 3, COMPASS_DMG = 1, COMPASS_W = 50, COMPASS_H = 50;
const COMPASS_RING_SPEED = 4.5;

// ── 墨水減速區（掛在 room.items 更新/繪製）────────────
export class InkZone extends Entity {
  constructor(x, w = 90) {
    super(x - w / 2, FLOOR_Y - 8, w, 8);
    this.timer = INK_ZONE_FRAMES;
  }

  update(dt, player) {
    if (!this.active) return;
    this.timer -= dt;
    if (this.timer <= 0) { this.active = false; return; }
    // 玩家踩入 → 持續減速
    if (player?.active && rectsOverlap(this.hitbox, player.hitbox)) {
      player.applySlow(10);
    }
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.globalAlpha = Math.min(0.7, this.timer / 60);
    ctx.fillStyle = "#1a1a2e";
    ctx.beginPath();
    ctx.ellipse(this.x + this.w / 2, FLOOR_Y - 3, this.w / 2, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── 書魂：書架衝出 → 橫越房間 → 消失 → 再刷 ──────────
export class BookSoul extends BaseEnemy {
  constructor(side = 1) {
    // side: 1=左牆出發向右，-1=右牆出發向左
    const x = side === 1 ? WALL_THICKNESS + 2 : CANVAS_W - WALL_THICKNESS - BOOK_W - 2;
    super(x, CEILING_Y + 100, BOOK_W, BOOK_H, BOOK_HP, BOOK_SPEED, BOOK_DMG);
    this.side = side;
    this.dashing = false;
    this.respawnTimer = 30;
    this.flutter = 0;
  }

  behave(dt, player) {
    this.flutter += 0.3 * dt;

    if (!this.dashing) {
      // 隱身蓄勢（牆內，無敵）
      this.state = "IDLE";
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0 && player?.active) {
        this.dashing = true;
        this.state = "ATTACK";
        // 從玩家高度附近的書架衝出
        this.x = this.side === 1 ? WALL_THICKNESS + 2 : CANVAS_W - WALL_THICKNESS - this.w - 2;
        this.y = Math.max(CEILING_Y + 20, Math.min(FLOOR_Y - this.h - 4,
          player.y - 10 + (Math.random() - 0.5) * 60));
        this.facing = this.side;
      }
      return;
    }

    // 直線衝越房間
    this.x += this.side * BOOK_DASH_SPEED * dt;
    this.y += Math.sin(this.flutter) * 0.8 * dt;
    // 衝到對側 → 消失，換邊再刷
    if ((this.side === 1 && this.x + this.w >= CANVAS_W - WALL_THICKNESS - 2) ||
        (this.side === -1 && this.x <= WALL_THICKNESS + 2)) {
      this.dashing = false;
      this.side = -this.side;
      this.respawnTimer = BOOK_RESPAWN_FRAMES;
    }
  }

  // 蓄勢（隱身）期間無敵、無接觸傷害
  takeDamage(dmg, kx, ky) {
    if (!this.dashing) return;
    super.takeDamage(dmg, 0, 0); // 衝刺路線固定，不受擊退
  }

  update(dt, player) {
    this.contactDamage = this.dashing;
    super.update(dt, player);
  }

  clampToRoom() { /* 衝刺需要貼牆起點，沿用自身邊界控制 */ }

  draw(ctx) {
    if (!this.dashing) return; // 牆內隱身
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    const flap = Math.sin(this.flutter * 2) * 10;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(this.facing || 1, 1);
    // 飛行的書（攤開雙頁如翅膀）
    ctx.fillStyle = this.bodyColor("#d8cfc0");
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-this.w / 2, -8 - flap / 2);
    ctx.lineTo(-this.w / 2 + 6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(this.w / 2, -8 - flap);
    ctx.lineTo(this.w / 2 - 6, 6);
    ctx.closePath();
    ctx.fill();
    // 書脊
    ctx.fillStyle = this.bodyColor("#8a4a3a");
    ctx.fillRect(-3, -4, 6, 12);
    // 怨念之眼
    ctx.fillStyle = "#c8102e";
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.drawHPBar(ctx);
  }
}

// ── 墨水章魚：緩慢漂移，定時噴墨（地面減速區）─────────
export class Inkpus extends BaseEnemy {
  constructor(x, y) {
    super(x, y, INK_W, INK_H, INK_HP, INK_SPEED, INK_DMG);
    this.spitTimer = INK_SPIT_INTERVAL * (0.4 + Math.random() * 0.6);
    this.wobble = Math.random() * Math.PI * 2;
  }

  behave(dt, player) {
    this.state = "CHASE";
    this.wobble += 0.06 * dt;
    if (!player?.active) return;

    // 緩慢朝玩家上方漂移
    const dx = (player.x + player.w / 2) - (this.x + this.w / 2);
    this.x += Math.sign(dx) * this.speed * dt;
    this.y += Math.sin(this.wobble) * 1.2 * dt;
    this.facing = dx > 0 ? 1 : -1;

    this.spitTimer -= dt;
    if (this.spitTimer <= 0) {
      this.spitTimer = INK_SPIT_INTERVAL;
      this.state = "ATTACK";
      // 朝玩家腳下噴墨：拋物線下落後留下減速區（簡化：直接在玩家位置生成）
      this.room?.items.push(new InkZone(player.x + player.w / 2));
      // 同時往下吐一顆墨彈
      const cx = this.x + this.w / 2, cy = this.y + this.h;
      const dist = Math.hypot(dx, (player.y - this.y)) || 1;
      this.room?.enemyBullets.push(new EnemyBullet(
        cx, cy, (dx / dist) * 3, Math.abs((player.y - this.y) / dist) * 3 + 1,
        this.damage, 6,
      ));
    }
  }

  draw(ctx) {
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    // 圓頭章魚（墨藍）
    ctx.fillStyle = this.bodyColor("#2a3a5e");
    ctx.beginPath();
    ctx.arc(0, -4, this.w / 2 - 4, 0, Math.PI * 2);
    ctx.fill();
    // 八隻短觸手（波動）
    for (let i = 0; i < 5; i++) {
      const tx = (i - 2) * 8;
      const sway = Math.sin(this.wobble * 2 + i) * 4;
      ctx.beginPath();
      ctx.moveTo(tx, 8);
      ctx.quadraticCurveTo(tx + sway, 16, tx + sway / 2, 20);
      ctx.lineWidth = 4;
      ctx.strokeStyle = this.bodyColor("#2a3a5e");
      ctx.stroke();
    }
    // 眼睛
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-7, -6, 4, 0, Math.PI * 2);
    ctx.arc(7, -6, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(-7, -5, 2, 0, Math.PI * 2);
    ctx.arc(7, -5, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.drawHPBar(ctx);
  }
}

// ── 圓規怪（精英）：圓周繞場，每 180° 環形 8 彈 ────────
export class CompassMonster extends BaseEnemy {
  constructor() {
    super(CANVAS_W / 2 - COMPASS_W / 2, CEILING_Y + 120,
          COMPASS_W, COMPASS_H, COMPASS_HP, COMPASS_SPEED, COMPASS_DMG);
    this.orbitAngle = 0;
    this.lastRingAngle = 0;
    this.centerX = CANVAS_W / 2;
    this.centerY = CEILING_Y + (FLOOR_Y - CEILING_Y) / 2;
    this.radiusX = (CANVAS_W - WALL_THICKNESS * 2) / 2 - 80;
    this.radiusY = (FLOOR_Y - CEILING_Y) / 2 - 60;
  }

  behave(dt) {
    this.state = "ATTACK";
    this.orbitAngle += 0.018 * this.speed * dt;
    this.x = this.centerX + Math.cos(this.orbitAngle) * this.radiusX - this.w / 2;
    this.y = this.centerY + Math.sin(this.orbitAngle) * this.radiusY - this.h / 2;

    // 每旋轉 180° 發射環形彈
    if (this.orbitAngle - this.lastRingAngle >= Math.PI) {
      this.lastRingAngle = this.orbitAngle;
      this.fireRing();
    }
  }

  fireRing() {
    if (!this.room) return;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      this.room.enemyBullets.push(new EnemyBullet(
        cx, cy,
        Math.cos(angle) * COMPASS_RING_SPEED,
        Math.sin(angle) * COMPASS_RING_SPEED,
        this.damage, 6,
      ));
    }
  }

  clampToRoom() { /* 圓周軌道自帶邊界 */ }

  draw(ctx) {
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.orbitAngle * 2);
    // 圓規雙腳（金屬灰 V 形）
    const leg = this.h / 2;
    ctx.strokeStyle = this.bodyColor("#7a7f88");
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, -leg);
    ctx.lineTo(-14, leg);
    ctx.moveTo(0, -leg);
    ctx.lineTo(14, leg);
    ctx.stroke();
    // 鉸接頭
    ctx.fillStyle = this.bodyColor("#ffd75e");
    ctx.beginPath();
    ctx.arc(0, -leg + 2, 8, 0, Math.PI * 2);
    ctx.fill();
    // 針尖
    ctx.fillStyle = "#c8102e";
    ctx.beginPath();
    ctx.arc(-14, leg, 3.5, 0, Math.PI * 2);
    ctx.arc(14, leg, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.drawHPBar(ctx);
  }
}

// ── F5 房間編成 ──────────────────────────────────────
export function spawnF5Enemies(room, rng) {
  const minX = WALL_THICKNESS + 60;
  const maxX = CANVAS_W - WALL_THICKNESS - 60;
  const randX = () => minX + rng.float() * (maxX - minX);
  const airY = () => CEILING_Y + 50 + rng.float() * 140;

  const roll = rng.float();
  if (roll < 0.45) {
    const books = 2 + rng.int(0, 1);
    for (let i = 0; i < books; i++) {
      room.enemies.push(new BookSoul(rng.float() < 0.5 ? 1 : -1));
    }
  } else if (roll < 0.85) {
    const inks = 1 + rng.int(0, 1);
    for (let i = 0; i < inks; i++) room.enemies.push(new Inkpus(randX(), airY()));
    if (rng.float() < 0.5) room.enemies.push(new BookSoul(1));
  } else {
    room.enemies.push(new CompassMonster());
    if (rng.float() < 0.5) room.enemies.push(new Inkpus(randX(), airY()));
  }
  room.enemies.forEach(e => { e.room = room; });
}
