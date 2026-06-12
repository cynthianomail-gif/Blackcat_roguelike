# M8 有機剪影外框＋門重設計 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把房間的直邊黑框換成 seed 生成的有機剪影輪廓，門從發光矩形改成貓耳拱門洞＋光錐溢光＋荊棘鎖門，零邏輯/碰撞更動。

**Architecture:** 新增 `DoorShapes.js`（門洞幾何，烘焙挖洞與門光效共用）與 `FrameSilhouette.js`（每房 seed 烘焙兩層離屏 canvas：地板層/牆層，以門簽名做快取 key——炸彈會在執行期加門）。`Room.drawFloor/drawWalls` 改貼烘焙圖，`Door.draw` 全面重寫。渲染管線順序不變。

**Tech Stack:** 純前端 Canvas 2D（ES Module、無建置工具、無測試框架）。驗證採 HANDOFF §5 無頭方法：`window.game.step(n)` 逐幀＋`preview_eval` 斷言＋snapshot server 截圖。

**規格:** `docs/superpowers/specs/2026-06-12-organic-frame-door-redesign-design.md`

---

## 驗證環境（每個 Task 共用）

- 起 preview：`preview_start`（`.claude/launch.json` 已設定，port 8765），開 `http://localhost:8765/index.html`
- 進入遊戲：eval `window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Enter' })); game.step(30);`
- 截圖：先 `node _tmp\snapshot_server.js`（port 8766）背景跑著，eval 內 `fetch('http://localhost:8766/<name>', { method: 'POST', body: canvas.toDataURL('image/jpeg', 0.8) })` → 存 `_tmp/snaps/<name>.jpg`，再用 Read 看圖。**不要 return base64。**
- 每次 reload 房間配置隨機，找特定房用 `game.floor.rooms.find(...)` ＋ `game.gotoRoom(x, y)`。

---

### Task 1: DoorShapes.js — 門洞幾何（共用模組）

**Files:**
- Create: `js/render/DoorShapes.js`

E/W 門＝貓耳拱（圓拱頂＋兩耳尖），N/S 門＝不規則破洞。只負責「在現有路徑上描出洞形」，不 fill/stroke——FrameSilhouette 用它挖洞、Door 用它畫光面與 clip，兩邊形狀絕對一致。

- [ ] **Step 1: 建立 `js/render/DoorShapes.js`**

```js
// =====================================================
// DoorShapes.js — 門洞幾何（M8）
// 只在現有路徑上描出洞形（不 fill/stroke）。
// FrameSilhouette 烘焙時用它挖洞、Door.draw 用它畫光面/clip，
// 共用同一份幾何保證形狀一致。
// =====================================================

// 在 ctx 目前路徑加入 dir 方向的門洞形狀；r = Door.rect
export function traceOpening(ctx, dir, r) {
  if (dir === "E" || dir === "W") traceCatArch(ctx, r);
  else if (dir === "N") traceCeilingHole(ctx, r);
  else traceFloorHole(ctx, r);
}

// 貓耳拱：底對齊地板，圓拱頂＋兩個耳朵尖（黑貓招牌形狀）
function traceCatArch(ctx, r) {
  const x0 = r.x + 8, x1 = r.x + r.w - 8;   // 開口左右緣（內縮留牆肉）
  const by = r.y + r.h;                       // 底＝FLOOR_Y
  const sh = r.y + 26;                        // 拱肩高度
  const earY = r.y + 4;                       // 耳尖高度
  ctx.moveTo(x0, by);
  ctx.lineTo(x0, sh + 8);
  ctx.quadraticCurveTo(x0, sh - 8, x0 + 9, sh - 10);   // 左拱肩圓角
  ctx.lineTo(x0 + 7, earY);                             // 左耳外緣
  ctx.lineTo(x0 + 17, sh - 12);                         // 左耳內緣
  ctx.quadraticCurveTo((x0 + x1) / 2, sh - 18, x1 - 17, sh - 12); // 頭頂微弧
  ctx.lineTo(x1 - 7, earY);                             // 右耳外緣
  ctx.lineTo(x1 - 9, sh - 10);                          // 右耳內緣
  ctx.quadraticCurveTo(x1, sh - 8, x1, sh + 8);         // 右拱肩圓角
  ctx.lineTo(x1, by);
  ctx.closePath();
}

// 天花板破洞：下緣（朝遊戲區那側）有 2~3 個碎凸起
function traceCeilingHole(ctx, r) {
  const x0 = r.x + 6, x1 = r.x + r.w - 6;
  const cx = r.x + r.w / 2;
  const bot = r.y + r.h;                      // 天花板內緣
  ctx.moveTo(x0, r.y);
  ctx.lineTo(x0 - 3, bot - 12);
  ctx.lineTo(x0 + 7, bot);
  ctx.lineTo(cx - 9, bot - 6);
  ctx.lineTo(cx + 3, bot);
  ctx.lineTo(x1 - 8, bot - 5);
  ctx.lineTo(x1, bot - 12);
  ctx.lineTo(x1, r.y);
  ctx.closePath();
}

// 地板破洞：洞口（FLOOR_Y 那緣）不規則缺角
function traceFloorHole(ctx, r) {
  const x0 = r.x + 4, x1 = r.x + r.w - 4;
  const cx = r.x + r.w / 2;
  const top = r.y, bot = r.y + r.h;           // bot＝畫布底
  ctx.moveTo(x0, top);
  ctx.lineTo(cx - 10, top + 4);
  ctx.lineTo(cx + 2, top);
  ctx.lineTo(x1 - 8, top + 5);
  ctx.lineTo(x1, top);
  ctx.lineTo(x1 + 3, top + 22);
  ctx.lineTo(x1 - 2, bot);
  ctx.lineTo(x0 + 2, bot);
  ctx.lineTo(x0 - 3, top + 22);
  ctx.closePath();
}
```

