// =====================================================
// Screens.js — 全螢幕覆蓋畫面（Task 13）
// 主選單 / 死亡 / 通關 / 暫停；由 StateManager 決定顯示
// =====================================================
import { STATES } from "../core/StateManager.js";
import { SaveManager } from "../core/SaveManager.js";
import { CANVAS_W, CANVAS_H } from "../core/Constants.js";

export class Screens {
  constructor(state, gm) {
    this.state = state;
    this.gm = gm;
    this.blinkTimer = 0;
  }

  update(dt) { this.blinkTimer += dt; }

  draw(ctx) {
    switch (this.state.current) {
      case STATES.MAIN_MENU:  return this.drawMenu(ctx);
      case STATES.PLAYER_DEAD: return this.drawDeath(ctx);
      case STATES.RUN_CLEAR:  return this.drawClear(ctx);
      case STATES.PAUSED:     return this.drawPause(ctx);
    }
  }

  drawBackdrop(ctx, alpha = 0.82) {
    ctx.fillStyle = `rgba(8,8,12,${alpha})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  blinkOn() { return Math.floor(this.blinkTimer / 30) % 2 === 0; }

  // 主選單：標題 + 黑貓剪影 + 最高紀錄 + 開始提示
  drawMenu(ctx) {
    ctx.save();
    this.drawBackdrop(ctx, 0.92);
    const cx = CANVAS_W / 2;

    // 標題
    ctx.fillStyle = "#fff";
    ctx.font = "bold 52px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("黑貓流浪記", cx, 150);
    ctx.font = "16px sans-serif";
    ctx.fillStyle = "#9a9a9a";
    ctx.fillText("Black Cat Wanderer", cx, 182);

    // 黑貓剪影（坐姿 + 紅領結）
    this.drawCatSilhouette(ctx, cx, 270);

    // 最高紀錄
    const best = SaveManager.getBestFloor();
    if (best > 0) {
      ctx.fillStyle = "#ffd75e";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText(`最高抵達：F${best}`, cx, 360);
    }

    if (this.blinkOn()) {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("按 Enter 開始流浪", cx, 410);
    }
    ctx.font = "13px sans-serif";
    ctx.fillStyle = "#777";
    ctx.fillText("A/D 移動  W 跳躍  J 吐毛球  L 必殺  Shift 衝刺  E 道具  Tab 地圖", cx, 460);
    ctx.restore();
  }

  drawCatSilhouette(ctx, cx, cy) {
    ctx.save();
    ctx.fillStyle = "#000";
    ctx.strokeStyle = "#000";
    // 身體
    ctx.beginPath();
    ctx.ellipse(cx, cy + 20, 30, 36, 0, 0, Math.PI * 2);
    ctx.fill();
    // 頭
    ctx.beginPath();
    ctx.arc(cx, cy - 24, 24, 0, Math.PI * 2);
    ctx.fill();
    // 耳朵
    ctx.beginPath();
    ctx.moveTo(cx - 22, cy - 36); ctx.lineTo(cx - 14, cy - 56); ctx.lineTo(cx - 4, cy - 42);
    ctx.moveTo(cx + 4, cy - 42); ctx.lineTo(cx + 14, cy - 56); ctx.lineTo(cx + 22, cy - 36);
    ctx.fill();
    // 尾巴
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx + 26, cy + 40);
    ctx.quadraticCurveTo(cx + 60, cy + 36, cx + 56, cy - 4);
    ctx.stroke();
    // 白圓眼
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cx - 8, cy - 26, 4.5, 0, Math.PI * 2);
    ctx.arc(cx + 8, cy - 26, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // 紅領結
    ctx.fillStyle = "#c8102e";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 2);
    ctx.lineTo(cx - 11, cy - 9); ctx.lineTo(cx - 11, cy + 5); ctx.closePath();
    ctx.moveTo(cx, cy - 2);
    ctx.lineTo(cx + 11, cy - 9); ctx.lineTo(cx + 11, cy + 5); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawDeath(ctx) {
    ctx.save();
    this.drawBackdrop(ctx);
    const cx = CANVAS_W / 2;
    ctx.textAlign = "center";
    ctx.fillStyle = "#c8102e";
    ctx.font = "bold 44px sans-serif";
    ctx.fillText("九命用盡…", cx, 180);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(`本局抵達：F${this.gm.floor}`, cx, 250);
    ctx.fillStyle = "#ffd75e";
    ctx.fillText(`最高紀錄：F${SaveManager.getBestFloor()}`, cx, 285);
    ctx.fillStyle = "#9a9a9a";
    ctx.font = "15px sans-serif";
    ctx.fillText(`小魚乾 ${this.gm.coins}　道具 ${this.gm.items.length} 個`, cx, 320);
    if (this.blinkOn()) {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("按 Enter 回到主選單", cx, 390);
    }
    ctx.restore();
  }

  drawClear(ctx) {
    ctx.save();
    this.drawBackdrop(ctx);
    const cx = CANVAS_W / 2;
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd75e";
    ctx.font = "bold 44px sans-serif";
    ctx.fillText("流浪結束，找到歸宿！", cx, 180);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("擊敗混沌流浪之神，全 7 層通關", cx, 250);
    ctx.fillStyle = "#9a9a9a";
    ctx.font = "15px sans-serif";
    ctx.fillText(`小魚乾 ${this.gm.coins}　道具 ${this.gm.items.length} 個`, cx, 290);
    if (this.blinkOn()) {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("按 Enter 回到主選單", cx, 380);
    }
    ctx.restore();
  }

  drawPause(ctx) {
    ctx.save();
    this.drawBackdrop(ctx, 0.6);
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = "bold 36px sans-serif";
    ctx.fillText("暫停中", CANVAS_W / 2, CANVAS_H / 2 - 10);
    ctx.font = "15px sans-serif";
    ctx.fillStyle = "#9a9a9a";
    ctx.fillText("Esc 繼續", CANVAS_W / 2, CANVAS_H / 2 + 28);
    ctx.restore();
  }
}
