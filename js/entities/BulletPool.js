// =====================================================
// BulletPool.js — 子彈物件池（避免頻繁 GC）
// 最多 BULLET_POOL_SIZE 顆活躍子彈；
// 池滿時 deactivate 最舊子彈（FIFO）再使用。
// Task 12：命中分裂 / 爆裂毛 / 炸魚排 AoE / 毒・暈・緩速上彈
// =====================================================
import { Bullet } from "./Bullet.js";
import { rectsOverlap } from "./Entity.js";
import { GameManager } from "../core/GameManager.js";
import { Explosion, SlowPuddle } from "../items/RoomEffects.js";
import { BULLET_POOL_SIZE, EX_ENERGY_PER_HIT } from "../core/Constants.js";

const SPLIT_ANGLE = Math.PI / 4; // 分裂角 ±45°

export class BulletPool {
  constructor(size = BULLET_POOL_SIZE) {
    this.bullets = Array.from({ length: size }, () => new Bullet());
    this._spawnCounter = 0;
  }

  spawn(opts) {
    let bullet = this.bullets.find(b => !b.active);
    if (!bullet) {
      // 池滿：淘汰最早生成的活躍子彈
      bullet = this.bullets.reduce((oldest, b) =>
        b.spawnOrder < oldest.spawnOrder ? b : oldest);
      bullet.active = false;
    }
    bullet.spawn(opts);
    bullet.spawnOrder = this._spawnCounter++;
    bullet.pool = this;
    return bullet;
  }

  update(dt, enemies = [], player = null) {
    this.bullets.forEach(b => b.update(dt, enemies, player));
    if (enemies.length > 0) this.handleEnemyHits(enemies, player);
  }

  // ── 玩家子彈 ↔ 敵人（Section 6 碰撞表）──
  // 命中：敵人扣血 + 擊退 + 狀態異常；玩家 +EX；非穿透彈銷毀
  handleEnemyHits(enemies, player) {
    for (const b of this.bullets) {
      if (!b.active) continue;
      // 掃掠 AABB：涵蓋上一幀→本幀的整段移動路徑，防止高速子彈穿透
      const swept = {
        x: Math.min(b.prevX ?? b.x, b.x),
        y: Math.min(b.prevY ?? b.y, b.y),
        w: Math.abs(b.x - (b.prevX ?? b.x)) + b.w,
        h: Math.abs(b.y - (b.prevY ?? b.y)) + b.h,
      };
      for (const e of enemies) {
        if (!e.active) continue;
        if (b.piercing && b.hitEnemies?.has(e)) continue;
        if (!rectsOverlap(swept, e.hitbox)) continue;

        const knockX = b.knockback > 0 ? Math.sign(b.vx) * b.knockback : 0;
        e.takeDamage(b.effectiveDamage, knockX, 0);
        player?.gainEX(EX_ENERGY_PER_HIT);

        // 命中狀態異常
        if (b.poison) e.applyPoison?.(b.poison.dmg, b.poison.dur);
        if (b.stunOnHit > 0) e.applyStun?.(b.stunOnHit);
        if (b.slowOnHit) e.applySlow?.(b.slowOnHit.dur, b.slowOnHit.amt);

        // 命中分裂（毛球分裂）
        if (b.splitOnHit > 0 && !b.isSplitChild) this.spawnSplitChildren(b, player);

        if (b.piercing) {
          b.hitEnemies.add(e);
        } else {
          this.killBullet(b, enemies);
          break;
        }
      }
    }
  }

  // 分裂：±45° 兩顆子彈（豪雨流星 Synergy 傷害 ×1.2）
  spawnSplitChildren(b, player) {
    const mult = (player || GameManager.getInstance().player)?.splitDamageMult || 1;
    const baseAngle = Math.atan2(b.vy, b.vx);
    const speed = Math.hypot(b.vx, b.vy) || 10;
    for (const sign of [-1, 1]) {
      const a = baseAngle + sign * SPLIT_ANGLE;
      const child = this.spawn({
        x: b.x, y: b.y,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        damage: b.damage * mult, range: 240, w: b.w * 0.8, h: b.h * 0.8,
        piercing: false,
      });
      child.isSplitChild = true;
    }
  }

  // 子彈消滅（命中 / 撞牆 / 射程耗盡）：觸發死亡特效
  killBullet(b, enemies = []) {
    if (!b.active) return;
    b.active = false;
    if (b.isEX || b.isSplitChild) return;

    const gm = GameManager.getInstance();
    const room = gm.currentRoom;
    const player = gm.player;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;

    // 炸魚排：AoE 爆炸（dmg40 半徑80）
    if (b.bombType && room) {
      room.items.push(new Explosion(room, cx, cy, 80, 40));
      // 致命彈幕 Synergy：爆炸同時四向射擊
      if (player?.bombExplosionBullets) this.burst(b, 4);
      // 毒爆地圖 Synergy：散佈毒雲
      if (player?.poisonCloudOnExplode) {
        room.items.push(new SlowPuddle(room, cx, cy, {
          radius: 70, dps: 2, duration: 240, slowAmt: 0.3, poison: true,
        }));
      }
      return;
    }

    // 炸裂毛：消滅時四向爆射
    if (b.explosionBullets > 0) {
      this.burst(b, b.explosionBullets);
      if (player?.poisonCloudOnExplode && room) {
        room.items.push(new SlowPuddle(room, cx, cy, {
          radius: 50, dps: 2, duration: 180, slowAmt: 0.3, poison: true,
        }));
      }
    }
  }

  // 爆裂展開：count 顆小彈，90° 間隔
  burst(b, count) {
    const base = Math.atan2(b.vy, b.vx);
    for (let i = 0; i < count; i++) {
      const a = base + (Math.PI / 2) * i + Math.PI / 4;
      const child = this.spawn({
        x: b.x, y: b.y,
        vx: Math.cos(a) * 9, vy: Math.sin(a) * 9,
        damage: Math.max(1, b.damage * 0.5), range: 200, w: 8, h: 8,
        piercing: false,
      });
      child.isSplitChild = true; // 不再連鎖爆裂
    }
  }

  get activeCount() { return this.bullets.filter(b => b.active).length; }

  clear() { this.bullets.forEach(b => { b.active = false; }); }
}
