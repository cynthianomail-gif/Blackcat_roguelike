// =====================================================
// ItemManager.js — 道具拾取 + 效果套用 + Synergy 偵測
// Task 12 擴充：
//   主動道具（E 鍵發動、清房充能 +1）
//   事件型被動（onHurt / onKill / onRoomClear）
//   每幀邏輯（瀕死爆發、裝死技、回血、小精靈模式…）
// =====================================================
import { EventBus } from "../core/EventBus.js";
import { ItemDatabase, applyMapPerks } from "./ItemDatabase.js";
import { SYNERGY_TABLE } from "./ItemEffects.js";
import { Coin } from "./Coin.js";
import { BombDrop } from "./Drops.js";
import { rectsOverlap } from "../entities/Entity.js";

const MAX_PASSIVE_ITEMS = 20; // Section 9：被動道具持有上限

export class ItemManager {
  constructor(player, gm) {
    this.player = player; this.gm = gm;
    this.activeItems = []; // 持有的被動道具 id 清單
    this.synergies = new Set(); // 已觸發 synergy

    // ── 每幀邏輯的內部狀態 ──
    this.noInputFrames = 0;   // 裝死技
    this.regenTimer = 0;      // 貓媽關愛
    this.berserkApplied = false; // 瀕死爆發目前是否生效
    this.berserkStackTimer = 0;  // 瀕死狂神累積計時
    this.roomClearCount = 0;  // 炸魚袋（每 2 房）
    this.ramHitSet = new Set(); // 毛茸茸衝撞：本次衝撞已命中敵人

    this.bindEvents();
  }

  has(id) { return this.activeItems.includes(id); }

