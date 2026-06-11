// =====================================================
// Familiar.js — 跟班系統（道具 36/37/51-70/86）
// FamiliarManager 持有所有跟班；main.js 每幀 update，
// Renderer 經 scene.familiars 繪製。
// 跟班子彈走玩家 BulletPool（同一套敵人碰撞）。
// =====================================================
import { Entity, rectsOverlap } from "../entities/Entity.js";
import { EventBus } from "../core/EventBus.js";
import { GameManager } from "../core/GameManager.js";
import { CANVAS_W, WALL_THICKNESS, FLOOR_Y } from "../core/Constants.js";
import { HeartDrop, SoulHeartDrop, BombDrop, spawnRandomPickup } from "./Drops.js";

const CEILING_Y = 60;

// 各跟班行為設定（kind 決定 update 分支）
const FAMILIAR_CONFIG = {
  36: { kind: "shieldOrbital", radius: 46, color: "#9ad1ff" },        // 毛球護盾：吸收1次傷害，10s 重生
  37: { kind: "blockOrbital", radius: 56, hp: 3, color: "#b78bff" },  // 毛線球：擋彈 HP3，換房重置
  51: { kind: "shooter", offset: { x: -40, y: 0 }, interval: 30, damage: 1, color: "#888" },
  52: { kind: "shooter", offset: { x: 40, y: 0 }, interval: 30, damage: 1, color: "#d2a06e" },
  53: { kind: "aimShooter", offset: { x: -40, y: -30 }, interval: 18, damage: 1.5, color: "#4a2a6a" },
  54: { kind: "aimShooter", offset: { x: 40, y: -30 }, interval: 24, damage: 2, piercing: true, fast: true, color: "#7a8a99" },
  55: { kind: "shooter", offset: { x: -52, y: 10 }, interval: 36, damage: 1, ghost: true, color: "#cfd8e0" },
  56: { kind: "spawner", offset: { x: 30, y: -40 }, interval: 1800, drop: "halfHeart", color: "#f0e0d0" },
  58: { kind: "spawner", offset: { x: -30, y: -40 }, interval: 2700, drop: "soulHeart", color: "#9fb8d8" },
  59: { kind: "aimShooter", offset: { x: 0, y: -44 }, interval: 24, damage: 1, slow: { amt: 0.4, dur: 120 }, color: "#e8e8e8" },
  60: { kind: "aimShooter", offset: { x: 52, y: 0 }, interval: 30, damage: 1, homing: 0.06, color: "#5a7a5a" },
  62: { kind: "mirror", damage: 1, color: "#3a3a5a" },
  63: { kind: "aimShooter", offset: { x: 0, y: -52 }, interval: 36, damage: 1, randomFx: true, color: "#ff9d42" },
  64: { kind: "stomper", damage: 15, color: "#5a4a3a" },
  65: { kind: "bird", damage: 10, lifetime: 300, color: "#c8102e" },  // 報仇小鳥（受傷時臨時生成）
  66: { kind: "bouncer", damage: 5, color: "#8a2a2a" },
  67: { kind: "orbital", radius: 64, count: 2, color: "#fff0c0" },    // 聖光跟班：2 fly 擋彈
  70: { kind: "orbital", radius: 40, count: 2, color: "#e0e0e0" },    // 神聖環繞：小半徑
  68: { kind: "collector", color: "#9a8a5a" },
};

export class Familiar extends Entity {
  constructor(itemId, player, slotIndex = 0) {
    super(player.x, player.y - 40, 20, 20);
    this.itemId = itemId;
    this.cfg = FAMILIAR_CONFIG[itemId];
    this.fireTimer = 0;
    this.orbitAngle = slotIndex * Math.PI; // orbital 双 fly 相位錯開
    this.blockHP = this.cfg.hp || 0;
    this.respawnTimer = 0;   // shieldOrbital 重生倒數
    this.lifetime = this.cfg.lifetime || Infinity; // bird 用
    this.temp = false;       // 86 隨機變身：清房即移除
    this.collectedCoins = 0; // 68 乞丐貓
    this.hitSet = new Set(); // stomper/bouncer 接觸傷害 CD
    this.hitCooldown = 0;
    this.vx = 2; this.vy = 2; // bouncer 用
    this.targetEnemy = null;  // bird 用
  }

