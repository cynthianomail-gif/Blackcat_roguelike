// =====================================================
// StateManager.js — 遊戲狀態機 FSM
// =====================================================
import { EventBus } from "./EventBus.js";

export const STATES = {
  LOADING: "LOADING", MAIN_MENU: "MAIN_MENU",
  EXPLORING: "EXPLORING", BATTLING: "BATTLING",
  BOSS_BATTLE: "BOSS_BATTLE", ITEM_POPUP: "ITEM_POPUP",
  SHOP_OPEN: "SHOP_OPEN", PAUSED: "PAUSED",
  PLAYER_DEAD: "PLAYER_DEAD", RUN_CLEAR: "RUN_CLEAR",
  FLOOR_TRANSITION: "FLOOR_TRANSITION"
};

export class StateManager {
  constructor() { this.current = STATES.LOADING; }

  change(newState) {
    console.log(`[State] ${this.current} → ${newState}`);
    this.current = newState;
    EventBus.emit("stateChange", newState);
  }

  is(state) { return this.current === state; }
}
