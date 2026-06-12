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
