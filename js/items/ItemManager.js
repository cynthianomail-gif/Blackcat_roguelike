// =====================================================
// ItemManager.js — 道具拾取 + 效果套用 + Synergy 偵測
// 依技術規格書 Task 7 Step 7.2
// =====================================================
import { EventBus } from "../core/EventBus.js";
import { ItemDatabase } from "./ItemDatabase.js";
import { SYNERGY_TABLE } from "./ItemEffects.js";

export class ItemManager {
  constructor(player, gm) {
    this.player = player; this.gm = gm;
    this.activeItems = []; // 持有的被動道具 id 清單
    this.synergies = new Set(); // 已觸發 synergy
  }

  pickup(itemId) {
    const item = ItemDatabase[itemId];
    if (!item) return;
    item.applyEffect(this.player, this.gm);
    this.activeItems.push(itemId);
    this.gm.items = this.activeItems; // GameManager 同步（存檔用）
    EventBus.emit("itemPickup", item);
    this.checkSynergies();
  }

  checkSynergies() {
    // 遍歷 SYNERGY_TABLE，檢查所有所需道具是否都在 activeItems 中
    SYNERGY_TABLE.forEach(syn => {
      const allHave = syn.requires.every(id => this.activeItems.includes(id));
      if (allHave && !this.synergies.has(syn.name)) {
        this.synergies.add(syn.name);
        syn.apply(this.player);
        EventBus.emit("synergyActivated", syn.name);
      }
    });
  }
}