- [ ] **Step 2: 無頭驗證幾何（isPointInPath）**

preview_start 後 eval：

```js
const { traceOpening } = await import('/js/render/DoorShapes.js');
const c = document.createElement('canvas').getContext('2d');
c.beginPath();
traceOpening(c, 'W', { x: 0, y: 320, w: 60, h: 80 });
JSON.stringify([
  c.isPointInPath(30, 380),  // 拱內中央 → true
  c.isPointInPath(18, 330),  // 左耳內 → true
  c.isPointInPath(30, 326),  // 兩耳之間（頭頂上方） → false
  c.isPointInPath(3, 330),   // 開口左外側（牆肉） → false
]);
```

期望：`[true,true,false,false]`。N/S 同法抽查中心點 true、角落 false：
`traceOpening(c,'N',{x:420,y:0,w:60,h:60})` → `isPointInPath(450,30)` true、`isPointInPath(424,58)` false。

- [ ] **Step 3: Commit**

```bash
git add js/render/DoorShapes.js
git commit -m 'feat: M8-1 DoorShapes 門洞幾何（貓耳拱+破洞，烘焙/門光效共用）'
```

---

### Task 2: FrameSilhouette.js — 有機剪影烘焙

**Files:**
- Create: `js/render/FrameSilhouette.js`

每房 seed（`floorNum*1000 + gridPos.y*16 + gridPos.x`）生成輪廓，烘焙兩張 900×506 透明底離屏 canvas（floor 層：step 4 實體後面／walls 層：step 12 最上層）。快取掛在 room 上，**key＝門簽名**（炸彈隱藏房會執行期 `addDoor`，見 `js/items/PlacedBomb.js:103`）。

核心約束：碰撞線不動。地板頂緣維持 `FLOOR_Y` 水平（裝飾只往線上方長，土丘 ≤10px）；牆凸起往遊戲區內長 ≤8px（前景遮擋）；天花板同理＋垂藤。

- [ ] **Step 1: 建立 `js/render/FrameSilhouette.js`**

