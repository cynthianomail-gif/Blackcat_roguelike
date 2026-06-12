// =====================================================
// MapDisplay.js — 樓層地圖（Tab 按住顯示，中央覆蓋層）
// 已造訪=亮格、已揭示未造訪=暗格、目前房間=白框高亮
// 特殊房間圖示：B=Boss T=道具 S=商店 ?=隱藏 C=挑戰 D=魔鬼 A=天使
// =====================================================
import {
  CANVAS_W, CANVAS_H, GRID_W, GRID_H, ROOM_TYPES, UI_FONT,
} from "../core/Constants.js";

const CELL = 42, GAP = 5;

const TYPE_ICON = {
  [ROOM_TYPES.BOSS]: { text: "B", color: "#ff5e3a" },
  [ROOM_TYPES.TREASURE]: { text: "T", color: "#ffd75e" },
  [ROOM_TYPES.SHOP]: { text: "S", color: "#9ad1ff" },
  [ROOM_TYPES.SECRET]: { text: "?", color: "#b78bff" },
  [ROOM_TYPES.CHALLENGE]: { text: "C", color: "#ff9d42" },
  [ROOM_TYPES.DEVIL]: { text: "D", color: "#c8102e" },
  [ROOM_TYPES.ANGEL]: { text: "A", color: "#ffffff" },
};

export class MapDisplay {
  constructor(input) {
    this.input = input;
    this.floor = null; // main.js 在樓層生成/切換時填入
  }

  draw(ctx) {
    if (!this.input?.mapHeld || !this.floor) return;

    const mapW = GRID_W * (CELL + GAP) - GAP;
    const mapH = GRID_H * (CELL + GAP) - GAP;
    const originX = (CANVAS_W - mapW) / 2;
    const originY = (CANVAS_H - mapH) / 2;

    ctx.save();
    // 背板
    ctx.fillStyle = "rgba(0,0,0,0.78)";
    ctx.beginPath();
    ctx.roundRect(originX - 24, originY - 48, mapW + 48, mapH + 84, 10);
    ctx.fill();

    // 標題
    ctx.fillStyle = "#fff";
    ctx.font = `bold 16px ${UI_FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(`F${this.floor.floorNum} 地圖`, CANVAS_W / 2, originY - 22);

    const cur = this.floor.currentPos;
    for (let gy = 0; gy < GRID_H; gy++) {
      for (let gx = 0; gx < GRID_W; gx++) {
        const room = this.floor.roomAt(gx, gy);
        if (!room) continue;

        // 顯示規則：已揭示才畫；未造訪鄰房 = 暗格輪廓
        const adjacentKnown = this.hasVisitedNeighbor(gx, gy);
        if (!room.isRevealed && !adjacentKnown) continue;

        const x = originX + gx * (CELL + GAP);
        const y = originY + gy * (CELL + GAP);

        ctx.fillStyle = room.isVisited ? "#d8d8d8"
                      : room.isRevealed ? "#777"
                      : "#3a3a3a"; // 未踏入的相鄰房：剪影格
        ctx.beginPath();
        ctx.roundRect(x, y, CELL, CELL, 4);
        ctx.fill();

        // 特殊房圖示（隱藏房未揭示前不出現）
        const icon = TYPE_ICON[room.type];
        if (icon && (room.isRevealed || room.type !== ROOM_TYPES.SECRET)) {
          ctx.fillStyle = icon.color;
          ctx.font = `bold 18px ${UI_FONT}`;
          ctx.fillText(icon.text, x + CELL / 2, y + CELL / 2 + 6);
        }

        // 目前房間：白色粗框高亮
        if (gx === cur.x && gy === cur.y) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(x - 2, y - 2, CELL + 4, CELL + 4, 5);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  // 是否與任一已造訪房間相鄰（Isaac 式：鄰房顯示剪影）
  hasVisitedNeighbor(gx, gy) {
    return [[1,0],[-1,0],[0,1],[0,-1]].some(([dx, dy]) => {
      const r = this.floor.roomAt(gx + dx, gy + dy);
      return r?.isVisited;
    });
  }
}
