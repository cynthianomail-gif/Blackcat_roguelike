// =====================================================
// Platform.js — 單向跳台（M5.5）
// 只有玩家由上方落下時才站得住；子彈/敵人/跟班全部穿透，
// 既有技能（彈跳毛球/回力標/跟班定位）不受影響。
// 視覺：前景純黑平面 + 白色頂緣，與 BADLAND 美術規則一致。
// =====================================================
import { PLATFORM_H } from "../core/Constants.js";

export class Platform {
  constructor(x, y, w) {
    this.x = x;       // 左緣
    this.y = y;       // 頂面 Y（玩家站立面）
    this.w = w;
    this.h = PLATFORM_H;
  }

  draw(ctx) {
    ctx.save();
    // 本體：前景黑（同地板 #101014）
    ctx.fillStyle = "#101014";
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.w, this.h, 6);
    ctx.fill();
    // 頂緣亮線（站立面提示，亮背景下靠它讀形）
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x + 4, this.y + 1);
    ctx.lineTo(this.x + this.w - 4, this.y + 1);
    ctx.stroke();
    // 底部垂吊小鬚（BADLAND 式有機感）
    ctx.strokeStyle = "rgba(16,16,20,0.9)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    const n = Math.max(2, Math.floor(this.w / 70));
    for (let i = 1; i <= n; i++) {
      const px = this.x + (this.w / (n + 1)) * i;
      ctx.beginPath();
      ctx.moveTo(px, this.y + this.h - 2);
      ctx.quadraticCurveTo(px - 3, this.y + this.h + 8, px + 2, this.y + this.h + 14);
      ctx.stroke();
    }
    ctx.restore();
  }
}
