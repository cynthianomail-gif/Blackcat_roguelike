// =====================================================
// BossPattern.js — 全 Boss 彈幕定義（企畫書 Section 6）
// 每層 Boss A/B 共 12 個 + 最終 Boss（混沌流浪之神）
// 彈幕原型：fan（扇形）/ ring（環形）/ spiral（旋轉）/
//           rain（頂部彈雨）/ burst（連發直射）/ summon（召喚）
// =====================================================
import { CANVAS_W, WALL_THICKNESS } from "../../core/Constants.js";
import { Cockroach, Mouse } from "../enemies/F2Enemies.js";
import { Ghost } from "../enemies/F3Enemies.js";

const DEG = Math.PI / 180;
const CEILING_Y = WALL_THICKNESS;

// ── 彈幕原型 ─────────────────────────────────────────
function center(boss) {
  return { x: boss.x + boss.w / 2, y: boss.y + boss.h / 2 };
}

function aimAngle(boss, player) {
  const c = center(boss);
  return Math.atan2((player.y + player.h / 2) - c.y, (player.x + player.w / 2) - c.x);
}

// 朝玩家扇形散射
function fan(boss, player, pool, { count = 5, spreadDeg = 15, speed = 4.5, damage = 1 } = {}) {
  const c = center(boss);
  const aim = aimAngle(boss, player);
  for (let i = 0; i < count; i++) {
    const angle = aim + (i - (count - 1) / 2) * spreadDeg * DEG;
    pool.spawn({ x: c.x, y: c.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, damage });
  }
}

// 環形（含旋轉偏移 → spiral）
function ring(boss, pool, { count = 8, speed = 5, rotateDeg = 0, damage = 1 } = {}) {
  const c = center(boss);
  if (rotateDeg) boss.patternAngle = (boss.patternAngle || 0) + rotateDeg * DEG;
  for (let i = 0; i < count; i++) {
    const angle = (boss.patternAngle || 0) + (i / count) * Math.PI * 2;
    pool.spawn({ x: c.x, y: c.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, damage });
  }
}

// 頂部彈雨（隨機 x 下落）
function rain(pool, { count = 6, speed = 4, damage = 1, sinDrift = 0 } = {}) {
  for (let i = 0; i < count; i++) {
    const x = WALL_THICKNESS + 30 + Math.random() * (CANVAS_W - WALL_THICKNESS * 2 - 60);
    pool.spawn({
      x, y: CEILING_Y + 20,
      vx: sinDrift ? (Math.random() - 0.5) * sinDrift : 0,
      vy: speed, damage,
    });
  }
}

// 召喚小怪（上限防爆房）
function summon(boss, EnemyClass, n = 2, cap = 5) {
  if (!boss.room) return;
  const alive = boss.room.enemies.filter(e => e.active && e !== boss).length;
  for (let i = 0; i < n && alive + i < cap; i++) {
    const x = WALL_THICKNESS + 80 + Math.random() * (CANVAS_W - WALL_THICKNESS * 2 - 160);
    const e = EnemyClass.length >= 2 ? new EnemyClass(x, CEILING_Y + 100) : new EnemyClass(x);
    e.room = boss.room;
    boss.room.enemies.push(e);
  }
}

// ── F1 ───────────────────────────────────────────────
export const FEATHERTOP = {
  name: "鴿王羽毛", nameEn: "Feathertop", hp: 200, w: 110, h: 96,
  phase1: {
    interval: 120,
    fire(boss, player, pool) {
      fan(boss, player, pool, { count: 5, spreadDeg: 15, speed: 4.5 }); // 扇形散射
      if ((boss.volley = (boss.volley || 0) + 1) % 2 === 0) {
        rain(pool, { count: 4, speed: 3.5 }); // 羽毛雨
      }
    },
  },
  phase2: {
    interval: 80,
    fire(boss, player, pool) {
      ring(boss, pool, { count: 8, speed: 5.5, rotateDeg: 22.5 }); // 旋轉散射
    },
  },
};

export const ANTENNA = {
  name: "天線怪", nameEn: "Antenna Fiend", hp: 220, w: 90, h: 110,
  phase1: {
    interval: 100,
    fire(boss, player, pool) {
      // 電波三連直射 + 偶數輪頂部靜電雨
      fan(boss, player, pool, { count: 3, spreadDeg: 8, speed: 5.5 });
      if ((boss.volley = (boss.volley || 0) + 1) % 2 === 0) rain(pool, { count: 3, speed: 4.5 });
    },
  },
  phase2: {
    interval: 70,
    fire(boss, player, pool) {
      ring(boss, pool, { count: 6, speed: 6, rotateDeg: 30 }); // 旋轉散射加速
      fan(boss, player, pool, { count: 1, speed: 7 });
    },
  },
};

