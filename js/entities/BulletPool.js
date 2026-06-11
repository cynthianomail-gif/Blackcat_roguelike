// =====================================================
// BulletPool.js — 子彈物件池（避免頻繁 GC）
// 最多 BULLET_POOL_SIZE 顆活躍子彈；
// 池滿時 deactivate 最舊子彈（FIFO）再使用。
// =====================================================
import { Bullet } from "./Bullet.js";
import { BULLET_POOL_SIZE } from "../core/Constants.js";

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

  update(dt, enemies = []) {
    this.bullets.forEach(b => b.update(dt, enemies));
  }

  get activeCount() { return this.bullets.filter(b => b.active).length; }

  clear() { this.bullets.forEach(b => { b.active = false; }); }
}