  update(dt, player, room, enemies, bulletPool, damageMult) {
    if (!this.active) return;
    const cfg = this.cfg;
    this.fireTimer += dt;
    if (this.hitCooldown > 0) this.hitCooldown -= dt;

    if (this.lifetime !== Infinity) {
      this.lifetime -= dt;
      if (this.lifetime <= 0) { this.active = false; return; }
    }

    switch (cfg.kind) {
      case "shooter": {
        this.followOffset(player, cfg.offset, dt);
        if (this.fireTimer >= cfg.interval) {
          this.fireTimer = 0;
          this.fire(bulletPool, player.facing === 1 ? 0 : Math.PI, damageMult);
        }
        break;
      }
      case "aimShooter": {
        this.followOffset(player, cfg.offset, dt);
        const target = nearestEnemy(enemies, this);
        if (target && this.fireTimer >= cfg.interval) {
          this.fireTimer = 0;
          const angle = Math.atan2(
            target.y + target.h / 2 - (this.y + this.h / 2),
            target.x + target.w / 2 - (this.x + this.w / 2));
          this.fire(bulletPool, angle, damageMult);
        }
        break;
      }
      case "mirror": {
        // 鏡像位置：房間中心對稱
        const cx = CANVAS_W / 2, cy = (FLOOR_Y + CEILING_Y) / 2;
        this.x = cx * 2 - player.x - this.w;
        this.y = Math.max(CEILING_Y, Math.min(FLOOR_Y - this.h, cy * 2 - player.y - this.h));
        // 玩家射擊時反方向開火（與玩家同射速）
        if (player.isShooting && this.fireTimer >= player.fireRate) {
          this.fireTimer = 0;
          this.fire(bulletPool, player.facing === 1 ? Math.PI : 0, damageMult);
        }
        break;
      }
      case "spawner": {
        this.followOffset(player, cfg.offset, dt);
        if (this.fireTimer >= cfg.interval) {
          this.fireTimer = 0;
          const px = player.x + player.w / 2, py = player.y + player.h;
          if (cfg.drop === "halfHeart") room.items.push(new HeartDrop(px, py - 10, 0.5));
          if (cfg.drop === "soulHeart") room.items.push(new SoulHeartDrop(px, py - 10));
        }
        break;
      }
      case "orbital": {
        this.orbitAngle += 0.06 * dt * (1 + (player.speed / 5 - 1) * 0.5); // 速度道具加快
        this.x = player.x + player.w / 2 + Math.cos(this.orbitAngle) * cfg.radius - this.w / 2;
        this.y = player.y + player.h / 2 + Math.sin(this.orbitAngle) * cfg.radius - this.h / 2;
        this.blockEnemyBullets(room);
        break;
      }
      case "shieldOrbital": {
        if (this.respawnTimer > 0) { this.respawnTimer -= dt; return; } // 隱形重生中
        this.orbitAngle += 0.05 * dt;
        this.x = player.x + player.w / 2 + Math.cos(this.orbitAngle) * cfg.radius - this.w / 2;
        this.y = player.y + player.h / 2 + Math.sin(this.orbitAngle) * cfg.radius - this.h / 2;
        // 吸收一發敵彈或一次敵人接觸 → 消失 10s
        if (this.blockEnemyBullets(room) || this.touchingEnemy(enemies)) {
          this.respawnTimer = 600;
        }
        break;
      }
      case "blockOrbital": {
        if (this.blockHP <= 0) return; // 本房已耗盡（roomChanged 重置）
        this.orbitAngle += 0.045 * dt;
        this.x = player.x + player.w / 2 + Math.cos(this.orbitAngle) * cfg.radius - this.w / 2;
        this.y = player.y + player.h / 2 + Math.sin(this.orbitAngle) * cfg.radius - this.h / 2;
        if (this.blockEnemyBullets(room)) this.blockHP--;
        break;
      }
      case "stomper": {
        // 地面巡邏：來回走，踩到地面敵人造成傷害
        this.y = FLOOR_Y - this.h;
        this.x += this.vx * dt;
        if (this.x <= WALL_THICKNESS || this.x + this.w >= CANVAS_W - WALL_THICKNESS) this.vx = -this.vx;
        this.contactDamage(enemies, cfg.damage * damageMult, e => e.y + e.h >= FLOOR_Y - 10);
        break;
      }
      case "bouncer": {
        // 對角線彈跳，接觸傷害（每 12 幀一跳，避免規格的逐幀傷害秒殺）
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (this.x <= WALL_THICKNESS || this.x + this.w >= CANVAS_W - WALL_THICKNESS) this.vx = -this.vx;
        if (this.y <= CEILING_Y || this.y + this.h >= FLOOR_Y) this.vy = -this.vy;
        this.contactDamage(enemies, cfg.damage * damageMult, null, 12);
        break;
      }
      case "bird": {
        // 追擊最近敵人 300 幀
        if (!this.targetEnemy?.active) this.targetEnemy = nearestEnemy(enemies, this);
        const t = this.targetEnemy;
        if (t) {
          const dx = t.x + t.w / 2 - (this.x + this.w / 2);
          const dy = t.y + t.h / 2 - (this.y + this.h / 2);
          const d = Math.hypot(dx, dy) || 1;
          this.x += (dx / d) * 5 * dt;
          this.y += (dy / d) * 5 * dt;
          this.contactDamage(enemies, cfg.damage * damageMult, null, 30);
        }
        break;
      }
      case "collector": {
        // 飛向最近金幣自動撿取；每撿 5 枚掉 1 個隨機補給
        const coin = room.items.find(i => i.active && i.constructor.name === "Coin");
        if (coin) {
          const dx = coin.x - this.x, dy = coin.y - this.y;
          const d = Math.hypot(dx, dy) || 1;
          this.x += (dx / d) * 4 * dt;
          this.y += (dy / d) * 4 * dt;
          if (rectsOverlap(this.hitbox, coin.hitbox)) {
            const gm = GameManager.getInstance();
            gm.coins += 1;
            EventBus.emit("coinPickup", { total: gm.coins });
            coin.active = false;
            this.collectedCoins++;
            if (this.collectedCoins % 5 === 0) {
              spawnRandomPickup(room, this.x + this.w / 2, this.y);
            }
          }
        } else {
          this.followOffset(player, { x: -56, y: -10 }, dt);
        }
        break;
      }
    }
  }

