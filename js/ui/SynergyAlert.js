// =====================================================
// SynergyAlert.js — Synergy 觸發提示（右上角，3 秒後消失）
// 監聽 "synergyActivated"：「✦ 組合：XXX 觸發！」
// =====================================================
import { EventBus } from "../core/EventBus.js";
import { CANVAS_W, UI_FONT } from "../core/Constants.js";

const SHOW_FRAMES = 180;  // 3 秒
const FADE_FRAMES = 30;   // 最後 0.5 秒淡出

export class SynergyAlert {
  constructor() {
    this.text = "";
    this.timer = 0;
    EventBus.on("synergyActivated", (name) => {
      this.text = `✦ 組合：${name} 觸發！`;
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
    ctx.font = `bold 18px ${UI_FONT}`;
    ctx.textAlign = "right";
    // 描邊金字（深淺背景都清晰）
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.strokeText(this.text, CANVAS_W - 16, 40);
    ctx.fillStyle = "#ffd75e";
    ctx.fillText(this.text, CANVAS_W - 16, 40);
    ctx.restore();
  }
}
