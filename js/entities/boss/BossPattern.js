// =====================================================
// BossPattern.js — Boss 彈幕模式定義
// Task 8：F1 Boss A 鴿王羽毛（Feathertop）
// Phase 1：扇形散射（120f / 5顆 / 夾角15° / 速4.5）
// Phase 2：旋轉散射（80f / 8顆 / 每輪+22.5° / 速5.5）
// =====================================================

const DEG = Math.PI / 180;

export const FEATHERTOP = {
  name: "鴿王羽毛",
  nameEn: "Feathertop",
  hp: 200,
  w: 110, h: 96,

  phase1: {
    interval: 120,
    fire(boss, player, pool) {
      // 向玩家方向 5 顆，夾角 15°
      const cx = boss.x + boss.w / 2, cy = boss.y + boss.h / 2;
      const aim = Math.atan2(
        (player.y + player.h / 2) - cy,
        (player.x + player.w / 2) - cx,
      );
      for (let i = 0; i < 5; i++) {
        const angle = aim + (i - 2) * 15 * DEG;
        pool.spawn({
          x: cx, y: cy,
          vx: Math.cos(angle) * 4.5, vy: Math.sin(angle) * 4.5,
          damage: 1,
        });
      }
    },
  },

  phase2: {
    interval: 80,
    fire(boss, player, pool) {
      // 8 顆環形，起始角每輪旋轉 22.5°
      const cx = boss.x + boss.w / 2, cy = boss.y + boss.h / 2;
      boss.patternAngle = (boss.patternAngle || 0) + 22.5 * DEG;
      for (let i = 0; i < 8; i++) {
        const angle = boss.patternAngle + i * 45 * DEG;
        pool.spawn({
          x: cx, y: cy,
          vx: Math.cos(angle) * 5.5, vy: Math.sin(angle) * 5.5,
          damage: 1,
        });
      }
    },
  },
};

// 各層 Boss 註冊表（Task 11 補滿 12 個 + 最終 Boss）
export const BOSS_BY_FLOOR = {
  1: FEATHERTOP,
  // TODO Task 11: 2-6 層 Boss + 天線怪（F1 Boss B）
};
