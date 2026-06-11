// =====================================================
// SaveManager.js — localStorage 存讀檔
// 僅存解鎖進度，每局不中途存檔（Roguelike 規則）
// localStorage 不可用時降級為記憶體存儲（本局不存檔）
// =====================================================

const KEY = "blackcat_v1_";

// 降級用記憶體存儲
let memoryStore = null;
let storageOk = true;
try {
  localStorage.setItem(KEY + "test", "1");
  localStorage.removeItem(KEY + "test");
} catch {
  storageOk = false;
  memoryStore = {};
}

export const SaveManager = {
  save(data) {
    if (storageOk) {
      try { localStorage.setItem(KEY + "save", JSON.stringify(data)); }
      catch { memoryStore = data; storageOk = false; }
    } else {
      memoryStore = data;
    }
  },
  load() {
    if (storageOk) {
      try { return JSON.parse(localStorage.getItem(KEY + "save")) || {}; }
      catch { return {}; }
    }
    return memoryStore || {};
  },
  getUnlocks() { return this.load().unlocks || []; },
  addUnlock(id) {
    const u = this.getUnlocks();
    if (!u.includes(id)) { u.push(id); this.save({ ...this.load(), unlocks: u }); }
  },
  getBestFloor() { return this.load().bestFloor || 0; },
  recordRun(floorReached) {
    const best = this.getBestFloor();
    if (floorReached > best) this.save({ ...this.load(), bestFloor: floorReached });
  }
};