```js
// =====================================================
// FrameSilhouette.js — 有機剪影外框烘焙（M8）
// 每房 seed 生成輪廓 → 烘焙兩層離屏 canvas（floor/walls），
// 快取 key＝門簽名（炸彈會執行期加門 → 自動重烘）。
// 碰撞線（FLOOR_Y/WALL_THICKNESS/天花板）完全不動：
// 地板頂緣維持水平、牆凸起只往遊戲區內長 ≤8px（前景遮擋）。
// =====================================================
import {
  CANVAS_W, CANVAS_H, WALL_THICKNESS, FLOOR_Y, DOOR_W,
} from "../core/Constants.js";
import { traceOpening } from "./DoorShapes.js";

const CEILING_Y = WALL_THICKNESS;
const INK = "#101014";
const RIM = "rgba(255,225,160,0.22)";        // 牆/天花板內緣緣光
const RIM_FLOOR = "rgba(255,232,170,0.4)";   // 地板頂緣亮線（兼站立面提示）

// 小型 seeded RNG（同房每次進入輪廓一致）
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 取得房間的烘焙層；門簽名變了（炸彈開門）自動重烘
export function frameLayersFor(room) {
  const sig = ["N", "S", "E", "W"].filter(d => room.doors[d]).join("");
  if (room._frameSig === sig && room._frameLayers) return room._frameLayers;
  const seed = (room.floorNum || 1) * 1000 +
    ((room.gridPos?.y ?? 0) * 16 + (room.gridPos?.x ?? 0));
  room._frameLayers = {
    floor: bakeFloor(room, mulberry32(seed)),
    walls: bakeWalls(room, mulberry32(seed ^ 0x9E3779B9)),
  };
  room._frameSig = sig;
  return room._frameLayers;
}

function makeLayer() {
  const cv = document.createElement("canvas");
  cv.width = CANVAS_W;
  cv.height = CANVAS_H;
  return cv;
}

// 挖門洞（透明）
function punch(c, dir, rect) {
  c.save();
  c.globalCompositeOperation = "destination-out";
  c.beginPath();
  traceOpening(c, dir, rect);
  c.fill();
  c.restore();
}

// ── 地板層 ──────────────────────────────────────────
function bakeFloor(room, rnd) {
  const cv = makeLayer();
  const c = cv.getContext("2d");
  c.fillStyle = INK;
  c.fillRect(0, FLOOR_Y, CANVAS_W, CANVAS_H - FLOOR_Y);

  // 地表裝飾：草叢/石頭/土丘，間距 100~160px 隨機；
  // 避開 S 門洞口；近左右門落點區（牆邊 80px）只放矮的草/石
  const sZone = room.doors.S
    ? { a: CANVAS_W / 2 - DOOR_W / 2 - 14, b: CANVAS_W / 2 + DOOR_W / 2 + 14 }
    : null;
  let x = WALL_THICKNESS + 30 + rnd() * 60;
  while (x < CANVAS_W - WALL_THICKNESS - 30) {
    const inSZone = sZone && x > sZone.a && x < sZone.b;
    const nearSideDoor = x < WALL_THICKNESS + 80 || x > CANVAS_W - WALL_THICKNESS - 80;
    if (!inSZone) {
      const kind = rnd();
      if (kind < 0.45 || (nearSideDoor && kind >= 0.75)) drawTuft(c, x, FLOOR_Y, rnd);
      else if (kind < 0.75) drawPebble(c, x, FLOOR_Y, rnd);
      else drawMound(c, x, FLOOR_Y, rnd);
    }
    x += 100 + rnd() * 60;
  }

  // 頂緣亮線（取代原白格線的層次功能）
  c.strokeStyle = RIM_FLOOR;
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(WALL_THICKNESS, FLOOR_Y + 0.75);
  c.lineTo(CANVAS_W - WALL_THICKNESS, FLOOR_Y + 0.75);
  c.stroke();

  if (room.doors.S) punch(c, "S", room.doors.S.rect);
  return cv;
}

function drawTuft(c, x, gy, rnd) {
  c.strokeStyle = INK;
  c.lineWidth = 2;
  c.lineCap = "round";
  const n = 3 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const dx = (i - n / 2) * 3 + rnd() * 2;
    const h = 7 + rnd() * 7;
    c.beginPath();
    c.moveTo(x + dx, gy + 1);
    c.quadraticCurveTo(x + dx + rnd() * 6 - 3, gy - h * 0.6, x + dx + rnd() * 8 - 4, gy - h);
    c.stroke();
  }
}

function drawPebble(c, x, gy, rnd) {
  c.fillStyle = INK;
  const rx = 4 + rnd() * 5, ry = 2.5 + rnd() * 2.5;
  c.beginPath();
  c.ellipse(x, gy - ry + 1, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
}

function drawMound(c, x, gy, rnd) {
  c.fillStyle = INK;
  const w = 26 + rnd() * 30, h = 5 + rnd() * 5; // 高度 ≤10px
  c.beginPath();
  c.moveTo(x - w / 2, gy + 1);
  c.quadraticCurveTo(x, gy - h * 2, x + w / 2, gy + 1);
  c.closePath();
  c.fill();
}

// ── 牆＋天花板層 ─────────────────────────────────────
// 內緣點列：沿邊以 44~72px 步長取點，往遊戲區內偏 0~8px
function edgePts(rnd, length) {
  const pts = [{ t: 0, off: rnd() * 8 }];
  let t = 0;
  while (t < length) {
    t = Math.min(length, t + 44 + rnd() * 28);
    pts.push({ t, off: rnd() * 8 });
  }
  return pts;
}

// 把點列接成 quadratic 曲線（垂直邊：t=y；水平邊：t=x）
// cont=true：接續現有 subpath（牆面填色用，避免 moveTo 切斷路徑
// 導致 closePath 斜切過牆）；cont=false：獨立路徑（緣光 stroke 用）
function pathEdge(c, pts, toXY, cont = false) {
  const p0 = toXY(pts[0]);
  if (cont) c.lineTo(p0.x, p0.y);
  else c.moveTo(p0.x, p0.y);
  for (let i = 1; i < pts.length; i++) {
    const a = toXY(pts[i - 1]), b = toXY(pts[i]);
    c.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2, b.x, b.y);
  }
}

function bakeWalls(room, rnd) {
  const cv = makeLayer();
  const c = cv.getContext("2d");
  c.fillStyle = INK;

  // 左牆（內緣 x = WALL_THICKNESS + off）：(0,0)→內緣曲線→(0,H)→close
  const L = edgePts(rnd, CANVAS_H);
  c.beginPath();
  c.moveTo(0, 0);
  pathEdge(c, L, p => ({ x: WALL_THICKNESS + p.off, y: p.t }), true);
  c.lineTo(0, CANVAS_H);
  c.closePath();
  c.fill();

  // 右牆（鏡像）
  const R = edgePts(rnd, CANVAS_H);
  c.beginPath();
  c.moveTo(CANVAS_W, 0);
  pathEdge(c, R, p => ({ x: CANVAS_W - WALL_THICKNESS - p.off, y: p.t }), true);
  c.lineTo(CANVAS_W, CANVAS_H);
  c.closePath();
  c.fill();

  // 天花板（下緣 y = CEILING_Y + off）：(0,0)→(W,0)→下緣曲線（由右往左）→close
  const T = edgePts(rnd, CANVAS_W);
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(CANVAS_W, 0);
  pathEdge(c, [...T].reverse(), p => ({ x: p.t, y: CEILING_Y + p.off }), true);
  c.closePath();
  c.fill();

  // 垂藤（避開 N 門區）
  drawVines(c, room, rnd);

  // 內緣緣光（沿同一條輪廓描細線）
  c.strokeStyle = RIM;
  c.lineWidth = 1.5;
  c.beginPath();
  pathEdge(c, L, p => ({ x: WALL_THICKNESS + p.off, y: p.t }));
  c.stroke();
  c.beginPath();
  pathEdge(c, R, p => ({ x: CANVAS_W - WALL_THICKNESS - p.off, y: p.t }));
  c.stroke();
  c.beginPath();
  pathEdge(c, T, p => ({ x: p.t, y: CEILING_Y + p.off }));
  c.stroke();

  // 挖門洞（W/E/N；S 在地板層）
  if (room.doors.W) punch(c, "W", room.doors.W.rect);
  if (room.doors.E) punch(c, "E", room.doors.E.rect);
  if (room.doors.N) punch(c, "N", room.doors.N.rect);
  return cv;
}

function drawVines(c, room, rnd) {
  c.strokeStyle = INK;
  c.lineCap = "round";
  const nDoor = room.doors.N?.rect;
  const n = 2 + Math.floor(rnd() * 2);
  for (let i = 0; i < n; i++) {
    const x = WALL_THICKNESS + 60 + rnd() * (CANVAS_W - 2 * WALL_THICKNESS - 120);
    if (nDoor && x > nDoor.x - 10 && x < nDoor.x + nDoor.w + 10) continue;
    const len = 12 + rnd() * 14;
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(x, CEILING_Y + 4);
    c.quadraticCurveTo(x - 4 + rnd() * 8, CEILING_Y + len * 0.6, x + rnd() * 10 - 5, CEILING_Y + len);
    c.stroke();
  }
}
```

