// =====================================================
// ItemPickup.js — 地上的道具（道具房基座/掉落物）
// 玩家接觸 → ItemManager.pickup → 消失
// 幾何佔位：基座 + 稀有度色光球 + 名稱文字
// =====================================================
import { Entity, rectsOverlap } from "../entities/Entity.js";
import { GameManager } from "../core/GameManager.js";
import { ItemDatabase } from "./ItemDatabase.js";
import { UI_FONT } from "../core/Constants.js";

const RARITY_COLOR = {
  common: "#9ad1ff",    // 藍
  uncommon: "#b78bff",  // 紫
  rare: "#ffd75e",      // 金
};

export class ItemPickup extends Entity {
  constructor(itemId, x, y) {
    super(x - 16, y - 16, 32, 32);
    this.itemId = itemId;
    this.bobTimer = Math.random() * Math.PI * 2;
  }

  get item() { return ItemDatabase[this.itemId]; }

  update(dt, player) {
    if (!this.active) return;
    this.bobTimer += 0.06 * dt;

    if (player?.active && rectsOverlap(this.hitbox, player.hitbox)) {
      const manager = GameManager.getInstance().itemManager;
      if (manager) {
        manager.pickup(this.itemId);
        this.active = false;
      }
    }
  }

  draw(ctx) {
    if (!this.active) return;
    const item = this.item;
    const cx = this.x + this.w / 2;
    const bobY = Math.sin(this.bobTimer) * 4;
    const cy = this.y + this.h / 2 + bobY;

    ctx.save();
    // 基座（不浮動）
    ctx.fillStyle = "#3a3a3a";
    ctx.beginPath();
    ctx.roundRect(cx - 22, this.y + this.h + 8, 44, 10, 3);
    ctx.fill();

    // 光暈 + 道具球
    const color = RARITY_COLOR[item?.rarity] || "#fff";
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 4, 4, 0, Math.PI * 2);
    ctx.fill();

    // 名稱
    if (item) {
      ctx.fillStyle = "#1a1a1a";
      ctx.font = `bold 13px ${UI_FONT}`;
      ctx.textAlign = "center";
      ctx.fillText(item.name, cx, this.y - 10 + bobY);
    }
    ctx.restore();
  }
}
