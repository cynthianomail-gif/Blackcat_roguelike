// main.js — Task 1 驗證用 stub（Task 2 將替換為完整遊戲主循環）
import { CANVAS_W, CANVAS_H } from "./core/Constants.js";
import { EventBus } from "./core/EventBus.js";
import { GameManager } from "./core/GameManager.js";
import { StateManager, STATES } from "./core/StateManager.js";
import { SaveManager } from "./core/SaveManager.js";

// ── Task 1 驗證 ──
console.log("[Task1] Constants:", CANVAS_W, "x", CANVAS_H);

// EventBus on/emit
let busOk = false;
EventBus.on("test", () => { busOk = true; });
EventBus.emit("test");
console.log("[Task1] EventBus on/emit:", busOk ? "OK" : "FAIL");

// GameManager 單例
const gm1 = GameManager.getInstance();
const gm2 = GameManager.getInstance();
console.log("[Task1] GameManager singleton:", gm1 === gm2 ? "OK" : "FAIL");

// StateManager 狀態轉換
const state = new StateManager();
state.change(STATES.MAIN_MENU);
console.log("[Task1] StateManager is(MAIN_MENU):", state.is(STATES.MAIN_MENU) ? "OK" : "FAIL");

// SaveManager save/load
SaveManager.save({ test: 123, unlocks: [] });
const loaded = SaveManager.load();
console.log("[Task1] SaveManager save/load:", loaded.test === 123 ? "OK" : "FAIL");
SaveManager.addUnlock("test_unlock");
console.log("[Task1] SaveManager unlocks:", SaveManager.getUnlocks().includes("test_unlock") ? "OK" : "FAIL");