- [ ] **Step 2: 無頭驗證烘焙＋快取**

eval（先 Enter 進遊戲、`game.step(30)`）：

```js
const { frameLayersFor } = await import('/js/render/FrameSilhouette.js');
const room = game.floor.currentRoom;
const L1 = frameLayersFor(room);
const L2 = frameLayersFor(room);
const w = L1.walls.getContext('2d');
const f = L1.floor.getContext('2d');
JSON.stringify({
  sameRef: L1 === L2,                                  // 快取命中 → true
  size: [L1.walls.width, L1.walls.height],             // [900,506]
  wallInk: w.getImageData(10, 200, 1, 1).data[3],      // 左牆內 → 255
  centerClear: w.getImageData(450, 250, 1, 1).data[3], // 房中央 → 0
  floorInk: f.getImageData(450, 470, 1, 1).data[3],    // 地板內 → 255（若有 S 門此點在洞內，改抽 x=200）
  aboveClear: f.getImageData(200, 300, 1, 1).data[3],  // 地板上方 → 0
});
```

期望：`sameRef:true, size:[900,506], wallInk:255, centerClear:0, floorInk:255, aboveClear:0`。

- [ ] **Step 3: 無頭驗證門簽名重烘（模擬炸彈開門）**

```js
const { frameLayersFor } = await import('/js/render/FrameSilhouette.js');
const room = game.floor.currentRoom;
const L1 = frameLayersFor(room);
const dir = ['N','S','E','W'].find(d => !room.doors[d]);
room.addDoor(dir);
const L2 = frameLayersFor(room);
JSON.stringify({ rebaked: L1 !== L2, sig: room._frameSig });
```

