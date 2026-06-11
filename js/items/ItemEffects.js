// =====================================================
// ItemEffects.js — Synergy 表（企畫書 Section 5）完整 10 組
// =====================================================
import { GameManager } from "../core/GameManager.js";

export const SYNERGY_TABLE = [
  {
    name: "死亡螺旋",
    requires: [8, 3], // 毛球吐息 + 彎爪勾
    apply(player) {
      player.chargeShotMode = true;
      player.chargeHoming = true; // 蓄力彈獲得強化追蹤
    },
  },
  {
    name: "豪雨流星",
    requires: [11, 14], // 四爪攻擊 + 毛球分裂
    apply(player) {
      // 4 顆 × 命中分裂 2 = 8 顆/次（各道具已自行設定）
      player.splitDamageMult = 1.2; // Synergy 額外：分裂彈傷害 +20%
    },
  },
  {
    name: "致命彈幕",
    requires: [17, 13], // 炸裂毛 + 炸魚排
    apply(player) {
      player.bombExplosionBullets = true; // 炸彈爆炸同時四向射擊
    },
  },
  {
    name: "無限回力",
    requires: [5, 7], // 回力標 + 魚線穿透
    apply(player) {
      // 穿透 + 折返本身已各自生效；組合即「往返多段命中」
    },
  },
  {
    name: "彈跳大師",
    requires: [15, 14], // 彈力毛球 + 毛球分裂
    apply(player) {
      player.splitOnBounce = true; // 反彈時也觸發分裂
    },
  },
  {
    name: "懶人必殺",
    requires: [16, 11], // 慵懶子彈 + 四爪攻擊
    apply(player) {
      // 4 顆同時懸停後加速噴出（各道具旗標已設定）
    },
  },
  {
    name: "毒爆地圖",
    requires: [18, 17], // 毒魚 + 炸裂毛
    apply(player) {
      player.poisonCloudOnExplode = true; // 爆炸散佈毒雲
    },
  },
  {
    name: "以太穿透",
    requires: [9, 7], // 雷射眼 + 魚線穿透
    apply(player) {
      player.bulletRange *= 1.5; // 穿透使雷射射程延長
    },
  },
  {
    name: "瀕死狂神",
    requires: [32, 22, 30], // 瀕死爆發 + 磨爪石 + 戰鬥本能
    apply(player) {
      // 血量低時傷害持續累積（ItemManager.update 每秒 +0.1，無上限）
      player.berserkStackMode = true;
    },
  },
  {
    name: "貓咪軍團",
    requires: [51, 52, 53], // 小灰貓 + 小花貓 + 小黑魔
    apply(player) {
      // 三跟班火力 ×1.5，輸出接近玩家本身
      const fm = GameManager.getInstance().familiarManager;
      if (fm) fm.damageMult = 1.5;
    },
  },
];