  bindEvents() {
    // ── onHurt 系道具 ──
    EventBus.on("playerHurt", () => {
      const p = this.player, gm = this.gm;
      if (p.battleInstinct) {
        p.damageBonus = Math.min(p.damageBonus + 0.3, 3.0);
      }
      if (p.luckyCollar && p.hp === 0.5) p.soulHearts += 1;
      if (p.luckyPaw && Math.random() < 0.3) {
        p.invincibleFrames = Math.max(p.invincibleFrames, 90);
      }
      if (p.revengeBird) gm.familiarManager?.addTemp(65, 300);
      if (p.piggyBank && gm.currentRoom) {
        const room = gm.currentRoom;
        room.items.push(new Coin(p.x, p.y));
        room.items.push(new Coin(p.x + p.w, p.y));
      }
    });

    // ── onKill：吸血鬼貓 ──
    EventBus.on("enemyDied", () => {
      this.gm.killCount++;
      if (this.player.vampire && this.gm.killCount % 10 === 0) {
        this.player.heal(0.5);
      }
    });

    // ── onRoomClear：充能 + 掉落道具 ──
    EventBus.on("roomCleared", (room) => {
      this.gainCharge(1);
      this.roomClearCount++;
      const p = this.player;
      const dropMult = this.gm.dropMult || 1;
      if (p.fishBag) {
        for (let i = 0; i < dropMult; i++) {
          room.items.push(new Coin(p.x + p.w / 2, p.y));
        }
      }
      if (p.bombBag && this.roomClearCount % 2 === 0) {
        for (let i = 0; i < dropMult; i++) {
          room.items.push(new BombDrop(p.x + p.w / 2, p.y - 10));
        }
      }
    });

    // ── 夜視鏡：換房時揭示相鄰房間 ──
    EventBus.on("roomChanged", ({ room }) => {
      if (!this.gm.showAdjacentRooms || !room?.gridPos) return;
      const f = this.gm.currentFloor;
      const gp = room.gridPos;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nb = f?.roomAt(gp.x + dx, gp.y + dy);
        if (nb) nb.isRevealed = true;
      }
    });
  }

  pickup(itemId) {
    const item = ItemDatabase[itemId];
    if (!item) return;

    // 主動道具（chargeMax>0）：裝備到主動欄（換下舊的直接捨棄，DEMO 版）
    if (item.type === "active" && item.chargeMax > 0) {
      this.gm.activeItem = itemId;
      this.gm.activeItemCharge = item.chargeMax; // 拾取時滿充能
      EventBus.emit("itemPickup", item);
      return;
    }

    // 被動上限保護
    if (this.activeItems.length >= MAX_PASSIVE_ITEMS) {
      EventBus.emit("itemLimitReached", item);
      return;
    }

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

  // ── 主動道具 ─────────────────────────────────────
  gainCharge(n) {
    const item = ItemDatabase[this.gm.activeItem];
    if (!item) return;
    this.gm.activeItemCharge = Math.min(this.gm.activeItemCharge + n, item.chargeMax);
  }

  useActive(room) {
    const gm = this.gm;
    const item = ItemDatabase[gm.activeItem];
    if (!item || gm.activeItemCharge < item.chargeMax) return false;
    item.activeEffect?.(this.player, gm, room);
    gm.activeItemCharge = 0;
    EventBus.emit("activeItemUsed", item);
    return true;
  }

  // ── 每幀邏輯（main.js 呼叫）─────────────────────────
  update(dt, input, room) {
    const p = this.player, gm = this.gm;
    if (!p.active) return;

    // 小魚乾即力量：金幣 → 傷害（最高 +10）
    p.coinDamageBonus = p.coinPower ? Math.min(Math.floor(gm.coins / 5), 10) : 0;

    // 瀕死爆發：血量 ≤ 50% 時 +2 傷害、×1.3 移速（離開低血復原）
    if (p.berserkMode) {
      const low = p.hp <= p.maxHP * 0.5;
      if (low && !this.berserkApplied) {
        p.damage += 2; p.speed *= 1.3;
        this.berserkApplied = true;
      } else if (!low && this.berserkApplied) {
        p.damage -= 2; p.speed /= 1.3;
        this.berserkApplied = false;
      }
      // 瀕死狂神 Synergy：低血時傷害每秒再 +0.1（無上限，換層重置）
      if (p.berserkStackMode && low) {
        this.berserkStackTimer += dt;
        if (this.berserkStackTimer >= 60) {
          this.berserkStackTimer = 0;
          p.damageBonus += 0.1;
        }
      }
    }

    // 貓媽關愛：每 900f 回 0.5
    if (p.regenMode) {
      this.regenTimer += dt;
      if (this.regenTimer >= 900) {
        this.regenTimer = 0;
        p.heal(0.5);
      }
    }

    // 裝死技：無輸入 60f → 無敵（任何操作解除）
    if (p.playDead && input) {
      const anyInput = input.axisX !== 0 || input.shootHeld ||
        input.jumpPressed || input.dashPressed || input.exPressed;
      this.noInputFrames = anyInput ? 0 : this.noInputFrames + dt;
      if (this.noInputFrames >= 60) {
        p.invincibleFrames = Math.max(p.invincibleFrames, 2);
      }
    }

    // 電玩黑貓：小精靈模式（碰敵即殺 + 回血）
    if (gm.pacmanFrames > 0) {
      gm.pacmanFrames -= dt;
      p.invincibleFrames = Math.max(p.invincibleFrames, 2);
      for (const e of room?.enemies || []) {
        if (e.active && rectsOverlap(p.hitbox, e.hitbox)) {
          e.die();
          p.heal(0.5);
        }
      }
    }

    // 毛茸茸衝撞：無敵 + 接觸 40 傷害
    if (gm.ramFrames > 0) {
      gm.ramFrames -= dt;
      p.invincibleFrames = Math.max(p.invincibleFrames, 2);
      for (const e of room?.enemies || []) {
        if (e.active && !this.ramHitSet.has(e) && rectsOverlap(p.hitbox, e.hitbox)) {
          e.takeDamage(40, p.facing * 6, -2);
          this.ramHitSet.add(e);
        }
      }
      if (gm.ramFrames <= 0) this.ramHitSet.clear();
    }
  }

  // ── 換層：重置層級效果 + 重新套用地圖類道具 ──────────
  onFloorChanged(floor) {
    const p = this.player;
    if (p.battleInstinct) p.damageBonus = 0; // 戰鬥本能換層重置
    this.berserkStackTimer = 0;
    applyMapPerks(this.gm, floor);
  }
}