期望 `rebaked:true`、sig 含新方向。**驗完 reload 頁面**丟棄這個 mutation。

- [ ] **Step 4: Commit**

```bash
git add js/render/FrameSilhouette.js
git commit -m 'feat: M8-2 FrameSilhouette 有機剪影烘焙（seed輪廓+門簽名快取）'
```

---

### Task 3: Room 接線 — 貼烘焙圖、刪格線

**Files:**
- Modify: `js/world/Room.js:139-168`（`drawFloor`/`drawWalls`）

- [ ] **Step 1: 改寫 `drawFloor` 與 `drawWalls`**

在 `js/world/Room.js` 頂部 import 區加入：

```js
import { frameLayersFor } from "../render/FrameSilhouette.js";
```

把整個 `drawFloor` 與 `drawWalls`（含原本的格線迴圈與「門補畫」迴圈）替換為：

```js
  drawFloor(ctx) {
    // BADLAND 式：前景剪影層（M8 改 seed 烘焙的有機輪廓，無格線）
    ctx.drawImage(frameLayersFor(this).floor, 0, 0);
    // 單向跳台（前景平面，與地板同層繪製）
    this.platforms.forEach(p => p.draw(ctx));
  }

  drawWalls(ctx) {
    // 牆/天花板剪影層；門洞已在烘焙時挖好，
    // 門光效（drawDoors，step 11）會從洞透出，不需再補畫門
    ctx.drawImage(frameLayersFor(this).walls, 0, 0);
  }
```

注意：`TILE_SIZE` 仍被 import 但不再使用——從 `Room.js` 的 import 清單移除（`CANVAS_W, CANVAS_H, WALL_THICKNESS, FLOOR_Y, ROOM_TYPES` 其餘保留，`CANVAS_W/CANVAS_H/WALL_THICKNESS/FLOOR_Y` 在子彈碰撞與門邏輯仍在用）。

- [ ] **Step 2: 煙霧驗證＋截圖**

