// =====================================================
// ChallengeRoom.js — 挑戰房（Task 13）
// 主動進入後鎖門（Room.enter 既有邏輯：有敵人即鎖門）、
// 敵人數量 1.5 倍、清怪獎勵翻倍（main.js 掉落監聽器處理）
// =====================================================

export function setupChallengeRoom(room, rng, floorNum, spawnEnemies) {
  // 兩波合併生成：敵人約為普通房 1.5~2 倍
  spawnEnemies(room, rng);
  const firstWave = room.enemies.length;
  spawnEnemies(room, rng);
  // 控制上限：總數不超過第一波的 2 倍
  room.enemies.length = Math.min(room.enemies.length, Math.max(3, firstWave * 2));
  room.isChallenge = true; // 掉落翻倍判定用
}
