// =====================================================
// Drops.js — 心/魂心/炸彈/鑰匙掉落物（金幣在 Coin.js）
// 噴出 → 重力落地 → 玩家接觸拾取
// =====================================================
import { Entity, rectsOverlap } from "../entities/Entity.js";
import { GameManager } from "../core/GameManager.js";
import { EventBus } from "../core/EventBus.js";
import { CANVAS_W, WALL_THICKNESS, FLOOR_Y } from "../core/Constants.js";
import { Coin } from "./Coin.js";

const DROP_GRAVITY = 0.5;

class BaseDrop extends Entity {
  constructor(x, y, w = 18, h = 18) {
    super(x - w / 2, y - h / 2, w, h);
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = -4 - Math.random() * 2;
    this.bobTimer = Math.random() * Math.PI * 2;
  }

  update(dt, player) {
    if (!this.active) return;
    this.bobTimer += 0.1 * dt;
    this.vy += DROP_GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y + this.h >= FLOOR_Y) {
      this.y = FLOOR_Y - this.h;
      this.vy = 0;
      this.vx *= 0.85;
    }
    this.x = Math.max(WALL_THICKNESS, Math.min(CANVAS_W - WALL_THICKNESS - this.w, this.x));

    if (player?.active && rectsOverlap(this.hitbox, player.hitbox)) {
      this.onPickup(player, GameManager.getInstance());
      this.active = false;
    }
  }

  onPickup(player, gm) {}
}

// 紅心：回復 amount 格（0.5 = 半顆）
export class HeartDrop extends BaseDrop {
  constructor(x, y, amount = 1) {
    super(x, y);
    this.amount = amount;
  }
  onPickup(player) {
    player.heal(this.amount);
    EventBus.emit("heartPickup", { amount: this.amount });
  }
  draw(ctx) {
    if (!this.active) return;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    const s = this.w * (this.amount < 1 ? 0.75 : 1);
    drawHeartShape(ctx, cx, cy, s, "#c8102e");
  }
}

// 魂心：+1 魂心（藍色）
export class SoulHeartDrop extends BaseDrop {
  onPickup(player) {
    player.soulHearts += 1;
    EventBus.emit("soulHeartPickup", {});
  }
  draw(ctx) {
    if (!this.active) return;
    drawHeartShape(ctx, this.x + this.w / 2, this.y + this.h / 2, this.w, "#5a8fd1");
  }
}

export class BombDrop extends BaseDrop {
  onPickup(player, gm) {
    gm.bombs += 1;
    EventBus.emit("bombPickup", { total: gm.bombs });
  }
  draw(ctx) {
    if (!this.active) return;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    ctx.save();
    ctx.fillStyle = "#1a1a1a";
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, this.w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#c8102e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - this.h / 2);
    ctx.lineTo(cx + 4, cy - this.h / 2 - 5);
    ctx.stroke();
    ctx.restore();
  }
}

export class KeyDrop extends BaseDrop {
  onPickup(player, gm) {
    gm.keys += 1;
    EventBus.emit("keyPickup", { total: gm.keys });
  }
  draw(ctx) {
    if (!this.active) return;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    ctx.save();
    ctx.strokeStyle = "#ffd75e";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy - 4, 4, 0, Math.PI * 2);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy + 8);
    ctx.moveTo(cx, cy + 4);
    ctx.lineTo(cx + 5, cy + 4);
    ctx.moveTo(cx, cy + 8);
    ctx.lineTo(cx + 4, cy + 8);
    ctx.stroke();
    ctx.restore();
  }
}

function drawHeartShape(ctx, cx, cy, s, color) {
  const x = cx - s / 2, y = cy - s / 2;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + s * 0.28, y + s * 0.3, s * 0.28, 0, Math.PI * 2);
  ctx.arc(x + s * 0.72, y + s * 0.3, s * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + s * 0.02, y + s * 0.42);
  ctx.lineTo(x + s * 0.5, y + s);
  ctx.lineTo(x + s * 0.98, y + s * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// 隨機掉落物（coin | heart | bomb）— 獎勵翻倍等道具用
export function spawnRandomPickup(room, x, y) {
  const roll = Math.random();
  if (roll < 0.45) {
    room.items.push(new Coin(x, y));
  } else if (roll < 0.75) {
    room.items.push(new HeartDrop(x, y, 1));
  } else {
    room.items.push(new BombDrop(x, y));
  }
}
