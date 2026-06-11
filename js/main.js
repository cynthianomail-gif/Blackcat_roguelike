// =====================================================
// main.js — 遊戲主入口 + 主循環（60fps 正規化 dt）
// =====================================================
import { Renderer } from "./render/Renderer.js";
import { Camera } from "./render/Camera.js";
import { loadAllAssets } from "./render/AssetLoader.js";
import { GameManager } from "./core/GameManager.js";
import { StateManager, STATES } from "./core/StateManager.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const renderer = new Renderer(ctx, canvas.width, canvas.height);
const camera = new Camera();
const state = new StateManager();
const gm = GameManager.getInstance();

renderer.scene.camera = camera;

let lastTime = 0;
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;

// FPS 計測（驗證用）
let fpsCounter = 0, fpsTime = 0, currentFps = 0;

function gameLoop(timestamp) {
  const dt = Math.min(timestamp - lastTime, 50); // cap at 50ms 防止卡頓跳幀
  if (dt >= FRAME_TIME) {
    lastTime = timestamp;
    update(dt / FRAME_TIME); // normalize to 60fps delta（dt ≈ 1.0 @60fps）
    renderer.render();

    fpsCounter++;
    fpsTime += dt;
    if (fpsTime >= 1000) {
      currentFps = Math.round(fpsCounter * 1000 / fpsTime);
      fpsCounter = 0; fpsTime = 0;
      window.game.fps = currentFps;
    }
  }
  requestAnimationFrame(gameLoop);
}

function update(dt) {
  camera.update();
  gm.player?.update(dt);
  // 後續 Task 在此接入：房間更新、敵人、Boss、UI
}

// 驗證/除錯用全局掛載
window.game = { renderer, camera, state, gm, fps: 0, STATES };
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
