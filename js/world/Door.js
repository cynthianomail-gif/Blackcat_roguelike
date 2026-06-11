// =====================================================
// Door.js — 門的開關邏輯
// 方位：N（天花板開口）/ S（地板開口）/ E（右牆）/ W（左牆）
// 戰鬥中鎖門，清怪後開啟
// =====================================================
import { EventBus } from "../core/EventBus.js";
import {
  CANVAS_W, WALL_THICKNESS, FLOOR_Y, DOOR_W, DOOR_H,
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
      case "S": return { x: midX, y: FLOOR_Y, w: DOOR_W, h: CANVAS_W - FLOOR_Y };
      default:  return { x: 0, y: 0, w: 0, h: 0 };
    }
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    EventBus.emit("doorOpen", this);
  }

  close() { this.isOpen = false; }

  draw(ctx) {
    const r = this.rect;
    ctx.save();
    if (this.isOpen) {
      // 開啟：深色通道開口 + 微光提示
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
    } else {
      // 鎖閉：閘欄
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = "#555";
      ctx.lineWidth = 3;
      const bars = 4;
      for (let i = 1; i <= bars; i++) {
        ctx.beginPath();
        if (this.dir === "E" || this.dir === "W") {
          const y = r.y + (r.h / (bars + 1)) * i;
          ctx.moveTo(r.x, y); ctx.lineTo(r.x + r.w, y);
        } else {
          const x = r.x + (r.w / (bars + 1)) * i;
          ctx.moveTo(x, r.y); ctx.lineTo(x, r.y + r.h);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
