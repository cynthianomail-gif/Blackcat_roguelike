// =====================================================
// Entity.js — 所有實體基底類
// 每個 Entity 必須有 { x, y, w, h }（x, y = 左上角座標）
// =====================================================

export class Entity {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.vx = 0; this.vy = 0;
    this.active = true;
  }

  get hitbox() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  update(dt) {}
  draw(ctx) {}
}

// AABB 碰撞（軸對齊矩形）— 全遊戲唯一碰撞函數
export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}
