// =====================================================
// RoomGenerator.js — 程序地圖生成（依規格書 Section 5）
// 隨機擴展連通圖；Boss = 最遠房、道具/商店 = 死路；
// 保證每層：BOSS × 1、TREASURE × 1、SHOP × 1
// =====================================================
import { SeededRandom } from "../core/SeededRandom.js";
import { Room } from "./Room.js";
import { Floor } from "./Floor.js";
import { spawnF1Enemies } from "../entities/enemies/F1Enemies.js";
import {
  GRID_W, GRID_H, MIN_ROOMS, MAX_ROOMS, ROOM_TYPES,
} from "../core/Constants.js";

const DIRS = [
  { dx: 1, dy: 0, dir: "E" }, { dx: -1, dy: 0, dir: "W" },
  { dx: 0, dy: 1, dir: "S" }, { dx: 0, dy: -1, dir: "N" },
];

export function generateFloor(floorNum, seed) {
  const rng = new SeededRandom(seed + floorNum * 7919); // 各層不同但可重現
  const grid = Array.from({ length: GRID_H }, () => new Array(GRID_W).fill(null));
  const roomCount = rng.int(MIN_ROOMS, MAX_ROOMS); // 7~13

  // ── Step 1: 起始房放格子中央 ──
  const startPos = { x: Math.floor(GRID_W / 2), y: Math.floor(GRID_H / 2) };
  const startRoom = new Room(ROOM_TYPES.NORMAL, floorNum);
  startRoom.isStart = true;
  startRoom.gridPos = { ...startPos };
  grid[startPos.y][startPos.x] = startRoom;

  const placed = [{ ...startPos }];

  // ── Step 2: 隨機擴展房間（防呆：嘗試上限避免死循環）──
  let attempts = 0;
  while (placed.length < roomCount && attempts < 2000) {
    attempts++;
    const current = rng.pick(placed);
    const d = rng.pick(DIRS);
    const nx = current.x + d.dx;
    const ny = current.y + d.dy;
    if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) continue;
    if (grid[ny][nx] !== null) continue;
    // 防止過長走廊 / 環狀：新位置的已有鄰居數必須 <= 1
    const neighbors = DIRS.filter(dd => grid[ny + dd.dy]?.[nx + dd.dx]);
    if (neighbors.length > 1) continue;

    const room = new Room(ROOM_TYPES.NORMAL, floorNum);
    room.gridPos = { x: nx, y: ny };
    grid[ny][nx] = room;
    placed.push({ x: nx, y: ny });
  }

  // ── Step 3: 分配特殊房間 ──
  const manhattan = (p) => Math.abs(p.x - startPos.x) + Math.abs(p.y - startPos.y);
  const isStart = (p) => p.x === startPos.x && p.y === startPos.y;

  // Boss = 距離 start 最遠的房間
  const bossPos = placed.reduce((max, p) =>
    (manhattan(p) > manhattan(max) && !isStart(p)) ? p : max, placed[placed.length - 1]);
  grid[bossPos.y][bossPos.x].type = ROOM_TYPES.BOSS;

  // 死路清單（鄰居數 == 1，排除 Boss 和 Start）
  const deadEnds = placed.filter(p => {
    if (isStart(p) || (p.x === bossPos.x && p.y === bossPos.y)) return false;
    const n = DIRS.filter(dd => grid[p.y + dd.dy]?.[p.x + dd.dx]).length;
    return n === 1;
  });

  // 後備清單：一般房（保證 TREASURE/SHOP 必出）
  const fallback = placed.filter(p =>
    !isStart(p) && grid[p.y][p.x].type === ROOM_TYPES.NORMAL && !deadEnds.includes(p));

  const takeRoomFor = (type) => {
    let pos = null;
    if (deadEnds.length > 0) {
      pos = rng.pick(deadEnds);
      deadEnds.splice(deadEnds.indexOf(pos), 1);
    } else if (fallback.length > 0) {
      pos = rng.pick(fallback);
      fallback.splice(fallback.indexOf(pos), 1);
    }
    if (pos) grid[pos.y][pos.x].type = type;
    return pos;
  };

  takeRoomFor(ROOM_TYPES.TREASURE);
  takeRoomFor(ROOM_TYPES.SHOP);

  // SECRET：60% 機率，與某普通房相鄰的空格（DEMO：先生成房間，門待炸彈系統）
  if (rng.float() < 0.6) {
    const candidates = [];
    for (const p of placed) {
      for (const dd of DIRS) {
        const nx = p.x + dd.dx, ny = p.y + dd.dy;
        if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) continue;
        if (grid[ny][nx] === null) candidates.push({ x: nx, y: ny });
      }
    }
    if (candidates.length > 0) {
      const sp = rng.pick(candidates);
      const secret = new Room(ROOM_TYPES.SECRET, floorNum);
      secret.gridPos = { ...sp };
      grid[sp.y][sp.x] = secret;
      placed.push(sp);
    }
  }

  // ── Step 4: 建立門（相鄰房間之間；SECRET 不建門）──
  const rooms = [];
  for (const p of placed) {
    const room = grid[p.y][p.x];
    rooms.push(room);
    if (room.type === ROOM_TYPES.SECRET) continue;
    for (const dd of DIRS) {
      const neighbor = grid[p.y + dd.dy]?.[p.x + dd.dx];
      if (neighbor && neighbor.type !== ROOM_TYPES.SECRET) {
        room.addDoor(dd.dir);
      }
    }
  }

  // ── Step 5: 生成敵人（NORMAL 房，起始房除外；M1 全部使用 F1 敵人）──
  for (const room of rooms) {
    if (room.type === ROOM_TYPES.NORMAL && !room.isStart) {
      spawnF1Enemies(room, rng);
    }
  }

  const floor = new Floor(floorNum, grid, rooms, startPos);
  floor.bossPos = bossPos;
  return floor;
}
