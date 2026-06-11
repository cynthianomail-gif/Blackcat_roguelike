// =====================================================
// GameManager.js — 單例，儲存當局所有狀態
// =====================================================

export class GameManager {
  constructor() {
    this.floor = 1;
    this.seed = Math.floor(Math.random() * 999999);
    this.player = null;       // Player 實例
    this.currentRoom = null;  // Room 實例
    this.currentFloor = null; // Floor 實例
    this.items = [];          // 玩家當前持有道具 ID 清單
    this.activeItem = null;   // 當前裝備的主動道具 ID
    this.activeItemCharge = 0;
    this.coins = 0; this.bombs = 1; this.keys = 1;
    this.luck = 0;
    this.defeatedBosses = [];
    this.killCount = 0;       // 用於吸血鬼貓道具
    this.roomsClearedCount = 0;
  }

  static getInstance() {
    if (!GameManager._instance) GameManager._instance = new GameManager();
    return GameManager._instance;
  }

  reset() { GameManager._instance = new GameManager(); }
}
