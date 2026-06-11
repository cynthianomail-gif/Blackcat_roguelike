// =====================================================
// TreasureRoom.js — 道具房佈置（免費道具基座）
// 自 RoomGenerator 抽出，集中管理特殊房間佈置邏輯
// =====================================================
import { ItemPickup } from "../items/ItemPickup.js";
import { pickItemForFloor } from "../items/ItemDatabase.js";
import { CANVAS_W, FLOOR_Y } from "../core/Constants.js";

export function setupTreasureRoom(room, rng, floorNum) {
  const item = pickItemForFloor(rng, floorNum);
  if (item) room.items.push(new ItemPickup(item.id, CANVAS_W / 2, FLOOR_Y - 50));
}