// ── F2 ───────────────────────────────────────────────
export const ROACH_KING = {
  name: "蟑螂王", nameEn: "Roach King", hp: 280, w: 120, h: 90,
  phase1: {
    interval: 110,
    fire(boss, player, pool) {
      fan(boss, player, pool, { count: 4, spreadDeg: 20, speed: 4 }); // 分裂彈幕（寬扇形）
      if ((boss.volley = (boss.volley || 0) + 1) % 3 === 0) summon(boss, Cockroach, 2); // 蟑螂召喚
    },
  },
  phase2: {
    interval: 90,
    fire(boss, player, pool) {
      rain(pool, { count: 7, speed: 4.5, sinDrift: 2 }); // 上方彈幕雨
      ring(boss, pool, { count: 4, speed: 3.5, rotateDeg: 45 }); // 蒸氣柱（簡化為十字噴發）
    },
  },
};

export const POT_MONSTER = {
  name: "鍋子怪", nameEn: "Pot Fiend", hp: 300, w: 100, h: 100,
  phase1: {
    interval: 120,
    fire(boss, player, pool) {
      ring(boss, pool, { count: 8, speed: 3.5 }); // 沸騰油滴四濺
      fan(boss, player, pool, { count: 1, speed: 6 });
    },
  },
  phase2: {
    interval: 80,
    fire(boss, player, pool) {
      rain(pool, { count: 8, speed: 5, sinDrift: 3 }); // 蒸氣上湧 → 落下彈雨
    },
  },
};

// ── F3 ───────────────────────────────────────────────
export const ALLEY_DOG_KING = {
  name: "巷霸犬王", nameEn: "Alley Dog King", hp: 360, w: 130, h: 90,
  phase1: {
    interval: 100,
    fire(boss, player, pool) {
      // 吠聲震波（環形）+ 撲咬（朝玩家三連快彈）
      ring(boss, pool, { count: 8, speed: 4 });
      fan(boss, player, pool, { count: 3, spreadDeg: 6, speed: 7 });
    },
  },
  phase2: {
    interval: 75,
    fire(boss, player, pool) {
      rain(pool, { count: 6, speed: 4, sinDrift: 4 }); // Sin 波雨
      fan(boss, player, pool, { count: 2, spreadDeg: 30, speed: 6 }); // 倒影夾擊
    },
  },
};

export const RAIN_CAT = {
  name: "雨夜妖貓", nameEn: "Rain Cat", hp: 380, w: 90, h: 100,
  phase1: {
    interval: 90,
    fire(boss, player, pool) {
      rain(pool, { count: 5, speed: 5 }); // 雨幕
      if ((boss.volley = (boss.volley || 0) + 1) % 2 === 0) summon(boss, Ghost, 1, 3);
    },
  },
  phase2: {
    interval: 70,
    fire(boss, player, pool) {
      ring(boss, pool, { count: 10, speed: 4.5, rotateDeg: 18 }); // 妖氣螺旋
    },
  },
};

// ── F4 ───────────────────────────────────────────────
export const RAT_KING = {
  name: "倉庫鼠王", nameEn: "Rat King", hp: 450, w: 130, h: 100,
  phase1: {
    interval: 100,
    fire(boss, player, pool) {
      // Sin 波子彈（扇形交錯模擬波動）+ 鼠群召喚
      fan(boss, player, pool, { count: 5, spreadDeg: 12, speed: 4.5 });
      if ((boss.volley = (boss.volley || 0) + 1) % 3 === 0) summon(boss, Mouse, 2);
    },
  },
  phase2: {
    interval: 80,
    fire(boss, player, pool) {
      // 牆壁彈射 + 齒輪散彈
      const c = center(boss);
      for (const dir of [-1, 1]) {
        pool.spawn({ x: c.x, y: c.y, vx: dir * 6, vy: -2, damage: 1, bounces: 2 });
      }
      ring(boss, pool, { count: 6, speed: 5, rotateDeg: 30 });
    },
  },
};

export const ROLLER = {
  name: "機械壓路機", nameEn: "Steamroller", hp: 470, w: 150, h: 80,
  phase1: {
    interval: 110,
    fire(boss, player, pool) {
      fan(boss, player, pool, { count: 4, spreadDeg: 10, speed: 5.5 }); // 鉚釘連射
      rain(pool, { count: 3, speed: 5 });
    },
  },
  phase2: {
    interval: 85,
    fire(boss, player, pool) {
      const c = center(boss);
      for (let i = 0; i < 4; i++) { // 齒輪四向彈射
        const angle = Math.PI / 4 + (i / 4) * Math.PI * 2;
        pool.spawn({
          x: c.x, y: c.y,
          vx: Math.cos(angle) * 5.5, vy: Math.sin(angle) * 5.5,
          damage: 1, bounces: 2,
        });
      }
    },
  },
};

