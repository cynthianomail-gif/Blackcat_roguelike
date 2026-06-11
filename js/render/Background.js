// =====================================================
// Background.js — 視差背景層（M4 P2 素材）
// 有圖用圖（bg_f1~bg_f6），無圖回傳 false 讓 Renderer
// 走幾何 fallback。視差：背景以 12% 超掃描繪製，
// 依目前房間在樓層格子中的位置平滑偏移。
// =====================================================
import { CANVAS_W, CANVAS_H } from "../core/Constants.js";
import { getAsset } from "./AssetLoader.js";

const OVERSCAN = 1.12;     // 超出畫布的比例 → 視差可移動空間
const LERP = 0.06;         // 換房時背景滑動的平滑係數

export class ParallaxBackground {
  constructor() {
    this.floor = null;     // main.js 指派目前 Floor（換層時更新引用）
    this.ox = 0.5;         // 目前偏移（0~1，平滑趨近目標）
    this.oy = 0.5;
  }

  // 目前房間在格子中的正規化位置（0~1）
  _target() {
    const f = this.floor;
    if (!f?.grid?.length) return { x: 0.5, y: 0.5 };
    const gw = f.grid[0].length, gh = f.grid.length;
    return {
      x: gw > 1 ? f.currentPos.x / (gw - 1) : 0.5,
      y: gh > 1 ? f.currentPos.y / (gh - 1) : 0.5,
    };
  }

  // 回傳 true = 已繪製；false = 無素材，呼叫端走 fallback
  draw(ctx) {
    const floorNum = this.floor?.floorNum || 1;
    const img = getAsset(`bg_f${Math.min(floorNum, 6)}`); // F7 沿用 F6 神社
    if (!img) return false;

    const t = this._target();
    this.ox += (t.x - this.ox) * LERP;
    this.oy += (t.y - this.oy) * LERP;

    // cover-fit 放大 OVERSCAN 倍，偏移量分攤在超出的邊緣
    const scale = Math.max(CANVAS_W / img.width, CANVAS_H / img.height) * OVERSCAN;
    const dw = img.width * scale, dh = img.height * scale;
    const dx = -(dw - CANVAS_W) * this.ox;
    const dy = -(dh - CANVAS_H) * this.oy;
    ctx.drawImage(img, dx, dy, dw, dh);

    // 底部暗角：讓地板磚與實體輪廓保持可讀
    const veil = ctx.createLinearGradient(0, CANVAS_H * 0.45, 0, CANVAS_H);
    veil.addColorStop(0, "rgba(0,0,0,0)");
    veil.addColorStop(1, floorNum >= 7 ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.28)");
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    return true;
  }
}
