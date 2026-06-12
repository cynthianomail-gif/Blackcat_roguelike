// =====================================================
// Door.js — 門的開關邏輯
// 方位：N（天花板開口）/ S（地板開口）/ E（右牆）/ W（左牆）
// 戰鬥中鎖門，清怪後開啟
// =====================================================
import { EventBus } from "../core/EventBus.js";
import {
  CANVAS_W, CANVAS_H, WALL_THICKNESS, FLOOR_Y, DOOR_W, DOOR_H,
} from "../core/Constants.js";
import { traceOpening } from "../render/DoorShapes.js";

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

  // M8 視覺：門＝牆上挖的洞（FrameSilhouette 已挖好），光從裡面溢出。
  // 開啟＝洞內暖光面＋光錐灑地＋飄浮光塵；鎖閉＝荊棘封口＋深處暗紅餘燼。
  draw(ctx) {
    const r = this.rect;
    const now = performance.now();
    const pulse = 0.75 + Math.sin(now * 0.004) * 0.25;
    ctx.save();
    if (this.isOpen) {
      this._drawSpill(ctx, pulse);
      ctx.beginPath();
      traceOpening(ctx, this.dir, r);
      ctx.fillStyle = `rgba(253,243,220,${0.72 + 0.2 * pulse})`;
      ctx.fill();
      this._drawMotes(ctx, now);
    } else {
      ctx.beginPath();
      traceOpening(ctx, this.dir, r);
      ctx.fillStyle = "#140a10";
      ctx.fill();
      ctx.clip(); // 餘燼與荊棘都限制在洞內
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h * (this.dir === "N" ? 0.35 : 0.6);
      const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, Math.max(r.w, r.h) * 0.4);
      g.addColorStop(0, `rgba(180,40,40,${0.4 * pulse})`);
      g.addColorStop(1, "rgba(180,40,40,0)");
      ctx.fillStyle = g;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      this._drawBrambles(ctx);
    }
    ctx.restore();
  }

  // 光錐＋落地光池（「這是通道」的主要讀法）
  _drawSpill(ctx, pulse) {
    const r = this.rect;
    ctx.fillStyle = `rgba(255,228,150,${0.16 * pulse})`;
    ctx.beginPath();
    if (this.dir === "W") {
      ctx.moveTo(WALL_THICKNESS, FLOOR_Y - 64);
      ctx.lineTo(WALL_THICKNESS + 110, FLOOR_Y);
      ctx.lineTo(WALL_THICKNESS, FLOOR_Y);
    } else if (this.dir === "E") {
      ctx.moveTo(CANVAS_W - WALL_THICKNESS, FLOOR_Y - 64);
      ctx.lineTo(CANVAS_W - WALL_THICKNESS - 110, FLOOR_Y);
      ctx.lineTo(CANVAS_W - WALL_THICKNESS, FLOOR_Y);
    } else if (this.dir === "N") {
      ctx.moveTo(r.x + 8, r.y + r.h);
      ctx.lineTo(r.x + r.w - 8, r.y + r.h);
      ctx.lineTo(r.x + r.w + 16, r.y + r.h + 96);
      ctx.lineTo(r.x - 16, r.y + r.h + 96);
    } else { // S：光由下往上透
      ctx.moveTo(r.x + 6, r.y);
      ctx.lineTo(r.x + r.w - 6, r.y);
      ctx.lineTo(r.x + r.w - 14, r.y - 34);
      ctx.lineTo(r.x + 14, r.y - 34);
    }
    ctx.closePath();
    ctx.fill();
    if (this.dir === "W" || this.dir === "E") {
      const px = this.dir === "W" ? WALL_THICKNESS + 48 : CANVAS_W - WALL_THICKNESS - 48;
      ctx.fillStyle = `rgba(255,236,170,${0.22 * pulse})`;
      ctx.beginPath();
      ctx.ellipse(px, FLOOR_Y, 56, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 洞口光塵：3~4 粒緩慢上飄的微光點（純時間函數，無狀態）
  _drawMotes(ctx, now) {
    const r = this.rect;
    const t = now * 0.001;
    let bx, by; // 光塵基準點（洞口靠遊戲區側）
    switch (this.dir) {
      case "W": bx = WALL_THICKNESS + 14; by = FLOOR_Y - 8; break;
      case "E": bx = CANVAS_W - WALL_THICKNESS - 14; by = FLOOR_Y - 8; break;
      case "N": bx = r.x + r.w / 2; by = r.y + r.h + 40; break;
      default:  bx = r.x + r.w / 2; by = r.y - 4; break; // S
    }
    ctx.fillStyle = "rgba(255,240,190,1)";
    for (let i = 0; i < 4; i++) {
      const rise = (t * 14 + i * 23) % 64;
      const x = bx + Math.sin(t * 0.8 + i * 2.4) * (8 + i * 5);
      const y = by - rise;
      ctx.globalAlpha = 0.7 * (1 - rise / 64);
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // 鎖門封口：交叉粗枝＋小刺，前景純黑（取代霓虹柵欄）
  _drawBrambles(ctx) {
    const r = this.rect;
    ctx.strokeStyle = "#101014";
    ctx.lineCap = "round";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(r.x + 4, r.y + r.h * 0.25);
    ctx.lineTo(r.x + r.w - 4, r.y + r.h * 0.85);
    ctx.moveTo(r.x + r.w - 4, r.y + r.h * 0.2);
    ctx.lineTo(r.x + 4, r.y + r.h * 0.8);
    ctx.stroke();
    ctx.lineWidth = 2.5;
    const thorns = [
      [0.30, 0.42, -7, -5], [0.55, 0.62, 6, -6],
      [0.72, 0.40, 5, 6],   [0.40, 0.72, -6, 5],
    ];
    ctx.beginPath();
    for (const [fx, fy, dx, dy] of thorns) {
      const x = r.x + r.w * fx, y = r.y + r.h * fy;
      ctx.moveTo(x, y);
      ctx.lineTo(x + dx, y + dy);
    }
    ctx.stroke();
  }
}
