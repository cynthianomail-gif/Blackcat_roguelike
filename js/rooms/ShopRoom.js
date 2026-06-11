// =====================================================
// ShopRoom.js — 商店房（Task 10 Step 10.1）
// 進場上架：當層道具池 2~3 個（7 小魚乾）+ 固定販賣
// 紅心（3）/ 炸彈（2）/ 鑰匙（3）
// 靠近顯示「E 購買」，按 E 購買；金幣不足顯示「小魚乾不足」
// =====================================================
import { Entity, rectsOverlap } from "../entities/Entity.js";
import { GameManager } from "../core/GameManager.js";
import { EventBus } from "../core/EventBus.js";
import { ItemDatabase, pickItemForFloor } from "../items/ItemDatabase.js";
import {
  FLOOR_Y, SHOP_ITEM_PRICE_BASE, SHOP_HEART_PRICE, SHOP_BOMB_PRICE, SHOP_KEY_PRICE,
} from "../core/Constants.js";

const HINT_RANGE = 30;        // 觸發「E 購買」提示的額外距離
const DENIED_FRAMES = 90;     // 「小魚乾不足」顯示 1.5 秒

const KIND_LABEL = { heart: "紅心", bomb: "炸彈", key: "鑰匙" };

export class ShopItem extends Entity {
  // kind: "item" | "heart" | "bomb" | "key"；itemId 僅 kind="item" 用
  constructor(kind, price, x, itemId = null) {
    super(x - 16, FLOOR_Y - 72, 32, 32);
    this.kind = kind;
    this.price = price;
    this.itemId = itemId;
    this.deniedTimer = 0;
    this.playerNear = false;
  }

  get label() {
    return this.kind === "item" ? ItemDatabase[this.itemId]?.name : KIND_LABEL[this.kind];
  }

  // 漁市打折（97）：道具價格 × gm.shopPriceMult
  get effectivePrice() {
    const gm = GameManager.getInstance();
    const mult = this.kind === "item" ? (gm.shopPriceMult || 1) : 1;
    return Math.ceil(this.price * mult);
  }

  update(dt, player, input) {
    if (!this.active) return;
    if (this.deniedTimer > 0) this.deniedTimer -= dt;

    const zone = {
      x: this.x - HINT_RANGE, y: this.y - HINT_RANGE,
      w: this.w + HINT_RANGE * 2, h: this.h + HINT_RANGE * 2,
    };
    this.playerNear = player?.active && rectsOverlap(zone, player.hitbox);

    if (this.playerNear && input?.usePressed) this.tryBuy(player);
  }

  tryBuy(player) {
    const gm = GameManager.getInstance();
    const price = this.effectivePrice;
    if (gm.coins < price) {
      this.deniedTimer = DENIED_FRAMES;
      EventBus.emit("shopFail", this);
      return;
    }
    gm.coins -= price;
    switch (this.kind) {
      case "item":  gm.itemManager?.pickup(this.itemId); break;
      case "heart": player.heal(1); break;
      case "bomb":  gm.bombs += 1; break;
      case "key":   gm.keys += 1; break;
    }
    EventBus.emit("shopPurchase", { kind: this.kind, price });
    this.active = false;
  }

  draw(ctx) {
    if (!this.active) return;
    const cx = this.x + this.w / 2;
    ctx.save();

    // 展示台
    ctx.fillStyle = "#3a3a3a";
    ctx.beginPath();
    ctx.roundRect(cx - 24, this.y + this.w + 6, 48, 34, 4);
    ctx.fill();

    // 商品圖示
    const cy = this.y + this.h / 2;
    if (this.kind === "item") {
      ctx.fillStyle = "#b78bff";
      ctx.shadowColor = "#b78bff";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (this.kind === "heart") {
      ctx.fillStyle = "#c8102e";
      ctx.beginPath();
      ctx.arc(cx - 5, cy - 3, 6, 0, Math.PI * 2);
      ctx.arc(cx + 5, cy - 3, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy);
      ctx.lineTo(cx, cy + 12);
      ctx.lineTo(cx + 10, cy);
      ctx.closePath();
      ctx.fill();
    } else if (this.kind === "bomb") {
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(cx, cy + 2, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#c8102e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 8);
      ctx.lineTo(cx + 5, cy - 14);
      ctx.stroke();
    } else { // key
      ctx.strokeStyle = "#ffd75e";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy - 5, 5, 0, Math.PI * 2);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy + 12);
      ctx.moveTo(cx, cy + 6);
      ctx.lineTo(cx + 6, cy + 6);
      ctx.moveTo(cx, cy + 12);
      ctx.lineTo(cx + 5, cy + 12);
      ctx.stroke();
    }

    // 名稱 + 價格
    ctx.textAlign = "center";
    ctx.fillStyle = "#1a1a1a";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(this.label ?? "?", cx, this.y - 12);
    ctx.fillStyle = "#b8860b";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(`$${this.effectivePrice}`, cx, this.y + this.w + 28);

    // 互動提示
    if (this.deniedTimer > 0) {
      ctx.fillStyle = "#c8102e";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("小魚乾不足", cx, this.y - 28);
    } else if (this.playerNear) {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px sans-serif";
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 3;
      ctx.strokeText("E 購買", cx, this.y - 28);
      ctx.fillText("E 購買", cx, this.y - 28);
    }
    ctx.restore();
  }
}

// 進場佈置：道具 2~3 個 + 固定消耗品（呼叫於樓層生成）
export function setupShopRoom(room, rng, floorNum) {
  const itemCount = 2 + rng.int(0, 1);
  const itemXs = [170, 300, 430];
  const taken = [];
  for (let i = 0; i < itemCount; i++) {
    const item = pickItemForFloor(rng, floorNum, taken);
    if (!item) break;
    taken.push(item.id);
    room.items.push(new ShopItem("item", SHOP_ITEM_PRICE_BASE, itemXs[i], item.id));
  }
  room.items.push(new ShopItem("heart", SHOP_HEART_PRICE, 580));
  room.items.push(new ShopItem("bomb", SHOP_BOMB_PRICE, 670));
  room.items.push(new ShopItem("key", SHOP_KEY_PRICE, 760));
}
