// =====================================================
// main.js — 遊戲主入口 + 主循環（60fps 正規化 dt）
// =====================================================
import { Renderer } from "./render/Renderer.js";
import { Camera } from "./render/Camera.js";
import { loadAllAssets } from "./render/AssetLoader.js";
import { GameManager } from "./core/GameManager.js";
import { StateManager, STATES } from "./core/StateManager.js";
import { Input } from "./core/Input.js";
import { Player } from "./entities/Player.js";
import { BulletPool } from "./entities/BulletPool.js";
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

renderer.scene.camera = camera;
renderer.scene.player = player;
renderer.scene.bullets = bulletPool.bullets;

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
  const enemies = renderer.scene.enemies || [];
  bulletPool.update(dt, enemies.filter(e => e.active));
  input.endFrame();
}

// 驗證/除錯用全局掛載
window.game = { renderer, camera, state, gm, input, player, bulletPool, fps: 0, STATES };
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
