// =====================================================
// AudioEvents.js — EventBus → Audio 集中接線（音訊規格書 Section 4.2）
// 所有遊戲事件已經過 EventBus，統一在此訂閱，不散落各檔案
// =====================================================
import { EventBus } from "../core/EventBus.js";
import { Audio } from "./AudioManager.js";
import { ROOM_TYPES } from "../core/Constants.js";

// 同幀多門齊開（openAllDoors）只播一次
let lastDoorSfx = 0;

export function wireAudioEvents(state, STATES) {
  // ── 玩家動作 ──
  EventBus.on("playerShoot",   () => Audio.playSFX("shoot"));
  EventBus.on("playerShootEX", () => Audio.playSFX("shoot_ex"));
  EventBus.on("playerDash",    () => Audio.playSFX("dash"));
  EventBus.on("playerJump",    () => Audio.playSFX("jump"));
  EventBus.on("playerLand",    () => Audio.playSFX("land"));
  EventBus.on("playerHurt",    () => Audio.playSFX("player_hurt"));
  EventBus.on("playerHeal",    () => Audio.playSFX("heal"));
  EventBus.on("playerDied",    () => { Audio.playSFX("player_death"); Audio.stopBGM(); });

  // ── 敵人 / Boss ──
  EventBus.on("enemyHurt",  () => Audio.playSFX("enemy_hurt"));
  EventBus.on("enemyDied",  () => Audio.playSFX("enemy_death"));
  EventBus.on("bossPhase2", () => Audio.playSFX("boss_phase2"));
  EventBus.on("bossDied",   () => { Audio.playSFX("boss_death"); Audio.onBossDeath(); });

  // Boss 出現：進入未清除的 Boss 房 → 出場音 + Boss BGM
  EventBus.on("roomChanged", ({ room }) => {
    if (room?.type === ROOM_TYPES.BOSS && !room.isCleared) {
      Audio.playSFX("boss_appear");
      Audio.onBossStart();
    }
  });

  // ── 道具 / 經濟 ──
  EventBus.on("itemPickup",       () => Audio.playSFX("item_pickup"));
  EventBus.on("synergyActivated", () => Audio.playSFX("synergy"));
  EventBus.on("activeItemUsed",   () => Audio.playSFX("active_use"));
  EventBus.on("coinPickup",       () => Audio.playSFX("coin_drop"));
  EventBus.on("shopPurchase",     () => Audio.playSFX("shop_buy"));
  EventBus.on("shopFail",         () => Audio.playSFX("error"));

  // ── 房間 / 樓層 ──
  EventBus.on("roomCleared", () => Audio.playSFX("room_clear"));
  EventBus.on("doorOpen", () => {
    const now = performance.now();
    if (now - lastDoorSfx < 100) return;
    lastDoorSfx = now;
    Audio.playSFX("door_open");
  });
  EventBus.on("floorChanged", (floorNum) => Audio.onFloorChange(floorNum));

  // ── 全域狀態 ──
  EventBus.on("stateChange", (newState) => {
    if (newState === STATES.MAIN_MENU)        Audio.onMainMenu();
    if (newState === STATES.FLOOR_TRANSITION) Audio.playSFX("floor_transition");
  });
}
