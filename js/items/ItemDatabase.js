// =====================================================
// ItemDatabase.js — 道具資料庫（Section 3）
// Task 7：ID 01-20（子彈改造類）完整定義
// ID 21-100：Task 12 實作（TODO）
// 標注 [引擎TODO] 的效果：旗標已設定，子彈引擎支援於 Task 12 補上
// =====================================================

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
  // ── ID 21-100：傷害強化/血量/跟班/主動道具等 ──
  // TODO Task 12：依 Section 3.2-3.6 補完
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
