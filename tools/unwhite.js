// =====================================================
// unwhite.js — 白底精確去背（M7 素材管線）
// 用法：node tools/unwhite.js <in.png> <out.png>
// 1) 四周補 8px 純白（剪影觸邊時 flood 仍可繞行；輸出裁回原尺寸）
// 2) 從邊框 flood-fill 標記「外部近白」＝背景
// 3) 背景 → 全透明；與背景相鄰 2px 內的非背景像素 →
//    白底反解：a = 1 - min(r,g,b)/255，F = (C-255(1-a))/a
//    （抗鋸齒邊緣得到正確半透明，無白邊）
// 4) 內部像素完全不動（發光眼、rim light 安全）
// 前提：輸入為白底不透明圖（自帶 alpha 會被忽略）
// =====================================================
const fs = require("fs");
const { PNG } = require("pngjs");

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error("用法：node tools/unwhite.js <in.png> <out.png>");
  process.exit(1);
}
const src = PNG.sync.read(fs.readFileSync(inPath));
const PAD = 8, W = src.width + PAD * 2, H = src.height + PAD * 2;

// 補白邊
const img = new PNG({ width: W, height: H });
img.data.fill(255);
PNG.bitblt(src, img, 0, 0, src.width, src.height, PAD, PAD);

const nearWhite = (i) =>
  Math.min(img.data[i], img.data[i + 1], img.data[i + 2]) >= 242;

// 外部 flood（4 向、陣列 DFS，從四邊框出發；pop 比 shift 快且無遞迴爆棧）
const bg = new Uint8Array(W * H);
const queue = [];
for (let x = 0; x < W; x++) queue.push(x, x + (H - 1) * W);
for (let y = 0; y < H; y++) queue.push(y * W, y * W + W - 1);
while (queue.length) {
  const p = queue.pop();
  if (bg[p]) continue;
  if (!nearWhite(p * 4)) continue;
  bg[p] = 1;
  const x = p % W, y = (p / W) | 0;
  if (x > 0) queue.push(p - 1);
  if (x < W - 1) queue.push(p + 1);
  if (y > 0) queue.push(p - W);
  if (y < H - 1) queue.push(p + W);
}

// 邊緣帶 = 距背景 ≤2px 的非背景像素
const band = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const p = y * W + x;
  if (bg[p]) continue;
  outer: for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    if (bg[ny * W + nx]) { band[p] = 1; break outer; }
  }
}

for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const p = y * W + x, i = p * 4;
  if (bg[p]) { img.data[i + 3] = 0; continue; }
  if (!band[p]) continue; // 內部不動
  const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
  const a = 1 - Math.min(r, g, b) / 255;
  if (a <= 0.01) { img.data[i + 3] = 0; continue; }
  const un = (c) => Math.max(0, Math.min(255, Math.round((c - 255 * (1 - a)) / a)));
  img.data[i] = un(r); img.data[i + 1] = un(g); img.data[i + 2] = un(b);
  img.data[i + 3] = Math.round(a * 255);
}

// 裁回原尺寸（PAD 只是 flood 用的工作區，留著會讓 sprite 等比縮小、底對齊懸空）
const out = new PNG({ width: src.width, height: src.height });
PNG.bitblt(img, out, PAD, PAD, src.width, src.height, 0, 0);
fs.writeFileSync(outPath, PNG.sync.write(out));
console.log(`unwhite: ${inPath} -> ${outPath} (${src.width}x${src.height})`);