1. reload → Enter 進遊戲 → `game.step(120)` → `preview_console_logs` 必須乾淨（零 error）。
2. 截圖 `m8_frame_f1.jpg`：確認①格線消失②牆/天花板/地板輪廓有起伏③有草叢/石頭/垂藤④門的位置開出透明洞（此時門還是舊畫法，洞與舊門視覺疊著屬正常，Task 4 處理）。
3. eval `EventBus` 換層（HANDOFF §5）跳 F3、F6 各截一張，確認不同樓層/房間輪廓不同（seed 生效）。

- [ ] **Step 3: Commit**

```bash
git add js/world/Room.js
git commit -m 'feat: M8-3 Room 接線烘焙剪影層，刪除地板格線與門補畫'
```

---

### Task 4: Door.draw 重寫 — 光錐溢光＋荊棘鎖門

**Files:**
- Modify: `js/world/Door.js`（只動 `draw` 與新增私有繪製方法；`rectFor`/`open`/`close` 不動）

- [ ] **Step 1: 改寫 `js/world/Door.js` 的繪製部分**

import 區改為：

```js
import { EventBus } from "../core/EventBus.js";
import {
  CANVAS_W, CANVAS_H, WALL_THICKNESS, FLOOR_Y, DOOR_W, DOOR_H,
} from "../core/Constants.js";
import { traceOpening } from "../render/DoorShapes.js";
```

把原本整段 `draw(ctx)`（含 BADLAND 註解）替換為：

```js
  // M8 視覺：門＝牆上挖的洞（FrameSilhouette 已挖好），光從裡面溢出。
  // 開啟＝洞內暖光面＋光錐灑地＋飄浮光塵；鎖閉＝荊棘封口＋深處暗紅餘燼。
  draw(ctx) {
    const r = this.rect;
    const now = performance.now();
    const pulse = 0.75 + Math.sin(now * 0.004) * 0.25;
    ctx.save();
    if (this.isOpen) {
      this._drawSpill(ctx, pulse);
      ctx.beginPath();
      traceOpening(ctx, this.dir, r);
      ctx.fillStyle = `rgba(253,243,220,${0.72 + 0.2 * pulse})`;
      ctx.fill();
      this._drawMotes(ctx, now);
    } else {
      ctx.beginPath();
      traceOpening(ctx, this.dir, r);
      ctx.fillStyle = "#140a10";
      ctx.fill();
      ctx.clip(); // 餘燼與荊棘都限制在洞內
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h * (this.dir === "N" ? 0.35 : 0.6);
      const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, Math.max(r.w, r.h) * 0.4);
      g.addColorStop(0, `rgba(180,40,40,${0.4 * pulse})`);
      g.addColorStop(1, "rgba(180,40,40,0)");
      ctx.fillStyle = g;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      this._drawBrambles(ctx);
    }
    ctx.restore();
  }

  // 光錐＋落地光池（「這是通道」的主要讀法）
  _drawSpill(ctx, pulse) {
    const r = this.rect;
    ctx.fillStyle = `rgba(255,228,150,${0.16 * pulse})`;
    ctx.beginPath();
    if (this.dir === "W") {
      ctx.moveTo(WALL_THICKNESS, FLOOR_Y - 64);
      ctx.lineTo(WALL_THICKNESS + 110, FLOOR_Y);
      ctx.lineTo(WALL_THICKNESS, FLOOR_Y);
    } else if (this.dir === "E") {
      ctx.moveTo(CANVAS_W - WALL_THICKNESS, FLOOR_Y - 64);
      ctx.lineTo(CANVAS_W - WALL_THICKNESS - 110, FLOOR_Y);
      ctx.lineTo(CANVAS_W - WALL_THICKNESS, FLOOR_Y);
    } else if (this.dir === "N") {
      ctx.moveTo(r.x + 8, r.y + r.h);
      ctx.lineTo(r.x + r.w - 8, r.y + r.h);
      ctx.lineTo(r.x + r.w + 16, r.y + r.h + 96);
      ctx.lineTo(r.x - 16, r.y + r.h + 96);
    } else { // S：光由下往上透
      ctx.moveTo(r.x + 6, r.y);
      ctx.lineTo(r.x + r.w - 6, r.y);
      ctx.lineTo(r.x + r.w - 14, r.y - 34);
      ctx.lineTo(r.x + 14, r.y - 34);
    }
    ctx.closePath();
    ctx.fill();
    if (this.dir === "W" || this.dir === "E") {
      const px = this.dir === "W" ? WALL_THICKNESS + 48 : CANVAS_W - WALL_THICKNESS - 48;
      ctx.fillStyle = `rgba(255,236,170,${0.22 * pulse})`;
      ctx.beginPath();
      ctx.ellipse(px, FLOOR_Y, 56, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 洞口光塵：3~4 粒緩慢上飄的微光點（純時間函數，無狀態）
  _drawMotes(ctx, now) {
    const r = this.rect;
    const t = now * 0.001;
    let bx, by; // 光塵基準點（洞口靠遊戲區側）
    switch (this.dir) {
      case "W": bx = WALL_THICKNESS + 14; by = FLOOR_Y - 8; break;
      case "E": bx = CANVAS_W - WALL_THICKNESS - 14; by = FLOOR_Y - 8; break;
      case "N": bx = r.x + r.w / 2; by = r.y + r.h + 40; break;
      default:  bx = r.x + r.w / 2; by = r.y - 4; break; // S
    }
    ctx.fillStyle = "rgba(255,240,190,1)";
    for (let i = 0; i < 4; i++) {
      const rise = (t * 14 + i * 23) % 64;
      const x = bx + Math.sin(t * 0.8 + i * 2.4) * (8 + i * 5);
      const y = by - rise;
      ctx.globalAlpha = 0.7 * (1 - rise / 64);
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // 鎖門封口：交叉粗枝＋小刺，前景純黑（取代霓虹柵欄）
  _drawBrambles(ctx) {
    const r = this.rect;
    ctx.strokeStyle = "#101014";
    ctx.lineCap = "round";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(r.x + 4, r.y + r.h * 0.25);
    ctx.lineTo(r.x + r.w - 4, r.y + r.h * 0.85);
    ctx.moveTo(r.x + r.w - 4, r.y + r.h * 0.2);
    ctx.lineTo(r.x + 4, r.y + r.h * 0.8);
    ctx.stroke();
    ctx.lineWidth = 2.5;
    const thorns = [
      [0.30, 0.42, -7, -5], [0.55, 0.62, 6, -6],
      [0.72, 0.40, 5, 6],   [0.40, 0.72, -6, 5],
    ];
    ctx.beginPath();
    for (const [fx, fy, dx, dy] of thorns) {
      const x = r.x + r.w * fx, y = r.y + r.h * fy;
      ctx.moveTo(x, y);
      ctx.lineTo(x + dx, y + dy);
    }
    ctx.stroke();
  }
```

