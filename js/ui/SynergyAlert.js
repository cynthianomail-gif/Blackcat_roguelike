// =====================================================
// SynergyAlert.js — Synergy 觸發提示橫幅
// 監聽 "synergyActivated"，畫面上方顯示 2.5 秒後淡出
// =====================================================
import { EventBus } from "../core/EventBus.js";
import { CANVAS_W } from "../core/Constants.js";

const SHOW_FRAMES = 150;  // 2.5 秒
const FADE_FRAMES = 30;   // 最後 0.5 秒淡出

export class SynergyAlert {
  constructor() {
    this.text = "";
    this.timer = 0;
    EventBus.on("synergyActivated", (name) => {
      this.text = `✦ SYNERGY：${name} ✦`;
      this.timer = SHOW_FRAMES;
      console.log("synergyActivated:", name); // 驗收：Console 可見
    });
  }

  update(dt) {
    if (this.timer > 0) this.timer -= dt;
  }

  draw(ctx) {
    if (this.timer <= 0) return;
    const alpha = Math.min(1, this.timer / FADE_FRAMES);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    // 描邊白字（深淺背景都清晰）
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.strokeText(this.text, CANVAS_W / 2, 110);
    ctx.fillStyle = "#ffd75e";
    ctx.fillText(this.text, CANVAS_W / 2, 110);
    ctx.restore();
  }
}
