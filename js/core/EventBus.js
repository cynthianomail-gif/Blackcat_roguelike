// =====================================================
// EventBus.js — 發布/訂閱系統（道具 Synergy 用）
// 使用範例：
//   EventBus.on("itemPickup", (item) => synergy.check(item));
//   EventBus.emit("playerHurt", { damage: 1 });
// =====================================================

const listeners = {};

export const EventBus = {
  on(event, fn) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
  },
  emit(event, data) {
    (listeners[event] || []).forEach(fn => fn(data));
  },
  off(event, fn) {
    if (listeners[event])
      listeners[event] = listeners[event].filter(f => f !== fn);
  },
  // 清除所有監聽（重開一局時避免殘留訂閱重複觸發）
  clear(event) {
    if (event) delete listeners[event];
    else Object.keys(listeners).forEach(k => delete listeners[k]);
  }
};