`DOOR_W`/`DOOR_H` 若因此不再使用，從 import 移除（`rectFor` 還在用 → 保留）。

- [ ] **Step 2: 驗證開啟/鎖閉兩態＋鎖門流程**

1. reload → Enter → `game.step(30)` → 截圖 `m8_door_open.jpg`：起始房（已清）門應為貓耳拱亮洞＋光錐灑地＋光池；S 門（若有）洞口向上透光。
2. 走進未清的戰鬥房（eval 模擬按住 D 鍵或直接 `game.gotoRoom` 到相鄰 NORMAL 房後 `game.step(10)`）→ 截圖 `m8_door_locked.jpg`：門應為暗洞＋荊棘交叉＋微弱紅燼，**無霓虹柵欄、無金邊矩形**。
3. eval 清怪：`game.floor.currentRoom.enemies.forEach(e => e.active = false); game.step(5);` → 截圖確認荊棘消失、變回亮洞。
4. `preview_console_logs` 乾淨。

- [ ] **Step 3: 驗證門觸發邏輯未變**

eval：模擬按住 D（`KeyboardEvent('keydown',{code:'KeyD'})` dispatch 到 window）`game.step(180)` 走向東門，確認 `game.floor.currentPos` 改變（換房成功）；發 keyup。再驗 S 門：站 S 門上按住 S `game.step(30)` 應下樓/換房。

- [ ] **Step 4: Commit**

```bash
git add js/world/Door.js
git commit -m 'feat: M8-4 門重設計——貓耳拱光錐溢光+荊棘鎖門，取代發光矩形'
```

---

### Task 5: 整合驗收 — 全樓層煙霧＋隱藏房＋效能

