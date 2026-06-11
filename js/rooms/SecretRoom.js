// =====================================================
// SecretRoom.js — 隱藏房佈置
// 獎勵：金幣 3~5 枚；30% 機率附贈免費道具
// （入口需炸彈炸開：炸彈系統 TODO Task 12 主動道具）
// =====================================================
import { Coin } from "../items/Coin.js";
import { ItemPickup } from "../items/ItemPickup.js";
import { pickItemForFloor } from "../items/ItemDatabase.js";
import { CANVAS_W, FLOOR_Y } from "../core/Constants.js";

export function setupSecretRoom(room, rng, floorNum) {
  const coins = 3 + rng.int(0, 2);
  for (let i = 0; i < coins; i++) {
    room.items.push(new Coin(
      CANVAS_W / 2 + (rng.float() - 0.5) * 200,
      FLOOR_Y - 60,
    ));
  }
  if (rng.float() < 0.3) {
    const item = pickItemForFloor(rng, floorNum);
    if (item) room.items.push(new ItemPickup(item.id, CANVAS_W / 2, FLOOR_Y - 120));
  }
}
