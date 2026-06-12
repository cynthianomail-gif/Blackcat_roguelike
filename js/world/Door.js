// =====================================================
// Door.js — 門的開關邏輯
// 方位：N（天花板開口）/ S（地板開口）/ E（右牆）/ W（左牆）
// 戰鬥中鎖門，清怪後開啟
// =====================================================
import { EventBus } from "../core/EventBus.js";
import {
  CANVAS_W, CANVAS_H, WALL_THICKNESS, FLOOR_Y, DOOR_W, DOOR_H,
} from "../core/Constants.js";

const CEILING_Y = WALL_THICKNESS;

export class Door {
  constructor(dir) {
    this.dir = dir;        // "N" | "S" | "E" | "W"
    this.isOpen = false;
    this.rect = Door.rectFor(dir); // 門的觸發區域（canvas 座標）
  }

  static rectFor(dir) {
    const midX = CANVAS_W / 2 - DOOR_W / 2;
    switch (dir) {
      case "E": return { x: CANVAS_W - WALL_THICKNESS, y: FLOOR_Y - DOOR_H, w: WALL_THICKNESS, h: DOOR_H };
      case "W": return { x: 0, y: FLOOR_Y - DOOR_H, w: WALL_THICKNESS, h: DOOR_H };
      case "N": return { x: midX, y: 0, w: DOOR_W, h: CEILING_Y };
      case "S": return { x: midX, y: FLOOR_Y, w: DOOR_W, h: CANVAS_H - FLOOR_Y };
      default:  return { x: 0, y: 0, w: 0, h: 0 };
    }
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    EventBus.emit("doorOpen", this);
  }

  close() { this.isOpen = false; }

  // BADLAND 視覺語言：門開在純黑牆面上，必須靠亮色才可讀。
  // 開啟＝通道透出暖光（金色脈動緣光）；鎖閉＝紅色發光閘欄。
  draw(ctx) {
    const r = this.rect;
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const pulse = 0.75 + Math.sin(performance.now() * 0.004) * 0.25; // 0.5~1.0 緩慢脈動
    ctx.save();
    // 門洞本體（比牆更深的黑）
    ctx.fillStyle = "#060608";
    ctx.fillRect(r.x, r.y, r.w, r.h);
    if (this.isOpen) {
      // 通道內透出的暖光（徑向漸層，由門內向外）
      const glowR = Math.max(r.w, r.h) * 0.75;
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, glowR);
      grad.addColorStop(0, `rgba(255,219,120,${0.5 * pulse})`);
      grad.addColorStop(0.6, `rgba(255,190,90,${0.18 * pulse})`);
      grad.addColorStop(1, "rgba(255,190,90,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      // 金色緣光門框
      ctx.strokeStyle = `rgba(255,225,150,${0.55 + 0.35 * pulse})`;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#ffd75e";
      ctx.shadowBlur = 8 * pulse;
      ctx.strokeRect(r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3);
    } else {
      // 暗紅門框
      ctx.strokeStyle = "rgba(200,16,46,0.35)";
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
      // 紅色發光閘欄
      ctx.strokeStyle = `rgba(232,60,80,${0.65 + 0.25 * pulse})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = "#c8102e";
      ctx.shadowBlur = 6;
      const bars = 4;
      for (let i = 1; i <= bars; i++) {
        ctx.beginPath();
        if (this.dir === "E" || this.dir === "W") {
          const y = r.y + (r.h / (bars + 1)) * i;
          ctx.moveTo(r.x + 2, y); ctx.lineTo(r.x + r.w - 2, y);
        } else {
          const x = r.x + (r.w / (bars + 1)) * i;
          ctx.moveTo(x, r.y + 2); ctx.lineTo(x, r.y + r.h - 2);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