**Files:**
- Modify: `HANDOFF.md`（§2 進度表加 M8 列）

- [ ] **Step 1: F1–F7 煙霧巡訪**

依 HANDOFF §5：reload → Enter → 逐層 `EventBus.emit('requestNextFloor')`，每層 `game.floor.rooms` 逐房 `game.gotoRoom(r.gridPos.x, r.gridPos.y)` ＋ `game.step(30)`。期望：零 console error、FPS 無感（`game.step` 不變慢）。

- [ ] **Step 2: 炸彈隱藏房實測**

找 SECRET 房與其相鄰房，`gotoRoom` 到相鄰房後直接生成 `PlacedBomb` 靠對應牆放（引信 90 幀）：

```js
const { ROOM_TYPES, WALL_THICKNESS, FLOOR_Y, CANVAS_W } = await import('/js/core/Constants.js');
const { PlacedBomb } = await import('/js/items/PlacedBomb.js');
const secret = game.floor.rooms.find(r => r.type === ROOM_TYPES.SECRET);
// 找 secret 四鄰中存在的房間，gotoRoom 過去（方向 dir 是「從鄰房看 secret」的方位）
// 例：secret 在鄰房東邊 → 炸彈放右牆邊
const room = game.floor.currentRoom;
const bombX = /* dir==='E' */ CANVAS_W - WALL_THICKNESS - 20; // W 則 WALL_THICKNESS+20
room.items.push(new PlacedBomb(bombX, FLOOR_Y));
game.step(110); // 引信 90 幀 + 爆風
JSON.stringify({ sig: room._frameSig, hasDoor: Object.entries(room.doors).filter(([,d])=>d).map(([k])=>k) });
```

期望：`sig` 含新方向＝門簽名重烘生效。截圖 `m8_secret_door.jpg` 確認牆上出現新門洞，再走進隱藏房驗證可通行。N 側隱藏房要把炸彈放上層平台（`new PlacedBomb(門正下方x, PLATFORM_TIER2_Y)`）。

- [ ] **Step 3: 視覺巡檢截圖**

F1/F3/F6 各截 `m8_final_f<N>.jpg`，逐張確認：四向門兩態、輪廓隨房變化、貼牆時前景遮擋觀感（控制貓走到牆邊截圖）、平台垂鬚與新外框語言一致。發現比例/密度違和直接調 `FrameSilhouette.js`/`DoorShapes.js` 常數重驗。

- [ ] **Step 4: 更新 HANDOFF.md**

§2 進度表 M7 列後新增：

```markdown
| **M8 有機剪影外框＋門重設計**（seed 輪廓烘焙/格線移除/貓耳拱門/光錐/荊棘鎖門） | ✅ 程式面完成，待真人視覺驗收 | （填實際 commit 範圍） |
```

- [ ] **Step 5: Commit**

```bash
git add HANDOFF.md
git commit -m 'feat: M8-5 整合驗收通過——全樓層煙霧+隱藏房重烘+視覺巡檢，HANDOFF 更新'
```

---

## 驗收總表（對照規格 §3）

| 規格驗收項 | 對應 Task |
|---|---|
| 零邏輯更動（門觸發/子彈撞牆/clamp） | Task 4 Step 3、Task 5 Step 1 |
| 六層樓視覺巡檢＋四向門兩態 | Task 5 Step 3 |
| 戰鬥鎖門→清怪開門流程 | Task 4 Step 2 |
| 截圖前後對照（UI 感消失） | Task 3 Step 2 ＋ Task 5 Step 3 |
| 效能（烘焙只在進房，每幀 drawImage×2） | Task 5 Step 1 |
| 炸彈隱藏房門簽名重烘 | Task 2 Step 3、Task 5 Step 2 |

## 注意事項

- 部署（push `main`＋`gh-pages`）**不在本計畫內**——照專案慣例等真人視覺驗收後由使用者決定。
- commit 訊息不可含雙引號；中文檔案一律用 Write/Edit 工具改，禁用 PowerShell 管線。
- 視覺常數（拱形比例、裝飾密度、光錐長度、緣光透明度）允許在 preview 巡檢時微調，屬計畫內收尾，不需回頭改規格。
