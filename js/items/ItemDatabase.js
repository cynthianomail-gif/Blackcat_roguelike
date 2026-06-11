// =====================================================
// ItemDatabase.js — 道具資料庫（Section 3）完整 100 個
// Task 7：ID 01-20（子彈改造類）
// Task 12：ID 21-100（傷害/防禦/跟班/主動/探索）
// applyEffect(player, gm)：拾取時執行
// activeEffect(player, gm, room)：主動道具按 E 執行
// 事件型效果（onHurt/onKill/onRoomClear）：旗標 + ItemManager 監聽
// =====================================================
import { EventBus } from "../core/EventBus.js";
import { Explosion, LightPillar, FallingRat, SlowPuddle, TargetStrike } from "./RoomEffects.js";
import { SoulHeartDrop, spawnRandomPickup } from "./Drops.js";
import { CANVAS_W, WALL_THICKNESS, FLOOR_Y, ROOM_TYPES } from "../core/Constants.js";

// 自傷（以血換傷/用命拼/自爆絕招）：無視無敵幀
function damageSelf(player, amt) {
  player.hp -= amt;
  EventBus.emit("playerHurt", { player, damage: amt });
  if (player.hp <= 0) player.die();
}

// 對房內所有敵人（含 Boss）執行
function forAllEnemies(room, fn) {
  room?.enemies.forEach(e => e.active && fn(e));
  if (room?.boss?.active) fn(room.boss);
}

// 揭示地圖（91/92/94 共用；xray=93 同時開隱藏門）
export function applyMapPerks(gm, floor) {
  if (!floor) return;
  for (const r of floor.rooms) {
    if (gm.revealMap && r.type !== ROOM_TYPES.SECRET) r.isRevealed = true;
    if (gm.revealSpecialRooms && r.type !== ROOM_TYPES.NORMAL && r.type !== ROOM_TYPES.SECRET) {
      r.isRevealed = true;
    }
    if (gm.xrayVision && r.type === ROOM_TYPES.SECRET) {
      r.isRevealed = true;
      Object.values(r.doors).forEach(d => d?.open());
      // 鄰房通往隱藏房的門也一併打開
      const gp = r.gridPos;
      if (gp) {
        const DIRS = { E: [1, 0, "W"], W: [-1, 0, "E"], N: [0, -1, "S"], S: [0, 1, "N"] };
        for (const [dx, dy, opp] of Object.values(DIRS)) {
          floor.roomAt(gp.x + dx, gp.y + dy)?.doors[opp]?.open();
        }
      }
    }
  }
}

