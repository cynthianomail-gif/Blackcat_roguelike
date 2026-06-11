// =====================================================
// ItemDisplay.js — 道具取得彈窗（中央覆蓋層）
// 監聽 "itemPickup"：道具名稱 + 說明，2 秒後自動消失
// =====================================================
import { EventBus } from "../core/EventBus.js";
import { CANVAS_W } from "../core/Constants.js";

const SHOW_FRAMES = 120; // 2 秒
const FADE_FRAMES = 20;

export class ItemDisplay {
  constructor() {
    this.item = null;
    this.timer = 0;
    EventBus.on("itemPickup", (item) => {
      this.item = item;
      this.timer = SHOW_FRAMES;
    });
  }

  update(dt) {
    if (this.timer > 0) this.timer -= dt;
  }

  drawOverlay(ctx) {
    if (this.timer <= 0 || !this.item) return;
    const alpha = Math.min(1, this.timer / FADE_FRAMES);
    const cx = CANVAS_W / 2, y = 150;

    ctx.save();
    ctx.globalAlpha = alpha;
    // 背板
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.beginPath();
    ctx.roundRect(cx - 180, y - 28, 360, 64, 8);
    ctx.fill();
    // 名稱
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd75e";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(this.item.name, cx, y);
    // 說明
    ctx.fillStyle = "#fff";
    ctx.font = "13px sans-serif";
    ctx.fillText(this.item.description, cx, y + 22);
    ctx.restore();
  }
}
