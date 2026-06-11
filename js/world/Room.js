// =====================================================
// Room.js — 單個房間（地板/牆/門/敵人/物件）
// 戰鬥鎖門 → 清怪 → 開門 → emit "roomCleared"
// =====================================================
import { EventBus } from "../core/EventBus.js";
import { rectsOverlap } from "../entities/Entity.js";
import { Door } from "./Door.js";
import {
  CANVAS_W, CANVAS_H, WALL_THICKNESS, FLOOR_Y, TILE_SIZE, ROOM_TYPES,
} from "../core/Constants.js";

const CEILING_Y = WALL_THICKNESS;

export class Room {
  constructor(type = ROOM_TYPES.NORMAL, floorNum = 1) {
    this.type = type;
    this.floorNum = floorNum;
    this.isCleared = false;
    this.doors = { N: null, S: null, E: null, W: null }; // null or Door
    this.enemies = [];
    this.enemyBullets = []; // 敵人投射物（子彈/炸彈）；陣列引用不可換（Renderer 持有）
    this.items = [];    // 地上的道具
    this.objects = [];  // 環境物件（炸彈桶/商品等）
    this.isRevealed = false;
    this.isVisited = false;
    this.gridPos = null; // RoomGenerator 填入 {x, y}
  }

  addDoor(dir) {
    this.doors[dir] = new Door(dir);
    return this.doors[dir];
  }

  // 無敵人的房型一進入即視為已清
  get startsCleared() {
    return this.type !== ROOM_TYPES.NORMAL &&
           this.type !== ROOM_TYPES.BOSS &&
           this.type !== ROOM_TYPES.CHALLENGE;
  }

  // 玩家進入房間時呼叫
  enter() {
    this.isVisited = true;
    this.isRevealed = true;
    this.enemyBullets.length = 0; // 重進房不留殘彈
    if (this.isCleared || this.startsCleared || this.enemies.length === 0) {
      this.isCleared = true;
      this.openAllDoors();
    } else {
      this.closeAllDoors(); // 戰鬥鎖門
    }
  }

  openAllDoors() { Object.values(this.doors).forEach(d => d?.open()); }
  closeAllDoors() { Object.values(this.doors).forEach(d => d?.close()); }

  isBattleOver() { return this.enemies.every(e => !e.active); }

  update(dt, player, input = null) {
    this.enemies.forEach(e => e.active && e.update(dt, player));

    // 地上道具/商品（拾取或購買後就地移除；input 供 E 鍵互動）
    for (let i = this.items.length - 1; i >= 0; i--) {
      this.items[i].update?.(dt, player, input);
      if (this.items[i].active === false) this.items.splice(i, 1);
    }

    // 敵人投射物（就地清除，保持陣列引用）
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      b.update(dt, player);
      if (!b.active) this.enemyBullets.splice(i, 1);
    }

    // 清怪檢查
    if (!this.isCleared && this.isBattleOver()) {
      this.isCleared = true;
      this.openAllDoors();
      EventBus.emit("roomCleared", this);
    }
  }

  // ── 子彈 vs 牆壁 ──────────────────────────────────
  // 撞牆銷毀（觸發爆裂等死亡特效）；彈力毛球反彈；幽靈彈穿牆
  handleBulletCollisions(bullets) {
    for (const b of bullets) {
      if (!b.active || b.ghost) continue;
      let hitWall = false, reflectX = false, reflectY = false;

      if (b.x <= WALL_THICKNESS) { hitWall = true; reflectX = true; b.x = WALL_THICKNESS; }
      if (b.x + b.w >= CANVAS_W - WALL_THICKNESS) { hitWall = true; reflectX = true; b.x = CANVAS_W - WALL_THICKNESS - b.w; }
      if (b.y <= CEILING_Y) { hitWall = true; reflectY = true; b.y = CEILING_Y; }
      if (b.y + b.h >= FLOOR_Y) { hitWall = true; reflectY = true; b.y = FLOOR_Y - b.h; }

      if (hitWall) {
        if (b.maxBounces > b.bounces) {
          b.bounces++;
          if (reflectX) b.vx = -b.vx;
          if (reflectY) b.vy = -b.vy;
          // 彈跳大師 Synergy：反彈時分裂
          if (b.splitOnBounce && !b.isSplitChild) b.pool?.spawnSplitChildren(b, null);
        } else if (b.pool) {
          b.pool.killBullet(b, this.enemies);
        } else {
          b.active = false;
        }
      }
    }
  }

  // ── 玩家 vs 門（房間切換觸發）──────────────────────
  // 回傳觸發的方向，無則 null
  checkDoorTransition(player) {
    if (!player.active) return null;
    for (const [dir, door] of Object.entries(this.doors)) {
      if (!door || !door.isOpen) continue;
      // 擴大觸發範圍 2px，配合玩家牆壁 clamp
      const zone = {
        x: door.rect.x - 2, y: door.rect.y - 2,
        w: door.rect.w + 4, h: door.rect.h + 4,
      };
      if (rectsOverlap(player.hitbox, zone)) {
        // 確認玩家正朝門的方向推進
        if (dir === "E" && player.x + player.w >= CANVAS_W - WALL_THICKNESS - 1) return dir;
        if (dir === "W" && player.x <= WALL_THICKNESS + 1) return dir;
        if (dir === "N" && player.y <= CEILING_Y + 1) return dir;
        if (dir === "S" && player.y + player.h >= FLOOR_Y - 1) return dir;
      }
    }
    return null;
  }

  // ── 渲染（依 Renderer 管線分段呼叫）─────────────────
  drawFloor(ctx) {
    // BADLAND 式：地板屬於前景平面 → 純黑；背景整張亮彩發光
    ctx.fillStyle = "#101014";
    ctx.fillRect(0, FLOOR_Y, CANVAS_W, CANVAS_H - FLOOR_Y);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_W; x += TILE_SIZE) {
      ctx.strokeRect(x, FLOOR_Y, TILE_SIZE, CANVAS_H - FLOOR_Y);
    }
  }

  drawObjects(ctx) {
    this.objects.forEach(o => o.draw?.(ctx));
    this.items.forEach(i => i.draw?.(ctx));
  }

  drawDoors(ctx) {
    Object.values(this.doors).forEach(d => d?.draw(ctx));
  }

  drawWalls(ctx) {
    ctx.fillStyle = "#101014"; // 前景平面同色（BADLAND 式）
    ctx.fillRect(0, 0, WALL_THICKNESS, CANVAS_H);                       // 左牆
    ctx.fillRect(CANVAS_W - WALL_THICKNESS, 0, WALL_THICKNESS, CANVAS_H); // 右牆
    ctx.fillRect(0, 0, CANVAS_W, CEILING_Y);                            // 天花板
    // 門開口蓋掉牆面：重畫門（門在 drawDoors 已畫，但牆蓋住了門 → 再補畫一次門區域）
    Object.values(this.doors).forEach(d => d?.draw(ctx));
  }
}
