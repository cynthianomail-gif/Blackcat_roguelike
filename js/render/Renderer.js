// =====================================================
// Renderer.js — Canvas 渲染管線主控
// 每幀依技術規格書 1.2 順序執行；各步驟 null-safe，
// 系統尚未建立（或素材缺失）時略過，不可崩潰。
// =====================================================
import { CANVAS_W, CANVAS_H, FLOOR_Y, WALL_THICKNESS, TILE_SIZE } from "../core/Constants.js";

export class Renderer {
  constructor(ctx) {
    this.ctx = ctx;
    this.pixelRatio = 1;
    // scene 物件由 main.js 組裝，各欄位可為 null（漸進式接線）
    this.scene = {
      camera: null, room: null, player: null,
      familiars: [], enemies: [], boss: null,
      bullets: [], enemyBullets: [], bossBullets: [],
      hud: null, mapDisplay: null, itemDisplay: null, synergyAlert: null,
      background: null, screens: null, particles: null, transition: null,
    };
  }

  render() {
    const { ctx } = this;
    const s = this.scene;

    // 1. 重設變換並清空（物理像素）→ 套統一縮放（之後全部用邏輯座標）
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = "high";

    // 2. 套用視角偏移
    s.camera?.apply(ctx);

    try {
      // 3. 視差背景層（draw 回傳 false = 素材缺失 → 幾何 fallback）
      if (!s.background?.draw?.(ctx)) this.drawFallbackBackground(ctx);

      // 4. 地板磚塊
      s.room?.drawFloor?.(ctx);

      // 5. 房間物件
      s.room?.drawObjects?.(ctx);

      // 6. 跟班
      (s.familiars || []).forEach(f => f.active && f.draw(ctx));

      // 7. 敵人
      (s.enemies || []).forEach(e => e.active && e.draw(ctx));

      // 8. Boss
      if (s.boss?.active) s.boss.draw(ctx);

      // 9. 所有子彈（玩家 + 敵人 + Boss）
      (s.bullets || []).forEach(b => b.active && b.draw(ctx));
      (s.enemyBullets || []).forEach(b => b.active && b.draw(ctx));
      (s.bossBullets || []).forEach(b => b.active && b.draw(ctx));

      // 9.5 粒子層（死亡溶解 ghost + 碎片）
      s.particles?.draw?.(ctx);

      // 10. 玩家最後畫（永遠在最前面）
      s.player?.draw?.(ctx);

      // 11. 門（覆蓋在實體上）
      s.room?.drawDoors?.(ctx);

      // 12. 牆壁邊框
      s.room?.drawWalls?.(ctx);
    } finally {
      // 13. 還原視角（確保 HUD 不受 Camera 影響）
      s.camera?.reset(ctx);
    }

    // 14-17. HUD 層（不受 Camera 影響）
    s.hud?.draw?.(ctx);
    s.mapDisplay?.draw?.(ctx);
    s.itemDisplay?.drawOverlay?.(ctx);
    s.synergyAlert?.draw?.(ctx);

    // 17.5 轉場層（黑幕/字卡蓋住場景與 HUD，但在全螢幕覆蓋之下）
    s.transition?.draw?.(ctx);

    // 18. 全螢幕覆蓋（主選單/死亡/通關/暫停）
    s.screens?.draw?.(ctx);
  }

  // 房間系統就位前的佔位背景：灰階天空 + 地板線 + 磚塊格
  drawFallbackBackground(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, "#b8c4cc");
    grad.addColorStop(1, "#8a949c");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // 地板
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(0, FLOOR_Y, CANVAS_W, CANVAS_H - FLOOR_Y);
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_W; x += TILE_SIZE) {
      ctx.strokeRect(x, FLOOR_Y, TILE_SIZE, CANVAS_H - FLOOR_Y);
    }

    // 兩側牆壁（佔位）
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, WALL_THICKNESS, CANVAS_H);
    ctx.fillRect(CANVAS_W - WALL_THICKNESS, 0, WALL_THICKNESS, CANVAS_H);
  }
}
