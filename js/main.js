// =====================================================
// main.js — 遊戲主入口 + 主循環（60fps 正規化 dt）
// =====================================================
import { Renderer } from "./render/Renderer.js";
import { Camera } from "./render/Camera.js";
import { loadAllAssets } from "./render/AssetLoader.js";
import { GameManager } from "./core/GameManager.js";
import { StateManager, STATES } from "./core/StateManager.js";
import { Input } from "./core/Input.js";
import { EventBus } from "./core/EventBus.js";
import { Player } from "./entities/Player.js";
import { BulletPool } from "./entities/BulletPool.js";
import { ItemManager } from "./items/ItemManager.js";
import { FamiliarManager } from "./items/Familiar.js";
import { Coin } from "./items/Coin.js";
import { HeartDrop, BombDrop, KeyDrop } from "./items/Drops.js";
import { SynergyAlert } from "./ui/SynergyAlert.js";
import { HUD } from "./ui/HUD.js";
import { MapDisplay } from "./ui/MapDisplay.js";
import { ItemDisplay } from "./ui/ItemDisplay.js";
import { Screens } from "./ui/Screens.js";
import { SaveManager } from "./core/SaveManager.js";
import { generateFloor } from "./world/RoomGenerator.js";
import {
  CANVAS_W, FLOOR_Y, PLAYER_H,
  COIN_DROP_CHANCE, HEART_DROP_CHANCE, BOMB_DROP_CHANCE, KEY_DROP_CHANCE,
} from "./core/Constants.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const renderer = new Renderer(ctx, canvas.width, canvas.height);
const camera = new Camera();
const state = new StateManager();
const input = new Input();
const gm = GameManager.getInstance();

// ── 玩家 + 子彈池 ──
const bulletPool = new BulletPool();
const player = new Player(CANVAS_W / 2, FLOOR_Y - PLAYER_H, bulletPool);
gm.player = player;

// ── 道具系統 ──
const itemManager = new ItemManager(player, gm);
gm.itemManager = itemManager;

// ── 跟班系統（Task 12）──
const familiarManager = new FamiliarManager(player, bulletPool);
gm.familiarManager = familiarManager;

// ── UI 層 ──
const synergyAlert = new SynergyAlert();
const hud = new HUD(player, gm);
const mapDisplay = new MapDisplay(input);
const itemDisplay = new ItemDisplay();
const screens = new Screens(state, gm);

// ── 程序生成樓層 ──
let floor = generateFloor(1, gm.seed);
floor.currentRoom.enter();
gm.currentFloor = floor;
gm.currentRoom = floor.currentRoom;

renderer.scene.camera = camera;
renderer.scene.player = player;
renderer.scene.bullets = bulletPool.bullets;
renderer.scene.familiars = familiarManager.familiars;
renderer.scene.synergyAlert = synergyAlert;
renderer.scene.hud = hud;
renderer.scene.mapDisplay = mapDisplay;
renderer.scene.itemDisplay = itemDisplay;
renderer.scene.screens = screens;
mapDisplay.floor = floor;

function syncSceneToRoom() {
  const room = floor.currentRoom;
  gm.currentRoom = room;
  renderer.scene.room = room;
  renderer.scene.enemies = room?.enemies || [];
  renderer.scene.enemyBullets = room?.enemyBullets || [];
  renderer.scene.bossBullets = room?.boss?.bulletPool.bullets || [];
}
syncSceneToRoom();

let lastTime = 0;
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;

// FPS 計測（驗證用）
let fpsCounter = 0, fpsTime = 0;

function gameLoop(timestamp) {
  const dt = Math.min(timestamp - lastTime, 50); // cap at 50ms 防止卡頓跳幀
  if (dt >= FRAME_TIME) {
    lastTime = timestamp;
    update(dt / FRAME_TIME); // normalize to 60fps delta（dt ≈ 1.0 @60fps）
    renderer.render();

    fpsCounter++;
    fpsTime += dt;
    if (fpsTime >= 1000) {
      window.game.fps = Math.round(fpsCounter * 1000 / fpsTime);
      fpsCounter = 0; fpsTime = 0;
    }
  }
  requestAnimationFrame(gameLoop);
}

function update(dt) {
  screens.update(dt);

  // ── 全螢幕狀態閘門：選單/死亡/通關/暫停時凍結遊戲 ──
  if (state.is(STATES.MAIN_MENU)) {
    if (input.confirmPressed) state.change(STATES.EXPLORING);
    input.endFrame();
    return;
  }
  if (state.is(STATES.PLAYER_DEAD) || state.is(STATES.RUN_CLEAR)) {
    if (input.confirmPressed) window.location.reload(); // 回主選單（重開乾淨一局）
    input.endFrame();
    return;
  }
  if (state.is(STATES.PAUSED)) {
    if (input.pausePressed) state.change(STATES.EXPLORING);
    input.endFrame();
    return;
  }
  if (input.pausePressed) {
    state.change(STATES.PAUSED);
    input.endFrame();
    return;
  }

  camera.update();
  if (player.active) player.update(dt, input);

  const room = floor.currentRoom;
  if (room) {
    room.update(dt, player, input);
    room.handleBulletCollisions(bulletPool.bullets);

    // E 鍵：主動道具（靠近商品/交易時讓位給購買互動）
    if (input.usePressed && player.active) {
      const nearInteractable = room.items.some(i => i.active && i.playerNear);
      if (!nearInteractable) itemManager.useActive(room);
    }

    // 門觸發 → 房間切換
    const dir = room.checkDoorTransition(player);
    if (dir) {
      const next = floor.moveTo(dir, player);
      if (next) {
        bulletPool.clear(); // 換房清空子彈
        syncSceneToRoom();
      }
    }
  }

  const enemies = renderer.scene.enemies || [];
  const activeEnemies = enemies.filter(e => e.active);
  bulletPool.update(dt, activeEnemies, player);
  player.updateLaser(dt, activeEnemies);          // 雷射眼/永恆凝視
  familiarManager.update(dt, floor.currentRoom, activeEnemies);
  itemManager.update(dt, input, floor.currentRoom); // 每幀道具邏輯
  synergyAlert.update(dt);
  hud.update(dt);
  itemDisplay.update(dt);

  if (floorTransitionTimer >= 0) {
    floorTransitionTimer -= dt;
    if (floorTransitionTimer < 0) {
      state.change(STATES.FLOOR_TRANSITION);
      goToNextFloor();
    }
  }

  input.endFrame();
}

