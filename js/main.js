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
import { SynergyAlert } from "./ui/SynergyAlert.js";
import { HUD } from "./ui/HUD.js";
import { MapDisplay } from "./ui/MapDisplay.js";
import { ItemDisplay } from "./ui/ItemDisplay.js";
import { generateFloor } from "./world/RoomGenerator.js";
import { CANVAS_W, FLOOR_Y, PLAYER_H } from "./core/Constants.js";

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

// ── UI 層 ──
const synergyAlert = new SynergyAlert();
const hud = new HUD(player, gm);
const mapDisplay = new MapDisplay(input);
const itemDisplay = new ItemDisplay();

// ── 程序生成樓層 ──
let floor = generateFloor(1, gm.seed);
floor.currentRoom.enter();
gm.currentFloor = floor;
gm.currentRoom = floor.currentRoom;

renderer.scene.camera = camera;
renderer.scene.player = player;
renderer.scene.bullets = bulletPool.bullets;
renderer.scene.synergyAlert = synergyAlert;
renderer.scene.hud = hud;
renderer.scene.mapDisplay = mapDisplay;
renderer.scene.itemDisplay = itemDisplay;
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
  camera.update();
  if (player.active) player.update(dt, input);

  const room = floor.currentRoom;
  if (room) {
    room.update(dt, player, input);
    room.handleBulletCollisions(bulletPool.bullets);

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
  bulletPool.update(dt, enemies.filter(e => e.active), player);
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

// Boss 死亡 → 0.8 秒（48 幀）後進入 FLOOR_TRANSITION
let floorTransitionTimer = -1;
EventBus.on("bossDied", () => { floorTransitionTimer = 48; });

// 下一層：F1-F6 → F7（最終 Boss 層）→ 通關 RUN_CLEAR
const FINAL_FLOOR = 7;
function goToNextFloor() {
  const next = floor.floorNum + 1;
  if (next > FINAL_FLOOR) {
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
  syncSceneToRoom();
  state.change(STATES.EXPLORING);
}

// 驗證/除錯用全局掛載
window.game = { renderer, camera, state, gm, input, player, bulletPool, itemManager, fps: 0, STATES };
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
