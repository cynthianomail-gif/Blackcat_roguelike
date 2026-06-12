// =====================================================
// Constants.js — 所有數值常數（唯一真實來源）
// 依技術規格書 v1.0 Section 2，嚴禁 Magic Number
// =====================================================

// ── 2.1 畫面 & 房間 ──────────────────────────────────
export const CANVAS_W = 900;        // 畫布寬度（px）
export const CANVAS_H = 506;        // 畫布高度（px）
export const WALL_THICKNESS = 60;   // 牆壁厚度（px）
export const FLOOR_Y = 426;         // 地板 Y 座標（M9：400→426，底帶 106→80px）
export const DOOR_W = 60;           // 門寬度（px）
export const DOOR_H = 80;           // 門高度（px）
export const TILE_SIZE = 40;        // 地板磚塊大小（px）

// ── M7 UI 字型（jf open 粉圓，OFL；boot 以 FontFace 載入）──
export const UI_FONT = "'openhuninn', sans-serif";

// ── 2.2 玩家 ─────────────────────────────────────────
export const PLAYER_SPEED = 5;             // 基礎移速（px/frame @60fps）
export const PLAYER_JUMP_FORCE = -13;      // 跳躍初速（負值=向上）
export const PLAYER_GRAVITY = 0.6;         // 重力加速度（px/frame²）
export const PLAYER_MAX_FALL = 14;         // 最大下落速度
export const PLAYER_W = 36;                // 碰撞箱寬度
export const PLAYER_H = 44;                // 碰撞箱高度
export const PLAYER_BASE_HP = 3;           // 初始最大血量（格數）
export const PLAYER_BASE_DAMAGE = 1;       // 基礎傷害
export const PLAYER_FIRE_RATE = 6;         // 射擊間隔（frames, 6f = 0.1s）
export const PLAYER_BULLET_SPEED = 14;     // 子彈速度（px/frame）
export const PLAYER_BULLET_RANGE = 420;    // 子彈最大飛行距離（px）
export const PLAYER_BULLET_W = 10;         // 子彈碰撞箱寬
export const PLAYER_BULLET_H = 10;         // 子彈碰撞箱高
export const EX_ENERGY_MAX = 100;          // EX 能量上限
export const EX_ENERGY_PER_HIT = 20;       // 命中敵人獲得 EX 能量
export const EX_BULLET_DAMAGE_MULT = 5;    // EX 子彈傷害倍率
export const EX_BULLET_SPEED = 9;          // EX 子彈速度
export const EX_BULLET_W = 24;             // EX 子彈碰撞箱寬
export const EX_BULLET_H = 24;             // EX 子彈碰撞箱高
export const DASH_SPEED = 18;              // Dash 速度
export const DASH_DURATION = 12;           // Dash 持續幀數（12f = 0.2s）
export const DASH_COOLDOWN = 60;           // Dash CD（60f = 1.0s）
export const INVINCIBILITY_FRAMES = 90;    // 受傷無敵幀（90f = 1.5s）
export const BLINK_INTERVAL = 6;           // 受傷閃爍間隔（6f = 0.1s）
export const BOBBING_AMPLITUDE = 4;        // 走路彈跳振幅（px）
export const BOBBING_FREQ = 0.15;          // 走路彈跳頻率（rad/frame）
export const TILT_MAX = 5;                 // 走路最大傾斜角度（度）
export const TILT_SPEED = 0.2;             // 傾斜 lerp 速度

// ── 2.2b 平台 & 姿態（M5.5 新功能；M9 隨 FLOOR_Y 整體 +26 平移）──
// 跳躍最大上升高度 = 13²/(2×0.6) ≈ 141px；玩家高 44px
// 地板（426）起跳腳底最高到 y≈285 → TIER1 必須 ≥ 286 才踩得到
// TIER1（306）起跳腳底最高到 y≈165 → TIER2 必須 ≥ 166
// TIER2（196）起跳頭頂可達天花板（y=60）→ 北門觸發區（y≤62）可進
export const PLATFORM_H = 14;          // 平台厚度（px）
export const PLATFORM_TIER1_Y = 306;   // 第一層平台頂面 Y
export const PLATFORM_TIER2_Y = 196;   // 第二層平台頂面 Y（通北門）
export const PLATFORM_DROP_FRAMES = 10;// 下穿平台的穿透幀數
export const CROUCH_H = 26;            // 趴下碰撞箱高度（站立 44）
export const CROUCH_SPEED_MULT = 0.45; // 趴下移速倍率
export const RUN_FRAME_INTERVAL = 8;   // 跑步動畫換幀間隔（frames）