// ── F5 ───────────────────────────────────────────────
export const TOME_GOD = {
  name: "古籍魔神", nameEn: "Tome God", hp: 550, w: 110, h: 120,
  phase1: {
    interval: 95,
    fire(boss, player, pool) {
      // 咒文雷射（高速直線三連）+ 封印光環
      fan(boss, player, pool, { count: 3, spreadDeg: 0, speed: 8 });
      ring(boss, pool, { count: 6, speed: 3 });
    },
  },
  phase2: {
    interval: 75,
    fire(boss, player, pool) {
      rain(pool, { count: 8, speed: 4.5 }); // 字母迷宮（密集落下）
      fan(boss, player, pool, { count: 1, speed: 6.5 }); // 書本砲彈
    },
  },
};

export const LIBRARIAN = {
  name: "圖書管理員", nameEn: "The Librarian", hp: 570, w: 90, h: 130,
  phase1: {
    interval: 90,
    fire(boss, player, pool) {
      ring(boss, pool, { count: 9, speed: 4, rotateDeg: 13 }); // 書頁旋風
    },
  },
  phase2: {
    interval: 65,
    fire(boss, player, pool) {
      fan(boss, player, pool, { count: 5, spreadDeg: 9, speed: 6.5 });
      rain(pool, { count: 4, speed: 5.5, sinDrift: 2 });
    },
  },
};

// ── F6 ───────────────────────────────────────────────
export const NINETAIL = {
  name: "九尾靈狐", nameEn: "Ninetail", hp: 650, w: 120, h: 110,
  phase1: {
    interval: 90,
    fire(boss, player, pool) {
      ring(boss, pool, { count: 9, speed: 4.5 }); // 九方向彈幕
      if ((boss.volley = (boss.volley || 0) + 1) % 2 === 0) {
        fan(boss, player, pool, { count: 2, spreadDeg: 40, speed: 6 }); // 分身殘影夾擊
      }
    },
  },
  phase2: {
    interval: 55,
    fire(boss, player, pool) {
      ring(boss, pool, { count: 7, speed: 6, rotateDeg: 25 }); // 七彩狐火高速螺旋
    },
  },
};

export const GATE_GUARDIAN = {
  name: "守門神", nameEn: "Gate Guardian", hp: 680, w: 140, h: 130,
  phase1: {
    interval: 105,
    fire(boss, player, pool) {
      fan(boss, player, pool, { count: 7, spreadDeg: 12, speed: 4.5 }); // 注連繩橫掃
      rain(pool, { count: 3, speed: 5 });
    },
  },
  phase2: {
    interval: 70,
    fire(boss, player, pool) {
      ring(boss, pool, { count: 12, speed: 4, rotateDeg: 15 }); // 御幣風暴
    },
  },
};

// ── 最終 Boss：混沌流浪之神（隨機切換 12 種彈幕）──────
const ALL_PATTERNS = [
  FEATHERTOP, ANTENNA, ROACH_KING, POT_MONSTER, ALLEY_DOG_KING, RAIN_CAT,
  RAT_KING, ROLLER, TOME_GOD, LIBRARIAN, NINETAIL, GATE_GUARDIAN,
];

export const CHAOS_GOD = {
  name: "混沌流浪之神", nameEn: "Chaos Wanderer", hp: 900, w: 150, h: 140,
  phase1: {
    interval: 90,
    fire(boss, player, pool) {
      // 每 3 輪隨機借用一個 Boss 的 Phase 1 彈幕
      boss.volley = (boss.volley || 0) + 1;
      if (boss.volley % 3 === 1 || !boss.borrowed) {
        boss.borrowed = ALL_PATTERNS[Math.floor(Math.random() * ALL_PATTERNS.length)];
      }
      boss.borrowed.phase1.fire(boss, player, pool);
    },
  },
  phase2: {
    interval: 60,
    fire(boss, player, pool) {
      // 全技能高速強化：隨機借用 Phase 2 + 追加直射
      boss.borrowed2 = ALL_PATTERNS[Math.floor(Math.random() * ALL_PATTERNS.length)];
      boss.borrowed2.phase2.fire(boss, player, pool);
      fan(boss, player, pool, { count: 1, speed: 8 });
    },
  },
};

// ── 各層 Boss 註冊表（A/B 二選一由地圖種子決定）───────
export const BOSS_BY_FLOOR = {
  1: [FEATHERTOP, ANTENNA],
  2: [ROACH_KING, POT_MONSTER],
  3: [ALLEY_DOG_KING, RAIN_CAT],
  4: [RAT_KING, ROLLER],
  5: [TOME_GOD, LIBRARIAN],
  6: [NINETAIL, GATE_GUARDIAN],
  7: [CHAOS_GOD],
};
