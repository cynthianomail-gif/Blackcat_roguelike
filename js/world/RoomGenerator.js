// =====================================================
// RoomGenerator.js — 程序地圖生成（依規格書 Section 5）
// 隨機擴展連通圖；Boss = 最遠房、道具/商店 = 死路；
// 保證每層：BOSS × 1、TREASURE × 1、SHOP × 1
// =====================================================
import { SeededRandom } from "../core/SeededRandom.js";
import { Room } from "./Room.js";
import { Floor } from "./Floor.js";
import { spawnF1Enemies } from "../entities/enemies/F1Enemies.js";
import { spawnF2Enemies } from "../entities/enemies/F2Enemies.js";
import { spawnF3Enemies } from "../entities/enemies/F3Enemies.js";
import { spawnF4Enemies } from "../entities/enemies/F4Enemies.js";
import { spawnF5Enemies } from "../entities/enemies/F5Enemies.js";
import { spawnF6Enemies } from "../entities/enemies/F6Enemies.js";
import { BossController } from "../entities/boss/BossController.js";
import { BOSS_BY_FLOOR } from "../entities/boss/BossPattern.js";
import { setupTreasureRoom } from "../rooms/TreasureRoom.js";
import { setupShopRoom } from "../rooms/ShopRoom.js";
import { setupSecretRoom } from "../rooms/SecretRoom.js";
import { setupDevilRoom } from "../rooms/DevilRoom.js";
import { setupAngelRoom } from "../rooms/AngelRoom.js";
import { setupChallengeRoom } from "../rooms/ChallengeRoom.js";
import { Platform } from "./Platform.js";
import {
  GRID_W, GRID_H, MIN_ROOMS, MAX_ROOMS, ROOM_TYPES,
  CANVAS_W, PLATFORM_TIER1_Y, PLATFORM_TIER2_Y,
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
  // 魔鬼房 0-1（30%）；未出魔鬼房時 15% 出天使房（魔鬼可覆蓋天使）
  if (rng.float() < 0.3) takeRoomFor(ROOM_TYPES.DEVIL);
  else if (rng.float() < 0.15) takeRoomFor(ROOM_TYPES.ANGEL);
  // 挑戰房 0-1（40%）
  if (rng.float() < 0.4) takeRoomFor(ROOM_TYPES.CHALLENGE);

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

  // ── Step 4b: 佈置跳台（M5.5）──────────────────────
  // 階梯（TIER1 側邊 → TIER2 門下方）：有 N 門、或北側是隱藏房
  // （炸彈要放上 TIER2 才炸得到天花板門位）都要保證可達；
  // 隱藏房自身：上方有房間（回程門會開在天花板）也要有梯。
  // 其餘戰鬥房（NORMAL/CHALLENGE/BOSS）：一座戰術平台（站高打空中怪）
  const addLadder = (room) => {
    const side = rng.float() < 0.5 ? -1 : 1; // TIER1 隨機放左/右側
    const t1x = side === -1 ? 170 : CANVAS_W - 170 - 180;
    room.platforms.push(new Platform(t1x, PLATFORM_TIER1_Y, 180));
    room.platforms.push(new Platform(CANVAS_W / 2 - 75, PLATFORM_TIER2_Y, 150)); // 北門正下方
  };
  for (const room of rooms) {
    const above = grid[room.gridPos.y - 1]?.[room.gridPos.x];
    if (room.type === ROOM_TYPES.SECRET) {
      if (above && above.type !== ROOM_TYPES.SECRET) addLadder(room);
      continue;
    }
    if (room.doors.N || above?.type === ROOM_TYPES.SECRET) {
      addLadder(room);
    } else if (room.type === ROOM_TYPES.NORMAL || room.type === ROOM_TYPES.CHALLENGE ||
               room.type === ROOM_TYPES.BOSS) {
      const slots = [150, CANVAS_W / 2 - 90, CANVAS_W - 150 - 180];
      room.platforms.push(new Platform(rng.pick(slots), PLATFORM_TIER1_Y, 180));
    }
  }

  // ── Step 5: 生成敵人（NORMAL 房，起始房除外；依樓層敵人表）──
  const ENEMY_SPAWNERS = {
    1: spawnF1Enemies, 2: spawnF2Enemies, 3: spawnF3Enemies,
    4: spawnF4Enemies, 5: spawnF5Enemies, 6: spawnF6Enemies,
    7: spawnF6Enemies, // 最終層沿用 F6 敵人
  };
  const spawnEnemies = ENEMY_SPAWNERS[floorNum] || spawnF1Enemies;
  for (const room of rooms) {
    if (room.type === ROOM_TYPES.NORMAL && !room.isStart) {
      spawnEnemies(room, rng);
    }
  }

  // ── Step 6: 特殊房間佈置（js/rooms/ 各模組）──
  for (const room of rooms) {
    switch (room.type) {
      case ROOM_TYPES.TREASURE:  setupTreasureRoom(room, rng, floorNum); break;
      case ROOM_TYPES.SHOP:      setupShopRoom(room, rng, floorNum); break;
      case ROOM_TYPES.SECRET:    setupSecretRoom(room, rng, floorNum); break;
      case ROOM_TYPES.DEVIL:     setupDevilRoom(room, rng, floorNum); break;
      case ROOM_TYPES.ANGEL:     setupAngelRoom(room, rng, floorNum); break;
      case ROOM_TYPES.CHALLENGE: setupChallengeRoom(room, rng, floorNum, spawnEnemies); break;
    }
  }

  // ── Step 7: Boss 房放 Boss（每層 A/B 由種子抽選）──
  for (const room of rooms) {
    if (room.type === ROOM_TYPES.BOSS) {
      const candidates = BOSS_BY_FLOOR[floorNum] || BOSS_BY_FLOOR[1];
      const pattern = candidates[rng.int(0, candidates.length - 1)];
      const boss = new BossController(pattern, floorNum);
      boss.room = room;
      room.boss = boss;
      room.enemies.push(boss); // 進入清怪/鎖門/子彈碰撞共用流程
    }
  }

  const floor = new Floor(floorNum, grid, rooms, startPos);
  floor.bossPos = bossPos;
  return floor;
}