// ── 2.3 地圖生成 ─────────────────────────────────────
export const GRID_W = 9;           // 地圖格子寬度（格數）
export const GRID_H = 7;           // 地圖格子高度（格數）
export const MIN_ROOMS = 7;        // 每層最少房間數
export const MAX_ROOMS = 13;       // 每層最多房間數
export const ROOM_TYPES = {
  NORMAL:    "NORMAL",
  TREASURE:  "TREASURE",  // 道具房（免費道具）
  SHOP:      "SHOP",
  BOSS:      "BOSS",
  SECRET:    "SECRET",    // 隱藏房（需炸彈/X光）
  CHALLENGE: "CHALLENGE", // 挑戰房（主動進入）
  DEVIL:     "DEVIL",     // 魔鬼房
  ANGEL:     "ANGEL",     // 天使房
};
// 保證每層必出房間：TREASURE × 1, SHOP × 1, BOSS × 1
// 隨機出現：SECRET 0-1, CHALLENGE 0-1, DEVIL 0-1 (或 ANGEL 0-1)

// ── 2.4 子彈物件池 ───────────────────────────────────
export const BULLET_POOL_SIZE = 150;   // 最大活躍子彈數
export const BOSS_BULLET_POOL = 80;    // Boss 子彈池大小
// 超出上限時：銷毀最早創建的子彈（FIFO）

// ── Task 13 平衡旋鈕（Section 8 平衡驗收：估算後調整）──
// 估算基準：初始 DPS 理論 10/s、實戰有效 2~4/s
export const ENEMY_HP_SCALE = 2.5;  // 普通房清怪時間 6s → 約 15-30s
export const BOSS_HP_SCALE = 1.6;   // F1 Boss 200→320：中期 DPS 下約 65-105s

// ── 2.5 經濟系統 ─────────────────────────────────────
export const COIN_DROP_CHANCE = 0.5;    // 普通敵人掉金幣機率（平衡：0.6→0.5，通關估算 104→87 枚）
export const HEART_DROP_CHANCE = 0.15;  // 普通敵人掉紅心機率
export const BOMB_DROP_CHANCE = 0.08;   // 普通敵人掉炸彈機率
export const KEY_DROP_CHANCE = 0.05;    // 普通敵人掉鑰匙機率
export const SHOP_ITEM_PRICE_BASE = 7;  // 商店道具基礎價格（小魚乾）
export const SHOP_HEART_PRICE = 3;      // 商店紅心價格
export const SHOP_BOMB_PRICE = 2;       // 商店炸彈價格
export const SHOP_KEY_PRICE = 3;        // 商店鑰匙價格

// ── 2.6 Boss ─────────────────────────────────────────
export const BOSS_PHASE2_THRESHOLD = 0.5; // 血量降至 50% 觸發 Phase 2
export const BOSS_HIT_FLASH_FRAMES = 3;   // 受傷白閃持續幀數
export const BOSS_DEATH_DURATION = 40;    // 死亡縮放動畫幀數
export const BOSS_REWARD_COINS = [5, 8, 8, 12, 12, 15]; // 各層 Boss 金幣獎勵

// ── 樓層 ────────────────────────────────────────────
export const FINAL_FLOOR = 7; // F1-F6 → F7（最終 Boss 層）→ 通關 RUN_CLEAR

// ── M7 樓層顯示名（轉場字卡）──
export const FLOOR_NAMES = {
  1: "陽光屋頂", 2: "深夜廚房", 3: "雨夜暗巷",
  4: "廢棄倉庫", 5: "神秘圖書館", 6: "月光神社", 7: "流浪終點",
};
