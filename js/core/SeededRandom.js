// =====================================================
// SeededRandom.js — 可重現隨機數（Park-Miller LCG）
// 同一 seed 必定產生相同序列（程序地圖可重現）
// =====================================================

export class SeededRandom {
  constructor(seed) {
    // 防呆：seed 為 0 或負數會造成死循環（規格書 Section 9）
    seed = Math.abs(Math.floor(seed)) || 1;
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }
  next() { return this.seed = this.seed * 16807 % 2147483647; }
  float() { return (this.next() - 1) / 2147483646; }
  int(min, max) { return min + Math.floor(this.float() * (max - min + 1)); }
  pick(arr) { return arr[this.int(0, arr.length - 1)]; }
}
