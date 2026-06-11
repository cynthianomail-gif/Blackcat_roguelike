// =====================================================
// Floor.js — 整層樓的資料（房間圖）
// Task 5 的 RoomGenerator 會產生 grid + rooms；
// Floor 負責目前房間追蹤與房間切換。
// =====================================================
import { EventBus } from "../core/EventBus.js";
import {
  CANVAS_W, WALL_THICKNESS, FLOOR_Y, PLAYER_W, PLAYER_H, DOOR_W,
} from "../core/Constants.js";

const CEILING_Y = WALL_THICKNESS;
const DIR_DELTA = { N: { dx: 0, dy: -1 }, S: { dx: 0, dy: 1 }, E: { dx: 1, dy: 0 }, W: { dx: -1, dy: 0 } };
const OPPOSITE = { N: "S", S: "N", E: "W", W: "E" };

export class Floor {
  constructor(floorNum, grid, rooms, startPos) {
    this.floorNum = floorNum;
    this.grid = grid;       // 2D array：grid[y][x] = Room | null
    this.rooms = rooms;     // 所有 Room 清單
    this.startPos = startPos;
    this.currentPos = { ...startPos };
  }

  get currentRoom() { return this.grid[this.currentPos.y]?.[this.currentPos.x] || null; }

  roomAt(x, y) { return this.grid[y]?.[x] || null; }

  // 經過某方向的門移動到鄰房；回傳新房間（無鄰房回傳 null）
  moveTo(dir, player) {
    const d = DIR_DELTA[dir];
    const nx = this.currentPos.x + d.dx;
    const ny = this.currentPos.y + d.dy;
    const next = this.roomAt(nx, ny);
    if (!next) return null;

    this.currentPos = { x: nx, y: ny };
    next.enter();

    // 把玩家放到對面門的位置
    if (player) this.placePlayerAtDoor(player, OPPOSITE[dir]);

    EventBus.emit("roomChanged", { room: next, dir });
    return next;
  }

  placePlayerAtDoor(player, dir) {
    const midX = CANVAS_W / 2 - PLAYER_W / 2;
    switch (dir) {
      case "W": player.x = WALL_THICKNESS + 4; player.y = FLOOR_Y - PLAYER_H; break;
      case "E": player.x = CANVAS_W - WALL_THICKNESS - PLAYER_W - 4; player.y = FLOOR_Y - PLAYER_H; break;
      case "N": player.x = midX; player.y = CEILING_Y + 4; player.vy = 0; break;
      case "S": player.x = midX; player.y = FLOOR_Y - PLAYER_H; break;
    }
    player.invincibleFrames = Math.max(player.invincibleFrames, 30); // 進房短暫無敵
  }

  // 顯示用：所有已揭示房間
  get revealedRooms() { return this.rooms.filter(r => r.isRevealed); }
}
