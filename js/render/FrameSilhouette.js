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
  // 注意：門洞不分開/關一律挖穿（開關是 Door.draw 的執行期視覺，
  // 鎖門時由 Door.draw 畫荊棘/暗洞填補）；簽名只追蹤門的存在。
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
    const kind = rnd(); // 不論是否落在 S 門區都消耗 RNG，保持序列與門無關
    if (!inSZone) {
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
  const w = 26 + rnd() * 30, h = 5 + rnd() * 5; // 控制點偏移；貝茲頂點≈h，視覺峰值 ≤10px
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
