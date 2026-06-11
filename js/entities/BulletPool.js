// =====================================================
// BulletPool.js — 子彈物件池（避免頻繁 GC）
// 最多 BULLET_POOL_SIZE 顆活躍子彈；
// 池滿時 deactivate 最舊子彈（FIFO）再使用。
// =====================================================
import { Bullet } from "./Bullet.js";
import { rectsOverlap } from "./Entity.js";
import { BULLET_POOL_SIZE, EX_ENERGY_PER_HIT } from "../core/Constants.js";

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
    return bullet;
  }

  update(dt, enemies = [], player = null) {
    this.bullets.forEach(b => b.update(dt, enemies));
    if (enemies.length > 0) this.handleEnemyHits(enemies, player);
  }

  // ── 玩家子彈 ↔ 敵人（Section 6 碰撞表）──
  // 命中：敵人扣血 + 擊退；玩家 +EX；非穿透彈銷毀
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
        e.takeDamage(b.damage, knockX, 0);
        player?.gainEX(EX_ENERGY_PER_HIT);

        if (b.piercing) {
          b.hitEnemies.add(e);
        } else {
          b.active = false;
          break;
        }
      }
    }
  }

  get activeCount() { return this.bullets.filter(b => b.active).length; }

  clear() { this.bullets.forEach(b => { b.active = false; }); }
}