  followOffset(player, offset, dt) {
    const tx = player.x + player.w / 2 + offset.x - this.w / 2;
    const ty = player.y + offset.y;
    this.x += (tx - this.x) * 0.12 * dt;
    this.y += (ty - this.y) * 0.12 * dt;
  }

  fire(bulletPool, angle, damageMult) {
    const cfg = this.cfg;
    const speed = cfg.fast ? 18 : 10;
    let fx = { homing: cfg.homing || 0, slow: cfg.slow || null, ghost: !!cfg.ghost, piercing: !!cfg.piercing };
    if (cfg.randomFx) {
      // 彩虹毛球：隨機一種特效
      const roll = Math.floor(Math.random() * 4);
      fx = {
        homing: roll === 0 ? 0.08 : 0,
        slow: roll === 1 ? { amt: 0.5, dur: 90 } : null,
        ghost: false, piercing: false,
        poison: roll === 2 ? { dmg: 2, dur: 120 } : null,
        splitOnHit: roll === 3 ? 2 : 0,
      };
    }
    const b = bulletPool.spawn({
      x: this.x + this.w / 2 - 4, y: this.y + this.h / 2 - 4,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      damage: cfg.damage * damageMult, range: 420, w: 8, h: 8,
      piercing: fx.piercing,
    });
    b.homingStrength = fx.homing;
    b.ghost = fx.ghost;
    b.slowOnHit = fx.slow;
    b.poison = fx.poison || null;
    b.splitOnHit = fx.splitOnHit || 0;
    b.fromFamiliar = true;
  }

