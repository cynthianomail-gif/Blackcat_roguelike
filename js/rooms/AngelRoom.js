// =====================================================
// AngelRoom.js — 天使房（Task 13）
// 免費獲得神聖道具：稀有道具 1 個 + 魂心 1 顆
// （獨立道具池 DEMO 版與主池共用，優先抽 rare）
// =====================================================
import { ItemDatabase, pickItemForFloor } from "../items/ItemDatabase.js";
import { ItemPickup } from "../items/ItemPickup.js";
import { SoulHeartDrop } from "../items/Drops.js";
import { CANVAS_W, FLOOR_Y } from "../core/Constants.js";

export function setupAngelRoom(room, rng, floorNum) {
  // 優先從稀有道具抽；抽不到再退回一般池
  const rares = Object.values(ItemDatabase).filter(i =>
    i.rarity === "rare" && (i.pool.length === 0 || i.pool.includes(floorNum)));
  const item = rares.length > 0
    ? rares[rng.int(0, rares.length - 1)]
    : pickItemForFloor(rng, floorNum);
  if (item) {
    room.items.push(new ItemPickup(item.id, CANVAS_W / 2, FLOOR_Y - 120));
  }
  room.items.push(new SoulHeartDrop(CANVAS_W / 2 + 90, FLOOR_Y - 40));
  room.isHoly = true; // 繪製氛圍用（光柱背景）
}