// Task 6 驗收：敵人死亡時 Console 輸出
EventBus.on("enemyDied", (e) => console.log("enemyDied:", e.constructor.name));

// ── 敵人掉落（Section 2.5 經濟）：金幣/紅心/炸彈/鑰匙 ──
// 幸運 +3%/點；挑戰房與雙倍好運道具掉落翻倍
EventBus.on("enemyDied", (e) => {
  const room = gm.currentRoom;
  if (!room || !e || e === room.boss || !e.w) return; // Boss 獎勵由 BossController 發
  const x = e.x + e.w / 2, y = e.y + e.h / 2;
  const luckBonus = Math.min((gm.luck || 0) * 0.03, 0.09);
  const mult = (gm.dropMult || 1) * (room.isChallenge ? 2 : 1);
  const roll = Math.random();
  let make = null;
  if (roll < COIN_DROP_CHANCE + luckBonus) make = () => new Coin(x, y);
  else if (roll < COIN_DROP_CHANCE + HEART_DROP_CHANCE + luckBonus) make = () => new HeartDrop(x, y, 0.5);
  else if (roll < COIN_DROP_CHANCE + HEART_DROP_CHANCE + BOMB_DROP_CHANCE + luckBonus) make = () => new BombDrop(x, y);
  else if (roll < COIN_DROP_CHANCE + HEART_DROP_CHANCE + BOMB_DROP_CHANCE + KEY_DROP_CHANCE + luckBonus) make = () => new KeyDrop(x, y);
  if (make) for (let i = 0; i < mult; i++) room.items.push(make());
});

// 玩家死亡 → 記錄最高層數 → 死亡畫面
EventBus.on("playerDied", () => {
  SaveManager.recordRun(gm.floor);
  state.change(STATES.PLAYER_DEAD);
});

// Boss 死亡 → 0.8 秒（48 幀）後進入 FLOOR_TRANSITION
let floorTransitionTimer = -1;
EventBus.on("bossDied", () => { floorTransitionTimer = 48; });

// 地下通道（79）：立即跳到下一層
EventBus.on("requestNextFloor", () => goToNextFloor());

// 貓式傳送（74）：跳到指定格子的房間
EventBus.on("requestTeleport", ({ x, y }) => {
  const r = floor.roomAt(x, y);
  if (!r) return;
  floor.currentPos = { x, y };
  r.enter();
  player.x = CANVAS_W / 2 - player.w / 2;
  player.y = FLOOR_Y - PLAYER_H;
  player.vy = 0;
  bulletPool.clear();
  syncSceneToRoom();
});

// 下一層：F1-F6 → F7（最終 Boss 層）→ 通關 RUN_CLEAR
const FINAL_FLOOR = 7;
function goToNextFloor() {
  const next = floor.floorNum + 1;
  if (next > FINAL_FLOOR) {
    SaveManager.recordRun(FINAL_FLOOR); // 通關 = 抵達 F7
    state.change(STATES.RUN_CLEAR);
    return;
  }
  gm.floor = next;
  floor = generateFloor(next, gm.seed);
  floor.currentRoom.enter();
  gm.currentFloor = floor;
  mapDisplay.floor = floor;
  player.x = CANVAS_W / 2 - player.w / 2;
  player.y = FLOOR_Y - PLAYER_H;
  player.vy = 0;
  bulletPool.clear();
  itemManager.onFloorChanged(floor); // 戰鬥本能重置 + 地圖道具重新套用
  syncSceneToRoom();
  state.change(STATES.EXPLORING);
}

// 驗證/除錯用全局掛載
window.game = { renderer, camera, state, gm, input, player, bulletPool, itemManager, familiarManager, fps: 0, STATES };
// 測試工具：直接跳到指定格子的房間
window.game.gotoRoom = (x, y) => {
  const r = floor.roomAt(x, y);
  if (!r) return null;
  floor.currentPos = { x, y };
  r.enter();
  syncSceneToRoom();
  return r;
};
Object.defineProperty(window.game, "floor", { get: () => floor });
window.game.generateFloor = generateFloor;
// 確定性逐幀執行（隱藏分頁 rAF 不觸發時的測試工具；dt 固定 1.0）
window.game.step = (n = 1) => {
  for (let i = 0; i < n; i++) { update(1); renderer.render(); }
};

async function boot() {
  await loadAllAssets();
  state.change(STATES.MAIN_MENU);
  requestAnimationFrame(gameLoop);
}
boot();
