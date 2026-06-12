// =====================================================
// Particles.js — 輕量粒子系統（物件池、上限封頂）
// 碎片粒子 + 死亡溶解 ghost（sprite 淡出塌縮）
// 全部是純視覺：不參與碰撞、不影響遊戲邏輯。
// =====================================================
import { getAsset } from "./AssetLoader.js";

const MAX_PARTICLES = 300;
const MAX_GHOSTS = 8;

export class ParticleSystem {
  constructor() {
    this.parts = [];   // {x,y,vx,vy,life,maxLife,size,color,grav}
    this.ghosts = [];  // {img,x,y,w,h,facing,t,maxT}
  }

  burst({ x, y, count = 8, color = "#1a1a1a", speed = 3, grav = 0.15,
          life = 28, size = 3, spread = Math.PI * 2, baseAngle = -Math.PI / 2 }) {
    for (let i = 0; i < count; i++) {
      if (this.parts.length >= MAX_PARTICLES) this.parts.shift(); // FIFO 丟最舊
      const a = baseAngle + (Math.random() - 0.5) * spread;
      const sp = speed * (0.4 + Math.random() * 0.8);
      this.parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life, maxLife: life * (0.6 + Math.random() * 0.4),
        size: size * (0.6 + Math.random() * 0.8), color, grav,
      });
    }
  }

  // 死亡溶解：用敵人最後的 sprite 做淡出＋塌縮（30 幀）
  ghost(enemy) {
    const img = enemy.lastSpriteKey ? getAsset(enemy.lastSpriteKey) : null;
    if (!img) return;
    if (this.ghosts.length >= MAX_GHOSTS) this.ghosts.shift();
    this.ghosts.push({
      img, x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h,
      w: enemy.w, h: enemy.h, facing: enemy.facing ?? 1, t: 30, maxT: 30,
    });
  }

  update(dt) {
    for (const p of this.parts) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += p.grav * dt;
      p.life -= dt;
    }
    this.parts = this.parts.filter(p => p.life > 0);
    for (const g of this.ghosts) g.t -= dt;
    this.ghosts = this.ghosts.filter(g => g.t > 0);
  }

  draw(ctx) {
    for (const g of this.ghosts) {
      const k = g.t / g.maxT;                  // 1 → 0
      const fit = Math.min(g.w / g.img.width, g.h / g.img.height);
      const dw = g.img.width * fit, dh = g.img.height * fit * (0.3 + 0.7 * k);
      ctx.save();
      ctx.globalAlpha = k * 0.8;
      ctx.translate(g.x, g.y);
      ctx.scale(-(g.facing) * (1 + (1 - k) * 0.3), 1); // 塌縮時微微攤開
      ctx.drawImage(g.img, -dw / 2, -dh, dw, dh);
      ctx.restore();
    }
    for (const p of this.parts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.restore();
    }
  }
}

export const Particles = new ParticleSystem();