  // 與敵彈/Boss 彈重疊 → 消滅該彈；回傳是否有擋到
  blockEnemyBullets(room) {
    let blocked = false;
    const pools = [room?.enemyBullets || [], room?.boss?.bulletPool?.bullets || []];
    for (const list of pools) {
      for (const b of list) {
        if (b.active && rectsOverlap(this.hitbox, b.hitbox)) {
          b.active = false;
          blocked = true;
        }
      }
    }
    return blocked;
  }

  touchingEnemy(enemies) {
    return enemies.some(e => e.active && rectsOverlap(this.hitbox, e.hitbox));
  }

  contactDamage(enemies, dmg, filter = null, cooldown = 20) {
    if (this.hitCooldown > 0) return;
    for (const e of enemies) {
      if (!e.active || (filter && !filter(e))) continue;
      if (rectsOverlap(this.hitbox, e.hitbox)) {
        e.takeDamage(dmg);
        this.hitCooldown = cooldown;
        break;
      }
    }
  }

  draw(ctx) {
    if (!this.active) return;
    if (this.cfg.kind === "shieldOrbital" && this.respawnTimer > 0) return;
    if (this.cfg.kind === "blockOrbital" && this.blockHP <= 0) return;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    ctx.save();
    // 本體：小剪影圓 + 白點眼（佔位風格與主角一致）
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(cx, cy, this.w / 2, 0, Math.PI * 2);
    ctx.fill();
    // 耳朵（貓型跟班視覺）
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 5);
    ctx.lineTo(cx - 4, cy - 13);
    ctx.lineTo(cx - 1, cy - 6);
    ctx.moveTo(cx + 1, cy - 6);
    ctx.lineTo(cx + 4, cy - 13);
    ctx.lineTo(cx + 7, cy - 5);
    ctx.fill();
    // 識別色光暈
    ctx.strokeStyle = this.cfg.color || "#fff";
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy, this.w / 2 + 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cx + 3, cy - 2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function nearestEnemy(enemies, from) {
  let best = null, bestD = Infinity;
  for (const e of enemies) {
    if (!e.active) continue;
    const d = (e.x - from.x) ** 2 + (e.y - from.y) ** 2;
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

export class FamiliarManager {
  constructor(player, bulletPool) {
    this.player = player;
    this.bulletPool = bulletPool;
    this.familiars = []; // Renderer 持有此陣列引用，不可替換
    this.damageMult = 1; // 貓咪軍團 Synergy 提升

    // 換房：毛線球擋彈 HP 重置、臨時跟班移除
    EventBus.on("roomChanged", () => {
      this.familiars.forEach(f => { if (f.cfg.kind === "blockOrbital") f.blockHP = f.cfg.hp; });
    });
    EventBus.on("roomCleared", () => this.removeTemp());
  }

  // 拾取跟班道具時呼叫；67/70 一次生成 2 個 orbital
  add(itemId) {
    const cfg = FAMILIAR_CONFIG[itemId];
    if (!cfg) return;
    const count = cfg.count || 1;
    for (let i = 0; i < count; i++) {
      this.familiars.push(new Familiar(itemId, this.player, i));
    }
  }

  // 86 隨機變身 / 65 報仇小鳥：臨時跟班
  addTemp(itemId, lifetime = Infinity) {
    const f = new Familiar(itemId, this.player);
    f.temp = lifetime === Infinity;
    if (lifetime !== Infinity) f.lifetime = lifetime;
    this.familiars.push(f);
    return f;
  }

  spawnRandomTemp() {
    const ids = [51, 52, 53, 54, 55, 59, 60, 63];
    this.addTemp(ids[Math.floor(Math.random() * ids.length)]);
  }

  removeTemp() {
    for (const f of this.familiars) if (f.temp) f.active = false;
    this.prune();
  }

  prune() {
    for (let i = this.familiars.length - 1; i >= 0; i--) {
      if (!this.familiars[i].active) this.familiars.splice(i, 1);
    }
  }

  update(dt, room, enemies) {
    for (const f of this.familiars) {
      f.update(dt, this.player, room, enemies, this.bulletPool, this.damageMult);
    }
    this.prune();
  }
}