export const ItemDatabase = {
  1: {
    id: 1, name: "貓薄荷", nameEn: "Catnip",
    type: "passive", pool: [], rarity: "common", chargeMax: 0,
    description: "射速 ×2！貓貓嗨起來", sprite: "01_catnip.png",
    applyEffect: (player) => { player.fireRate *= 0.5; },
  },
  2: {
    id: 2, name: "三眼貓", nameEn: "Third Eye",
    type: "passive", pool: [], rarity: "uncommon", chargeMax: 0,
    description: "每次射擊 3 顆毛球", sprite: "02_third_eye.png",
    applyEffect: (player) => { player.bulletCount = 3; player.spreadAngle = 15; },
  },
  3: {
    id: 3, name: "彎爪勾", nameEn: "Curved Claw",
    type: "passive", pool: [], rarity: "uncommon", chargeMax: 0,
    description: "毛球會轉彎追敵", sprite: "03_curved_claw.png",
    applyEffect: (player) => { player.bulletHoming = 0.04; },
  },
  4: {
    id: 4, name: "大眼仁", nameEn: "Wide Eye",
    type: "passive", pool: [], rarity: "common", chargeMax: 0,
    description: "大毛球：傷害與擊退提升", sprite: "04_wide_eye.png",
    applyEffect: (player) => {
      player.bulletSizeMulti *= 1.5;
      player.bulletKnockback += 2;
      player.damage += 1;
    },
  },
  5: {
    id: 5, name: "回力標", nameEn: "Boomerang",
    type: "passive", pool: [3, 4, 5, 6], rarity: "rare", chargeMax: 0,
    description: "毛球飛出去還會飛回來", sprite: "05_boomerang.png",
    applyEffect: (player) => {
      player.bulletReturns = true; // [引擎TODO] 飛行 300px 後折返
      player.bulletReturnDistance = 300;
    },
  },
  6: {
    id: 6, name: "速射吐毛球", nameEn: "Rapid Furball",
    type: "passive", pool: [], rarity: "uncommon", chargeMax: 0,
    description: "超高射速，但射程縮短", sprite: "06_rapid_furball.png",
    applyEffect: (player) => {
      player.bulletRange *= 0.6;
      player.fireRate *= 0.2;
    },
  },
  7: {
    id: 7, name: "魚線穿透", nameEn: "Fishline Pierce",
    type: "passive", pool: [], rarity: "uncommon", chargeMax: 0,
    description: "毛球穿透所有敵人", sprite: "07_fishline.png",
    applyEffect: (player) => { player.bulletPiercing = true; },
  },
  8: {
    id: 8, name: "毛球吐息", nameEn: "Hairball Breath",
    type: "passive", pool: [2, 3, 4, 5, 6], rarity: "rare", chargeMax: 0,
    description: "按住可蓄力，最高 ×8 傷害", sprite: "08_hairball_breath.png",
    applyEffect: (player) => {
      player.chargeShotMode = true; // [引擎TODO] 蓄力射擊
      player.maxChargeMult = 8;
      player.chargeTime = [0.3, 0.6, 1.0, 1.5, 2.0];
    },
  },
  9: {
    id: 9, name: "雷射眼", nameEn: "Laser Eye",
    type: "passive", pool: [3, 4, 5, 6], rarity: "rare", chargeMax: 0,
    description: "目光即兵器：持續雷射", sprite: "09_laser_eye.png",
    applyEffect: (player) => {
      player.shootMode = "laser"; // [引擎TODO] 雷射 dps = damage*3
    },
  },
  10: {
    id: 10, name: "永恆凝視", nameEn: "Eternal Gaze",
    type: "passive", pool: [4, 5, 6], rarity: "rare", chargeMax: 0,
    description: "自動鎖定的副雷射", sprite: "10_eternal_gaze.png",
    applyEffect: (player) => {
      player.autoLaser = true; // [引擎TODO] dps = damage*1.5
    },
  },
  11: {
    id: 11, name: "四爪攻擊", nameEn: "Quad Claw",
    type: "passive", pool: [2, 3, 4, 5, 6], rarity: "uncommon", chargeMax: 0,
    description: "十字四向毛球", sprite: "11_quad_claw.png",
    applyEffect: (player) => { player.bulletCount = 4; player.spreadAngle = 90; },
  },
  12: {
    id: 12, name: "奶油蛋糕", nameEn: "Cream Cake",
    type: "passive", pool: [2, 3, 4, 5, 6], rarity: "uncommon", chargeMax: 0,
    description: "蓄力越久，毛球越痛", sprite: "12_cream_cake.png",
    applyEffect: (player) => {
      player.chargeShotMode = true; // [引擎TODO] mult 1~5
      player.maxChargeMult = 5;
      player.chargeTime = [0.3, 0.6, 1.0, 1.5, 2.0];
    },
  },
  13: {
    id: 13, name: "炸魚排", nameEn: "Fried Fish Bomb",
    type: "passive", pool: [3, 4, 5, 6], rarity: "rare", chargeMax: 0,
    description: "毛球變成爆裂魚排", sprite: "13_fish_bomb.png",
    applyEffect: (player) => {
      player.bulletType = "bomb"; // [引擎TODO] dmg40 半徑80 爆炸
    },
  },
  14: {
    id: 14, name: "毛球分裂", nameEn: "Splitting Furball",
    type: "passive", pool: [], rarity: "uncommon", chargeMax: 0,
    description: "命中後分裂成 2 顆", sprite: "14_split_furball.png",
    applyEffect: (player) => {
      player.bulletSplitOnHit = 2; // [引擎TODO] 分裂角 ±45°
    },
  },
  15: {
    id: 15, name: "彈力毛球", nameEn: "Bouncy Furball",
    type: "passive", pool: [2, 3, 4, 5, 6], rarity: "uncommon", chargeMax: 0,
    description: "毛球撞牆反彈 3 次", sprite: "15_bouncy_furball.png",
    applyEffect: (player) => { player.bulletBounces = 3; },
  },
  16: {
    id: 16, name: "慵懶子彈", nameEn: "Lazy Bullet",
    type: "passive", pool: [3, 4, 5, 6], rarity: "uncommon", chargeMax: 0,
    description: "毛球先發呆再爆衝", sprite: "16_lazy_bullet.png",
    applyEffect: (player) => {
      player.bulletHoverTime = 30; // [引擎TODO] 懸停後 ×3 速
    },
  },
  17: {
    id: 17, name: "炸裂毛", nameEn: "Burst Fur",
    type: "passive", pool: [3, 4, 5, 6], rarity: "rare", chargeMax: 0,
    description: "毛球消滅時四向爆射", sprite: "17_burst_fur.png",
    applyEffect: (player) => {
      player.bulletExplosionBullets = 4; // [引擎TODO] 爆裂展開 90°
    },
  },
  18: {
    id: 18, name: "毒魚", nameEn: "Poison Fish",
    type: "passive", pool: [4, 5, 6], rarity: "rare", chargeMax: 0,
    description: "拋物毒彈，命中持續中毒", sprite: "18_poison_fish.png",
    applyEffect: (player) => {
      player.bulletArc = true; // [引擎TODO] 毒 dmg2/180f 半徑60
      player.bulletPoison = { dmg: 2, dur: 180 };
    },
  },
  19: {
    id: 19, name: "貓爪穿透", nameEn: "Claw Pierce",
    type: "passive", pool: [2, 3, 4], rarity: "uncommon", chargeMax: 0,
    description: "穿透 + 傷害大增", sprite: "19_claw_pierce.png",
    applyEffect: (player) => {
      player.bulletPiercing = true;
      player.damage += 2;
      player.fireRate *= 0.8;
    },
  },
  20: {
    id: 20, name: "十字貓掌", nameEn: "Cross Paw",
    type: "passive", pool: [1, 2, 3, 4], rarity: "uncommon", chargeMax: 0,
    description: "25% 機率四方向齊射", sprite: "20_cross_paw.png",
    applyEffect: (player) => { player.crossFireChance = 0.25; },
  },
  // ── 3.2 傷害強化類（21-35）──────────────────────────
  21: {
    id: 21, name: "黑貓印記", nameEn: "Black Cat Mark",
    type: "passive", pool: [], rarity: "uncommon", chargeMax: 0,
    description: "魂心 +1、傷害 +1、移速提升", sprite: "21_black_mark.png",
    applyEffect: (player) => {
      player.soulHearts += 1;
      player.damage += 1;
      player.speed *= 1.15;
    },
  },
  22: {
    id: 22, name: "磨爪石", nameEn: "Claw Stone",
    type: "passive", pool: [], rarity: "common", chargeMax: 0,
    description: "傷害大增，射速與移速略降", sprite: "22_claw_stone.png",
    applyEffect: (player) => {
      player.damage += 1.5;
      player.fireRate *= 0.83;
      player.speed *= 0.9;
    },
  },
  23: {
    id: 23, name: "九命傳說", nameEn: "Nine Lives Legend",
    type: "passive", pool: [], rarity: "common", chargeMax: 0,
    description: "傷害 +1、彈速 +25%", sprite: "23_nine_legend.png",
    applyEffect: (player) => {
      player.damage += 1;
      player.bulletSpeed *= 1.25;
    },
  },
  24: {
    id: 24, name: "遠距獵手", nameEn: "Long Range Hunter",
    type: "passive", pool: [2, 3, 4, 5], rarity: "uncommon", chargeMax: 0,
    description: "毛球飛越遠越痛（最高 ×2）", sprite: "24_long_hunter.png",
    applyEffect: (player) => { player.damagePerPx = 0.005; },
  },
  25: {
    id: 25, name: "英雄貓貓", nameEn: "Hero Cat",
    type: "passive", pool: [], rarity: "common", chargeMax: 0,
    description: "傷害 +1", sprite: "25_hero_cat.png",
    applyEffect: (player) => { player.damage += 1; },
  },
  26: {
    id: 26, name: "邪惡之星", nameEn: "Evil Star",
    type: "passive", pool: [], rarity: "common", chargeMax: 0,
    description: "傷害 +1", sprite: "26_evil_star.png",
    applyEffect: (player) => { player.damage += 1; },
  },
  27: {
    id: 27, name: "猛力刺拳", nameEn: "Power Jab",
    type: "passive", pool: [], rarity: "common", chargeMax: 0,
    description: "傷害 +1", sprite: "27_power_jab.png",
    applyEffect: (player) => { player.damage += 1; },
  },
  28: {
    id: 28, name: "鐵頭功", nameEn: "Iron Head",
    type: "passive", pool: [], rarity: "common", chargeMax: 0,
    description: "30% 機率暈眩敵人、傷害 +0.5", sprite: "28_iron_head.png",
    applyEffect: (player) => {
      player.bulletStunChance = 0.3;
      player.damage += 0.5;
    },
  },
  29: {
    id: 29, name: "赤誠之心", nameEn: "Devoted Heart",
    type: "passive", pool: [5, 6], rarity: "rare", chargeMax: 0,
    description: "全面強化：追蹤 + 血量 + 傷害", sprite: "29_devoted_heart.png",
    applyEffect: (player) => {
      player.bulletHoming = Math.max(player.bulletHoming, 0.04);
      player.maxHP += 1;
      player.healFull();
      player.damage += 2;
      player.fireRate *= 0.8;
      player.bulletSpeed *= 0.8;
    },
  },
  30: {
    id: 30, name: "戰鬥本能", nameEn: "Battle Instinct",
    type: "passive", pool: [], rarity: "uncommon", chargeMax: 0,
    description: "受傷越多越強（換層重置）", sprite: "30_battle_instinct.png",
    applyEffect: (player) => { player.battleInstinct = true; }, // ItemManager onHurt 處理
  },
  31: {
    id: 31, name: "左爪強化", nameEn: "Left Claw Boost",
    type: "passive", pool: [2, 3, 4, 5], rarity: "uncommon", chargeMax: 0,
    description: "每隔一顆毛球傷害 ×2", sprite: "31_left_claw.png",
    applyEffect: (player) => { player.altDoubleShot = true; },
  },
  32: {
    id: 32, name: "瀕死爆發", nameEn: "Last Stand",
    type: "passive", pool: [], rarity: "uncommon", chargeMax: 0,
    description: "血量低於一半時傷害與移速提升", sprite: "32_last_stand.png",
    applyEffect: (player) => { player.berserkMode = true; }, // ItemManager 每幀判斷
  },
  33: {
    id: 33, name: "以血換傷", nameEn: "Blood for Power",
    type: "active", pool: [3, 4, 5, 6], rarity: "rare", chargeMax: 6,
    description: "犧牲 1 格血，全場大傷害", sprite: "33_blood_power.png",
    applyEffect: () => {},
    activeEffect: (player, gm, room) => {
      damageSelf(player, 1);
      forAllEnemies(room, e => e.takeDamage(player.totalDamage * 5));
    },
  },
  34: {
    id: 34, name: "屠殺魔法書", nameEn: "Massacre Tome",
    type: "active", pool: [2, 3, 4], rarity: "uncommon", chargeMax: 3,
    description: "10 秒內傷害 ×2", sprite: "34_massacre_tome.png",
    applyEffect: () => {},
    activeEffect: (player) => { player.tempDamageMultFrames = 600; },
  },
  35: {
    id: 35, name: "用命拼", nameEn: "Life Gambit",
    type: "active", pool: [1, 2, 3], rarity: "uncommon", chargeMax: 1,
    description: "扣半格血，永久傷害 +1（限 5 次）", sprite: "35_life_gambit.png",
    applyEffect: () => {},
    activeEffect: (player, gm) => {
      gm.lifeGambitUses = (gm.lifeGambitUses || 0) + 1;
      if (gm.lifeGambitUses > 5) return;
      damageSelf(player, 0.5);
      player.damage += 1;
    },
  },

  // ── 3.3 防禦/生存類（36-50）─────────────────────────
  36: {
    id: 36, name: "毛球護盾", nameEn: "Furball Shield",
    type: "passive", pool: [], rarity: "uncommon", chargeMax: 0,
    description: "環繞護盾：吸收 1 次傷害", sprite: "36_fur_shield.png",
    applyEffect: (player, gm) => { gm.familiarManager?.add(36); },
  },
  37: {
    id: 37, name: "毛線球", nameEn: "Yarn Ball",
    type: "passive", pool: [], rarity: "uncommon", chargeMax: 0,
    description: "環繞毛線球：擋下 3 發敵彈", sprite: "37_yarn_ball.png",
    applyEffect: (player, gm) => { gm.familiarManager?.add(37); },
  },
  38: {
    id: 38, name: "幸運項圈", nameEn: "Lucky Collar",
    type: "passive", pool: [], rarity: "common", chargeMax: 0,
    description: "命懸一線時獲得魂心", sprite: "38_lucky_collar.png",
    applyEffect: (player) => { player.luckyCollar = true; }, // ItemManager onHurt
  },
  39: {
    id: 39, name: "幸運黑貓掌", nameEn: "Lucky Black Paw",
    type: "passive", pool: [], rarity: "common", chargeMax: 0,
    description: "受傷時 30% 獲得短暫護盾", sprite: "39_lucky_paw.png",
    applyEffect: (player) => { player.luckyPaw = true; }, // ItemManager onHurt
  },
  40: {
    id: 40, name: "裝死技", nameEn: "Play Dead",
    type: "passive", pool: [3, 4, 5, 6], rarity: "rare", chargeMax: 0,
    description: "靜止 1 秒後進入無敵", sprite: "40_play_dead.png",
    applyEffect: (player) => { player.playDead = true; }, // ItemManager 每幀判斷
  },
  41: {
    id: 41, name: "傷痕榮耀", nameEn: "Scar Glory",
    type: "passive", pool: [], rarity: "common", chargeMax: 0,
    description: "血量上限 +1、傷害 +1", sprite: "41_scar_glory.png",
    applyEffect: (player) => {
      player.maxHP += 1;
      player.heal(1);
      player.damage += 1;
    },
  },
  42: {
    id: 42, name: "大吃大喝", nameEn: "Feast",
    type: "passive", pool: [], rarity: "common", chargeMax: 0,
    description: "血量上限 +2 並全回復", sprite: "42_feast.png",
    applyEffect: (player) => {
      player.maxHP += 2;
      player.healFull();
    },
  },
  43: {
    id: 43, name: "九條命", nameEn: "Nine Lives",
    type: "passive", pool: [4, 5, 6], rarity: "rare", chargeMax: 0,
    description: "獲得 9 條命，但血量上限變 1", sprite: "43_nine_lives.png",
    applyEffect: (player) => {
      player.lives += 9;
      player.maxHP = 1;
      player.hp = Math.min(player.hp, 1);
    },
  },
  44: {
    id: 44, name: "貓媽關愛", nameEn: "Mother's Love",
    type: "passive", pool: [], rarity: "uncommon", chargeMax: 0,
    description: "血量上限 +1、緩慢自動回血", sprite: "44_mothers_love.png",
    applyEffect: (player) => {
      player.maxHP += 1;
      player.heal(1);
      player.regenMode = true; // ItemManager 每 900f 回 0.5
    },
  },
  45: {
    id: 45, name: "超強繃帶", nameEn: "Super Bandage",
    type: "passive", pool: [], rarity: "uncommon", chargeMax: 0,
    description: "血量上限 +1、魂心 +2", sprite: "45_super_bandage.png",
    applyEffect: (player) => {
      player.maxHP += 1;
      player.heal(1);
      player.soulHearts += 2;
    },
  },
  46: {
    id: 46, name: "貓咪護盾書", nameEn: "Shield Tome",
    type: "active", pool: [], rarity: "uncommon", chargeMax: 3,
    description: "無敵 3 秒", sprite: "46_shield_tome.png",
    applyEffect: () => {},
    activeEffect: (player) => {
      player.invincibleFrames = Math.max(player.invincibleFrames, 180);
    },
  },
  47: {
    id: 47, name: "毛茸茸衝撞", nameEn: "Fluffy Ram",
    type: "active", pool: [3, 4, 5, 6], rarity: "rare", chargeMax: 6,
    description: "4 秒無敵衝撞，接觸 40 傷害", sprite: "47_fluffy_ram.png",
    applyEffect: () => {},
    activeEffect: (player, gm) => { gm.ramFrames = 240; }, // ItemManager 每幀處理
  },
  48: {
    id: 48, name: "嗝屁貓爪", nameEn: "Last Gasp Claw",
    type: "active", pool: [1, 2, 3], rarity: "uncommon", chargeMax: 0,
    description: "血量上限 -1，魂心 +3（拾取即發動）", sprite: "48_last_gasp.png",
    applyEffect: (player) => {
      // chargeMax 0 = 單次使用：拾取立即執行
      player.maxHP = Math.max(1, player.maxHP - 1);
      player.hp = Math.min(player.hp, player.maxHP);
      player.soulHearts += 3;
    },
  },
  49: {
    id: 49, name: "好運鈴鐺", nameEn: "Lucky Bell",
    type: "passive", pool: [], rarity: "common", chargeMax: 0,
    description: "幸運 +1（掉落率提升）", sprite: "49_lucky_bell.png",
    applyEffect: (player, gm) => {
      player.luck += 1;
      gm.luck += 1;
    },
  },
  50: {
    id: 50, name: "雙重保護", nameEn: "Double Guard",
    type: "passive", pool: [3, 4, 5, 6], rarity: "rare", chargeMax: 0,
    description: "飾品欄位 +1", sprite: "50_double_guard.png",
    applyEffect: (player) => { player.trinketSlots = 2; },
  },

  // ── 3.4 跟班類（51-70）──────────────────────────────
  51: {
    id: 51, name: "小灰貓", nameEn: "Gray Kitten",
    type: "passive", pool: [], rarity: "common", chargeMax: 0,
    description: "跟班：定時朝前射擊", sprite: "51_gray_kitten.png",
    applyEffect: (player, gm) => { gm.familiarManager?.add(51); },
  },
  52: {
    id: 52, name: "小花貓", nameEn: "Calico Kitten",
    type: "passive", pool: [], rarity: "common", chargeMax: 0,
    description: "跟班：定時朝前射擊", sprite: "52_calico_kitten.png",
    applyEffect: (player, gm) => { gm.familiarManager?.add(52); },
  },
  53: {
    id: 53, name: "小黑魔", nameEn: "Little Warlock",
    type: "passive", pool: [], rarity: "uncommon", chargeMax: 0,
    description: "跟班：自動瞄準最近敵人", sprite: "53_little_warlock.png",
    applyEffect: (player, gm) => { gm.familiarManager?.add(53); },
  },
  54: {
    id: 54, name: "機械鳥", nameEn: "Mech Bird",
    type: "passive", pool: [2, 3, 4], rarity: "uncommon", chargeMax: 0,
    description: "跟班：穿透雷射彈", sprite: "54_mech_bird.png",
    applyEffect: (player, gm) => { gm.familiarManager?.add(54); },
  },
  55: {
    id: 55, name: "幽靈尾巴", nameEn: "Ghost Tail",
    type: "passive", pool: [3, 4, 5, 6], rarity: "uncommon", chargeMax: 0,
    description: "跟班：穿牆幽靈彈", sprite: "55_ghost_tail.png",
    applyEffect: (player, gm) => { gm.familiarManager?.add(55); },
  },
  56: {
    id: 56, name: "小奶貓", nameEn: "Milk Kitten",
    type: "passive", pool: [], rarity: "common", chargeMax: 0,
    description: "跟班：每 30 秒生成半顆心", sprite: "56_milk_kitten.png",
    applyEffect: (player, gm) => { gm.familiarManager?.add(56); },
  },
  57: {
    id: 57, name: "小魚乾袋", nameEn: "Fish Snack Bag",
    type: "passive", pool: [], rarity: "common", chargeMax: 0,
    description: "清房後掉落 1 枚金幣", sprite: "57_fish_bag.png",
    applyEffect: (player) => { player.fishBag = true; }, // ItemManager onRoomClear
  },
  58: {
    id: 58, name: "貓毛飄散", nameEn: "Drifting Fur",
    type: "passive", pool: [2, 3, 4, 5], rarity: "uncommon", chargeMax: 0,
    description: "跟班：每 45 秒生成魂心", sprite: "58_drifting_fur.png",
    applyEffect: (player, gm) => { gm.familiarManager?.add(58); },
  },
  59: {
    id: 59, name: "毛糰仔", nameEn: "Fuzzball",
    type: "passive", pool: [], rarity: "uncommon", chargeMax: 0,
    description: "跟班：緩速彈讓敵人變慢", sprite: "59_fuzzball.png",
    applyEffect: (player, gm) => { gm.familiarManager?.add(59); },
  },
  60: {
    id: 60, name: "偵察貓", nameEn: "Scout Cat",
    type: "passive", pool: [2, 3, 4], rarity: "uncommon", chargeMax: 0,
    description: "跟班：追蹤彈", sprite: "60_scout_cat.png",
    applyEffect: (player, gm) => { gm.familiarManager?.add(60); },
  },
  61: {
    id: 61, name: "炸魚袋", nameEn: "Fish Bomb Bag",
    type: "passive", pool: [2, 3, 4], rarity: "uncommon", chargeMax: 0,
    description: "每清 2 房獲得 1 顆炸彈", sprite: "61_fish_bomb_bag.png",
    applyEffect: (player) => { player.bombBag = true; }, // ItemManager onRoomClear
  },
  62: {
    id: 62, name: "鏡像貓", nameEn: "Mirror Cat",
    type: "passive", pool: [3, 4, 5, 6], rarity: "rare", chargeMax: 0,
    description: "鏡像跟班：對稱位置反向射擊", sprite: "62_mirror_cat.png",
    applyEffect: (player, gm) => { gm.familiarManager?.add(62); },
  },
  63: {
    id: 63, name: "彩虹毛球", nameEn: "Rainbow Furball",
    type: "passive", pool: [4, 5, 6], rarity: "rare", chargeMax: 0,
    description: "跟班：隨機特效彈", sprite: "63_rainbow_furball.png",
    applyEffect: (player, gm) => { gm.familiarManager?.add(63); },
  },
  64: {
    id: 64, name: "巨爪踩踏", nameEn: "Giant Paw Stomp",
    type: "passive", pool: [3, 4, 5, 6], rarity: "rare", chargeMax: 0,
    description: "地面巡邏跟班：踩踏地面敵人", sprite: "64_giant_paw.png",
    applyEffect: (player, gm) => { gm.familiarManager?.add(64); },
  },
  65: {
    id: 65, name: "報仇小鳥", nameEn: "Revenge Bird",
    type: "passive", pool: [], rarity: "uncommon", chargeMax: 0,
    description: "受傷時放出復仇小鳥", sprite: "65_revenge_bird.png",
    applyEffect: (player) => { player.revengeBird = true; }, // ItemManager onHurt
  },
  66: {
    id: 66, name: "窺視眼球", nameEn: "Peeping Eye",
    type: "passive", pool: [2, 3, 4, 5], rarity: "uncommon", chargeMax: 0,
    description: "對角彈跳眼球：接觸傷害", sprite: "66_peeping_eye.png",
    applyEffect: (player, gm) => { gm.familiarManager?.add(66); },
  },
  67: {
    id: 67, name: "聖光跟班", nameEn: "Holy Flies",
    type: "passive", pool: [], rarity: "uncommon", chargeMax: 0,
    description: "兩個環繞光球：阻擋敵彈", sprite: "67_holy_flies.png",
    applyEffect: (player, gm) => { gm.familiarManager?.add(67); },
  },
  68: {
    id: 68, name: "乞丐貓", nameEn: "Beggar Cat",
    type: "passive", pool: [2, 3, 4, 5], rarity: "uncommon", chargeMax: 0,
    description: "自動撿金幣，集滿 5 枚掉補給", sprite: "68_beggar_cat.png",
    applyEffect: (player, gm) => { gm.familiarManager?.add(68); },
  },
  69: {
    id: 69, name: "吸血鬼貓", nameEn: "Vampire Cat",
    type: "passive", pool: [], rarity: "uncommon", chargeMax: 0,
    description: "每殺 10 隻敵人回半顆心", sprite: "69_vampire_cat.png",
    applyEffect: (player) => { player.vampire = true; }, // ItemManager onKill
  },
  70: {
    id: 70, name: "神聖環繞", nameEn: "Holy Orbit",
    type: "passive", pool: [], rarity: "common", chargeMax: 0,
    description: "兩個貼身光球：阻擋敵彈", sprite: "70_holy_orbit.png",
    applyEffect: (player, gm) => { gm.familiarManager?.add(70); },
  },

  // ── 3.5 主動道具類（71-90）──────────────────────────
  71: {
    id: 71, name: "嗚嗚貓叫", nameEn: "Yowl",
    type: "active", pool: [], rarity: "common", chargeMax: 2,
    description: "向 10 個方向齊射毛球", sprite: "71_yowl.png",
    applyEffect: () => {},
    activeEffect: (player) => {
      for (let i = 0; i < 10; i++) {
        player.spawnBullet((Math.PI * 2 * i) / 10, false);
      }
    },
  },
  72: {
    id: 72, name: "貓咪怒吼", nameEn: "Cat Roar",
    type: "active", pool: [], rarity: "rare", chargeMax: 5,
    description: "全場敵人受到 40 傷害", sprite: "72_cat_roar.png",
    applyEffect: () => {},
    activeEffect: (player, gm, room) => {
      forAllEnemies(room, e => e.takeDamage(40));
    },
  },
  73: {
    id: 73, name: "嚇呆眼神", nameEn: "Stunning Gaze",
    type: "active", pool: [], rarity: "uncommon", chargeMax: 3,
    description: "全場敵人暈眩 3 秒", sprite: "73_stunning_gaze.png",
    applyEffect: () => {},
    activeEffect: (player, gm, room) => {
      forAllEnemies(room, e => e.applyStun?.(180));
    },
  },
  74: {
    id: 74, name: "貓式傳送", nameEn: "Cat Teleport",
    type: "active", pool: [], rarity: "common", chargeMax: 1,
    description: "隨機傳送到已知房間", sprite: "74_cat_teleport.png",
    applyEffect: () => {},
    activeEffect: (player, gm) => {
      const known = gm.currentFloor?.rooms.filter(r => r.isRevealed && r.gridPos) || [];
      if (known.length === 0) return;
      const target = known[Math.floor(Math.random() * known.length)];
      EventBus.emit("requestTeleport", target.gridPos);
    },
  },
  75: {
    id: 75, name: "小魚罐頭", nameEn: "Fish Can",
    type: "active", pool: [], rarity: "common", chargeMax: 4,
    description: "回復 1 格血量", sprite: "75_fish_can.png",
    applyEffect: () => {},
    activeEffect: (player) => { player.heal(1); },
  },
  76: {
    id: 76, name: "電玩黑貓", nameEn: "Arcade Cat",
    type: "active", pool: [], rarity: "rare", chargeMax: 6,
    description: "5 秒小精靈模式：碰敵即殺", sprite: "76_arcade_cat.png",
    applyEffect: () => {},
    activeEffect: (player, gm) => { gm.pacmanFrames = 300; }, // ItemManager 每幀處理
  },
  77: {
    id: 77, name: "命運六骰", nameEn: "Dice of Fate",
    type: "active", pool: [], rarity: "rare", chargeMax: 3,
    description: "重抽房內所有道具", sprite: "77_dice_fate.png",
    applyEffect: () => {},
    activeEffect: (player, gm, room) => {
      const rng = { float: Math.random, int: (a, b) => a + Math.floor(Math.random() * (b - a + 1)) };
      for (const it of room.items) {
        if (it.constructor.name !== "ItemPickup" || !it.active) continue;
        const next = pickItemForFloor(rng, gm.floor, [...gm.items, it.itemId]);
        if (next) it.itemId = next.id;
      }
    },
  },
  78: {
    id: 78, name: "貓眼石球", nameEn: "Cat's Eye Orb",
    type: "active", pool: [], rarity: "uncommon", chargeMax: 5,
    description: "揭示全地圖並掉落魂心", sprite: "78_cats_eye.png",
    applyEffect: () => {},
    activeEffect: (player, gm, room) => {
      gm.currentFloor?.rooms.forEach(r => { r.isRevealed = true; });
      room.items.push(new SoulHeartDrop(player.x + player.w / 2, player.y));
    },
  },
  79: {
    id: 79, name: "地下通道", nameEn: "Underground Pass",
    type: "active", pool: [4, 5, 6], rarity: "rare", chargeMax: 6,
    description: "直接前往下一層", sprite: "79_underground.png",
    applyEffect: () => {},
    activeEffect: () => { EventBus.emit("requestNextFloor"); },
  },
  80: {
    id: 80, name: "利爪天罰", nameEn: "Claw Judgment",
    type: "active", pool: [], rarity: "uncommon", chargeMax: 4,
    description: "6 道光柱從天而降", sprite: "80_claw_judgment.png",
    applyEffect: () => {},
    activeEffect: (player, gm, room) => {
      for (let i = 0; i < 6; i++) {
        const x = WALL_THICKNESS + 40 + Math.random() * (CANVAS_W - WALL_THICKNESS * 2 - 80);
        room.items.push(new LightPillar(room, x, 20 + i * 8));
      }
    },
  },
  81: {
    id: 81, name: "老鼠從天降", nameEn: "Rats from Above",
    type: "active", pool: [], rarity: "uncommon", chargeMax: 3,
    description: "3 隻老鼠砸落敵人", sprite: "81_falling_rats.png",
    applyEffect: () => {},
    activeEffect: (player, gm, room) => {
      for (let i = 0; i < 3; i++) {
        const x = WALL_THICKNESS + 60 + Math.random() * (CANVAS_W - WALL_THICKNESS * 2 - 120);
        room.items.push(new FallingRat(room, x));
      }
    },
  },
  82: {
    id: 82, name: "精準飛爪", nameEn: "Precision Claw",
    type: "active", pool: [4, 5, 6], rarity: "rare", chargeMax: 4,
    description: "鎖定 2 秒後飛彈打擊（50 傷害）", sprite: "82_precision_claw.png",
    applyEffect: () => {},
    activeEffect: (player, gm, room) => {
      room.items.push(new TargetStrike(room, 50, 120));
    },
  },
  83: {
    id: 83, name: "大炸彈", nameEn: "Mega Bomb",
    type: "active", pool: [], rarity: "common", chargeMax: 2,
    description: "放置超大威力炸彈", sprite: "83_mega_bomb.png",
    applyEffect: () => {},
    activeEffect: (player, gm, room) => {
      // 普通炸彈 ×2 半徑、×1.5 傷害
      room.items.push(new Explosion(
        room, player.x + player.w / 2, player.y + player.h / 2, 160, 45, 60));
    },
  },
  84: {
    id: 84, name: "沙漏停時", nameEn: "Hourglass",
    type: "active", pool: [], rarity: "uncommon", chargeMax: 2,
    description: "敵人減速至 20%，持續 5 秒", sprite: "84_hourglass.png",
    applyEffect: () => {},
    activeEffect: (player, gm, room) => {
      forAllEnemies(room, e => e.applySlow?.(300, 0.8));
    },
  },
  85: {
    id: 85, name: "爸爸的鑰匙", nameEn: "Dad's Key",
    type: "active", pool: [4, 5, 6], rarity: "rare", chargeMax: 4,
    description: "打開所有門並揭示隱藏房", sprite: "85_dads_key.png",
    applyEffect: () => {},
    activeEffect: (player, gm) => {
      gm.currentFloor?.rooms.forEach(r => {
        r.openAllDoors();
        if (r.type === ROOM_TYPES.SECRET) r.isRevealed = true;
      });
    },
  },
  86: {
    id: 86, name: "隨機變身", nameEn: "Random Morph",
    type: "active", pool: [], rarity: "uncommon", chargeMax: 3,
    description: "召喚隨機跟班（清房消失）", sprite: "86_random_morph.png",
    applyEffect: () => {},
    activeEffect: (player, gm) => { gm.familiarManager?.spawnRandomTemp(); },
  },
  87: {
    id: 87, name: "獎勵翻倍", nameEn: "Bonus Drop",
    type: "active", pool: [], rarity: "common", chargeMax: 2,
    description: "腳下掉落隨機補給", sprite: "87_bonus_drop.png",
    applyEffect: () => {},
    activeEffect: (player, gm, room) => {
      spawnRandomPickup(room, player.x + player.w / 2, player.y);
    },
  },
  88: {
    id: 88, name: "自爆絕招", nameEn: "Self Destruct",
    type: "active", pool: [], rarity: "uncommon", chargeMax: 1,
    description: "自爆：傷敵也傷己", sprite: "88_self_destruct.png",
    applyEffect: () => {},
    activeEffect: (player, gm, room) => {
      room.items.push(new Explosion(
        room, player.x + player.w / 2, player.y + player.h / 2, 80, 30));
      damageSelf(player, 0.5);
    },
  },
  89: {
    id: 89, name: "墨水陷阱", nameEn: "Ink Trap",
    type: "active", pool: [], rarity: "common", chargeMax: 2,
    description: "腳下生成緩速墨水池", sprite: "89_ink_trap.png",
    applyEffect: () => {},
    activeEffect: (player, gm, room) => {
      room.items.push(new SlowPuddle(room, player.x + player.w / 2, FLOOR_Y, {
        radius: 60, dps: 2, duration: 480, slowAmt: 0.5,
      }));
    },
  },
  90: {
    id: 90, name: "鬼神兔牌", nameEn: "Spirit Rabbit Card",
    type: "active", pool: [], rarity: "uncommon", chargeMax: 1,
    description: "隨機發動一個主動道具效果", sprite: "90_rabbit_card.png",
    applyEffect: () => {},
    activeEffect: (player, gm, room) => {
      const actives = Object.values(ItemDatabase).filter(
        i => i.type === "active" && i.id !== 90 && i.activeEffect);
      const pick = actives[Math.floor(Math.random() * actives.length)];
      pick.activeEffect(player, gm, room);
    },
  },

  // ── 3.6 探索與特殊類（91-100）───────────────────────
  91: {
    id: 91, name: "貓鬍鬚導航", nameEn: "Whisker Nav",
    type: "passive", pool: [], rarity: "common", chargeMax: 0,
    description: "特殊房間顯示在地圖上", sprite: "91_whisker_nav.png",
    applyEffect: (player, gm) => {
      gm.revealSpecialRooms = true;
      applyMapPerks(gm, gm.currentFloor);
    },
  },
  92: {
    id: 92, name: "魚骨地圖", nameEn: "Fishbone Map",
    type: "passive", pool: [], rarity: "common", chargeMax: 0,
    description: "顯示全樓層地圖（隱藏房除外）", sprite: "92_fishbone_map.png",
    applyEffect: (player, gm) => {
      gm.revealMap = true;
      applyMapPerks(gm, gm.currentFloor);
    },
  },
  93: {
    id: 93, name: "貓X光眼", nameEn: "X-Ray Eyes",
    type: "passive", pool: [2, 3, 4, 5, 6], rarity: "uncommon", chargeMax: 0,
    description: "看穿並打開隱藏房", sprite: "93_xray_eyes.png",
    applyEffect: (player, gm) => {
      gm.xrayVision = true;
      applyMapPerks(gm, gm.currentFloor);
    },
  },
  94: {
    id: 94, name: "夜視鏡", nameEn: "Night Vision",
    type: "passive", pool: [], rarity: "common", chargeMax: 0,
    description: "地圖顯示相鄰房間內容", sprite: "94_night_vision.png",
    applyEffect: (player, gm) => { gm.showAdjacentRooms = true; }, // ItemManager 換房時揭示鄰房
  },
  95: {
    id: 95, name: "小魚乾即力量", nameEn: "Snacks are Power",
    type: "passive", pool: [], rarity: "uncommon", chargeMax: 0,
    description: "金幣越多傷害越高（最高 +10）", sprite: "95_snack_power.png",
    applyEffect: (player) => { player.coinPower = true; }, // ItemManager 每幀計算
  },
  96: {
    id: 96, name: "雙倍好運", nameEn: "Double Luck",
    type: "passive", pool: [3, 4, 5, 6], rarity: "rare", chargeMax: 0,
    description: "清房獎勵翻倍", sprite: "96_double_luck.png",
    applyEffect: (player, gm) => { gm.dropMult = 2; },
  },
  97: {
    id: 97, name: "漁市打折", nameEn: "Fish Market Sale",
    type: "passive", pool: [], rarity: "uncommon", chargeMax: 0,
    description: "商店道具半價", sprite: "97_fish_sale.png",
    applyEffect: (player, gm) => { gm.shopPriceMult = 0.5; },
  },
  98: {
    id: 98, name: "小魚乾存錢罐", nameEn: "Snack Piggy Bank",
    type: "passive", pool: [], rarity: "common", chargeMax: 0,
    description: "金幣 +5；受傷時掉出金幣", sprite: "98_piggy_bank.png",
    applyEffect: (player, gm) => {
      gm.coins += 5;
      player.piggyBank = true; // ItemManager onHurt
    },
  },
  99: {
    id: 99, name: "神秘貓箱", nameEn: "Mystery Cat Box",
    type: "passive", pool: [], rarity: "common", chargeMax: 0,
    description: "回血 + 金幣 + 炸彈 + 鑰匙", sprite: "99_mystery_box.png",
    applyEffect: (player, gm) => {
      player.heal(1);
      gm.coins += 3;
      gm.bombs += 2;
      gm.keys += 1;
    },
  },
  100: {
    id: 100, name: "九死還魂", nameEn: "Death Defier",
    type: "passive", pool: [4, 5, 6], rarity: "rare", chargeMax: 0,
    description: "死亡時 50% 機率復活（一局一次）", sprite: "100_death_defier.png",
    applyEffect: (player) => { player.reviveChance = 0.5; },
  },
};

// 依樓層與稀有度權重抽一個道具（rng = 該層種子）
// exclude：本局已出現過的 ID（避免重複）
const RARITY_WEIGHT = { common: 3, uncommon: 2, rare: 1 };

export function pickItemForFloor(rng, floorNum, exclude = []) {
  const eligible = Object.values(ItemDatabase).filter(item =>
    (item.pool.length === 0 || item.pool.includes(floorNum)) &&
    !exclude.includes(item.id));
  if (eligible.length === 0) return null;

  const totalWeight = eligible.reduce((sum, i) => sum + RARITY_WEIGHT[i.rarity], 0);
  let roll = rng.float() * totalWeight;
  for (const item of eligible) {
    roll -= RARITY_WEIGHT[item.rarity];
    if (roll <= 0) return item;
  }
  return eligible[eligible.length - 1];
}
