// =====================================================
// DevilRoom.js — 魔鬼房（Task 10 Step 10.2）
// 1 個稀有道具，價格 = 1 格最大血量；按 E 確認獻祭
// maxHP <= 1（含九條命強制 maxHP=1）時不可交易
// =====================================================
import { Entity, rectsOverlap } from "../entities/Entity.js";
import { GameManager } from "../core/GameManager.js";
import { EventBus } from "../core/EventBus.js";
import { ItemDatabase } from "../items/ItemDatabase.js";
import { CANVAS_W, FLOOR_Y, UI_FONT } from "../core/Constants.js";

const HINT_RANGE = 36;

export class DevilDeal extends Entity {
  constructor(itemId, x = CANVAS_W / 2) {
    super(x - 16, FLOOR_Y - 76, 32, 32);
    this.itemId = itemId;
    this.playerNear = false;
    this.refused = false; // maxHP 不足時的提示狀態
  }

  get item() { return ItemDatabase[this.itemId]; }

  update(dt, player, input) {
    if (!this.active) return;
    const zone = {
      x: this.x - HINT_RANGE, y: this.y - HINT_RANGE,
      w: this.w + HINT_RANGE * 2, h: this.h + HINT_RANGE * 2,
    };
    this.playerNear = player?.active && rectsOverlap(zone, player.hitbox);
    this.refused = this.playerNear && player.maxHP <= 1;

    if (this.playerNear && input?.usePressed) this.tryDeal(player);
  }

  tryDeal(player) {
    if (player.maxHP <= 1) return; // 魔鬼不收最後一格命
    player.maxHP -= 1;
    player.hp = Math.min(player.hp, player.maxHP);
    const gm = GameManager.getInstance();
    gm.itemManager?.pickup(this.itemId);
    EventBus.emit("devilDeal", { itemId: this.itemId });
    this.active = false;
  }

  draw(ctx) {
    if (!this.active) return;
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    ctx.save();

    // 法陣（紅色圓 + 內圈）
    ctx.strokeStyle = "rgba(200,16,46,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, FLOOR_Y - 6, 52, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, FLOOR_Y - 6, 34, 6, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 道具球（暗紅光）
    ctx.fillStyle = "#8b0000";
    ctx.shadowColor = "#c8102e";
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 名稱 + 代價
    ctx.textAlign = "center";
    ctx.fillStyle = "#1a1a1a";
    ctx.font = `bold 12px ${UI_FONT}`;
    ctx.fillText(this.item?.name ?? "?", cx, this.y - 14);
    ctx.fillStyle = "#c8102e";
    ctx.font = `bold 13px ${UI_FONT}`;
    ctx.fillText("代價：1 格最大血量", cx, this.y + this.h + 26);

    // 對話方塊
    if (this.playerNear) {
      const msg = this.refused ? "魔鬼對你最後的命沒興趣…" : "獻祭 1 格血量換取力量？按 E 確認";
      ctx.fillStyle = "rgba(0,0,0,0.8)";
      ctx.beginPath();
      ctx.roundRect(cx - 150, this.y - 64, 300, 30, 6);
      ctx.fill();
      ctx.fillStyle = this.refused ? "#999" : "#ffd75e";
      ctx.font = `bold 13px ${UI_FONT}`;
      ctx.fillText(msg, cx, this.y - 44);
    }
    ctx.restore();
  }
}

// 進場佈置：1 個稀有道具（抽不到稀有則任意）
export function setupDevilRoom(room, rng, floorNum) {
  const rares = Object.values(ItemDatabase).filter(i =>
    i.rarity === "rare" && (i.pool.length === 0 || i.pool.includes(floorNum)));
  const candidates = rares.length > 0 ? rares : Object.values(ItemDatabase);
  const item = candidates[rng.int(0, candidates.length - 1)];
  if (item) room.items.push(new DevilDeal(item.id));
}
