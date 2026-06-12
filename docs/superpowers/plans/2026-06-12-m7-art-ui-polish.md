# M7 美術/UI 精緻化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 純表現層升級——網頁滿版、怪物程序式動畫＋Boss 攻擊幀、粒子特效、UI 全套打磨（字型/HUD/key art/轉場）、31 隻怪剪影精修重產；遊戲邏輯與數值零更動。

**Architecture:** 程式面（Task 1-7）先行、全部不依賴新素材即可驗證；素材面（Task 8-12）用 Higgsfield `nano_banana_2` 以現有 sprite 當參考圖重產，新去背工具（白底反解）取代舊 flood-fill 管線；最後整合驗收（Task 13）。動畫一律以「腳底中心」為錨點的繪製期變換，不碰碰撞箱。

**Tech Stack:** 原生 Canvas ES Module（無建置工具）、Node + pngjs（去背工具）、Higgsfield CLI（`nano_banana_2`）、jf open 粉圓字型（OFL）。

**規格：** `docs/superpowers/specs/2026-06-12-art-ui-polish-design.md`
**測試方式：** 本專案無單元測試框架；驗證一律走 HANDOFF.md §5 的無頭方法（`window.game.step(n)` 確定性逐幀＋preview console＋snapshot server 截圖）。每個 Task 的「驗證」步驟即本專案的測試。
**Commit 規則：** 訊息不可含雙引號（PowerShell 環境會壞）；中文檔案一律用 Write/Edit 工具改，禁用 PS 管線。

---

## Task 1: 網頁滿版（等比縮放＋銳利渲染）

**Files:**
- Modify: `index.html`
- Modify: `js/main.js`（canvas 初始化區，約 33-36 行）
- Modify: `js/render/Renderer.js`（render() 開頭）
- Modify: `js/render/AssetLoader.js:66`（背景上限 1280→2048）

- [ ] **Step 1: index.html 改滿版佈局**

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>黑貓流浪記</title>
  <style>
    html, body { margin:0; height:100%; background:#000; overflow:hidden; }
    body { display:flex; justify-content:center; align-items:center; }
    canvas { display:block; }
  </style>
</head>
<body>
  <canvas id="game" width="900" height="506"></canvas>
  <script type="module" src="js/main.js"></script>
</body>
</html>
```

（拿掉 `border:1px solid #333`，滿版後不需要。）

- [ ] **Step 2: main.js 加 fitCanvas（在 `const renderer = ...` 之後）**

```js
// ── 滿版：等比縮放鋪滿視窗（邏輯解析度 900×506 不變）──
// 實際像素 = 邏輯尺寸 × scale × devicePixelRatio，由 Renderer 的
// pixelRatio 統一放大，放大後線條/文字仍銳利。
function fitCanvas() {
  const scale = Math.min(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H);
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width  = `${Math.floor(CANVAS_W * scale)}px`;
  canvas.style.height = `${Math.floor(CANVAS_H * scale)}px`;
  renderer.pixelRatio = Math.max(1, scale * dpr);
  canvas.width  = Math.round(CANVAS_W * renderer.pixelRatio);
  canvas.height = Math.round(CANVAS_H * renderer.pixelRatio);
}
window.addEventListener("resize", fitCanvas);
fitCanvas();
```

注意 `CANVAS_H` 需加進 main.js 既有的 Constants import。

- [ ] **Step 3: Renderer.render() 套 pixelRatio**

`Renderer` constructor 加 `this.pixelRatio = 1;`。`render()` 開頭兩行改為：

```js
const { ctx } = this;
const s = this.scene;
// 1. 重設變換並清空（物理像素）→ 套統一縮放（之後全部用邏輯座標）
ctx.setTransform(1, 0, 0, 1, 0, 0);
ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
ctx.imageSmoothingQuality = "high";
```

（原本的 `ctx.clearRect(0, 0, this.width, this.height)` 刪除；其餘步驟不動——
Camera 的 save/translate/restore 在縮放後的座標系內運作，不受影響。）

- [ ] **Step 4: AssetLoader 背景上限提高**

`MAX_DIM_BG` 由 `1280` 改 `2048`（滿版+DPR 後背景需要更多原始解析度；原圖即 2048）。

- [ ] **Step 5: 驗證**

preview（port 8765）開頁：
1. `preview_resize` 拉大/縮小視窗 → canvas 始終等比鋪滿、留黑邊、不變形。
2. `preview_eval`：`window.game.step(5)` 後 `canvas.width / 900` 應 ≈ scale×dpr。
3. console 無錯誤；HUD 文字在放大後銳利（snapshot 截圖目視）。

- [ ] **Step 6: Commit**

```bash
git add index.html js/main.js js/render/Renderer.js js/render/AssetLoader.js
git commit -m 'feat: M7-1 網頁滿版（等比縮放+DPR 銳利渲染）'
```

---

## Task 2: 怪物程序式動畫（BaseEnemy）

**Files:**
- Modify: `js/entities/enemies/BaseEnemy.js`

設計：動畫只改「繪製變換」，碰撞箱/AI 不動。空中與地面自動判別（`y+h < FLOOR_Y-6`），不需逐子類加旗標。所有用 `drawSprite` 的敵人（18 隻全部）一次生效；幾何 fallback 不處理（素材齊全時用不到）。

- [ ] **Step 1: constructor 加動畫狀態（`this.poisonTick = 0;` 之後）**

```js
    // ── M7 程序式動畫（純繪製變換，不碰碰撞箱）──
    this.animT = Math.random() * Math.PI * 2; // 個體相位差，避免整房同步呼吸
    this.prevX = x;
    this.moveVX = 0;       // 每幀實際水平位移（判斷移動中/方向）
    this.airborne = false; // 空中（飛行系自動判別）
```

- [ ] **Step 2: update() 開頭（`if (this.state === "DEAD"...) return;` 之後）加**

```js
    this.animT += 0.06 * dt;
    this.moveVX = this.x - this.prevX;
    this.prevX = this.x;
    this.airborne = this.y + this.h < FLOOR_Y - 6;
```

- [ ] **Step 3: drawSprite() 加動畫變換**

替換現有 `ctx.translate(...)` 到 `ctx.scale(...)` 一段為：

```js
    // ── 程序式動畫：呼吸 / 移動彈跳+傾斜 / 飛行浮沉 / 攻擊蓄力 / 受傷抖動 ──
    let sx = 1, sy = 1, oy = 0, rot = 0, ox = 0;
    const moving = Math.abs(this.moveVX) > 0.3;
    if (this.airborne) {
      oy = Math.sin(this.animT * 2.2) * 3;                  // 拍翅浮沉
      rot = Math.sin(this.animT * 2.2 + 1) * 0.06;
    } else if (moving) {
      oy = -Math.abs(Math.sin(this.animT * 1.8)) * 3;       // 走路彈跳
      rot = (this.moveVX > 0 ? 1 : -1) * 0.05;              // 朝移動方向微傾
    } else {
      sy = 1 + Math.sin(this.animT) * 0.02;                 // 待機呼吸
      sx = 1 - Math.sin(this.animT) * 0.012;
    }
    if (this.state === "ATTACK") { sy *= 0.93; sx *= 1.05; } // 攻擊蓄力壓扁
    if (this.hurtFrames > 0) ox = (Math.random() - 0.5) * 3; // 受傷抖動

    ctx.translate(this.x + this.w / 2 + ox, this.y + this.h + oy);
    ctx.rotate(rot);                                         // 世界座標傾斜（翻面前）
    if (opts.rotate) {
      ctx.translate(0, -this.h / 2);
      ctx.rotate(opts.rotate);
      ctx.translate(0, this.h / 2);
    }
    ctx.scale((opts.noFlip ? 1 : -(opts.facing ?? this.facing ?? 1)) * sx, sy);
    this.lastSpriteKey = key; // Task 3 死亡溶解 ghost 用
```

（錨點＝腳底中心：呼吸/壓扁時腳貼地、頭部起伏，不會浮空。）

- [ ] **Step 4: 驗證**

preview：`game.step(120)` 連跑，截圖兩張間隔 30 幀比對（snapshot server）——
IDLE 怪有微幅高度差；console 乾淨。F1 房間飛行怪（鴿/麻雀）有浮沉。
用 `game.gotoRoom` 巡 2-3 個普通房確認走地怪（流浪狗 F3）有彈跳傾斜。

- [ ] **Step 5: Commit**

```bash
git add js/entities/enemies/BaseEnemy.js
git commit -m 'feat: M7-2 怪物程序式動畫（呼吸/彈跳/飛行浮沉/蓄力/抖動）'
```

---

## Task 3: 粒子系統＋死亡溶解

**Files:**
- Create: `js/render/Particles.js`
- Modify: `js/render/Renderer.js`（玩家之前繪製）
- Modify: `js/main.js`（update 呼叫＋EventBus 接線）

- [ ] **Step 1: 新建 js/render/Particles.js**

```js
// =====================================================
// Particles.js — 輕量粒子系統（物件池、上限封頂）
// 碎片粒子 + 死亡溶解 ghost（sprite 淡出塌縮）
// 全部是純視覺：不參與碰撞、不影響遊戲邏輯。
// =====================================================
import { getAsset } from "./AssetLoader.js";

const MAX_PARTICLES = 300;
const MAX_GHOSTS = 8;

export class ParticleSystem {
  constructor() {
    this.parts = [];   // {x,y,vx,vy,life,maxLife,size,color,grav}
    this.ghosts = [];  // {img,x,y,w,h,facing,t,maxT}
  }

  burst({ x, y, count = 8, color = "#1a1a1a", speed = 3, grav = 0.15,
          life = 28, size = 3, spread = Math.PI * 2, baseAngle = -Math.PI / 2 }) {
    for (let i = 0; i < count; i++) {
      if (this.parts.length >= MAX_PARTICLES) this.parts.shift(); // FIFO 丟最舊
      const a = baseAngle + (Math.random() - 0.5) * spread;
      const sp = speed * (0.4 + Math.random() * 0.8);
      this.parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life, maxLife: life * (0.6 + Math.random() * 0.4),
        size: size * (0.6 + Math.random() * 0.8), color, grav,
      });
    }
  }

  // 死亡溶解：用敵人最後的 sprite 做淡出＋塌縮（30 幀）
  ghost(enemy) {
    const img = enemy.lastSpriteKey ? getAsset(enemy.lastSpriteKey) : null;
    if (!img) return;
    if (this.ghosts.length >= MAX_GHOSTS) this.ghosts.shift();
    this.ghosts.push({
      img, x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h,
      w: enemy.w, h: enemy.h, facing: enemy.facing ?? 1, t: 30, maxT: 30,
    });
  }

  update(dt) {
    for (const p of this.parts) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += p.grav * dt;
      p.life -= dt;
    }
    this.parts = this.parts.filter(p => p.life > 0);
    for (const g of this.ghosts) g.t -= dt;
    this.ghosts = this.ghosts.filter(g => g.t > 0);
  }

  draw(ctx) {
    for (const g of this.ghosts) {
      const k = g.t / g.maxT;                  // 1 → 0
      const fit = Math.min(g.w / g.img.width, g.h / g.img.height);
      const dw = g.img.width * fit, dh = g.img.height * fit * (0.3 + 0.7 * k);
      ctx.save();
      ctx.globalAlpha = k * 0.8;
      ctx.translate(g.x, g.y);
      ctx.scale(-(g.facing) * (1 + (1 - k) * 0.3), 1); // 塌縮時微微攤開
      ctx.drawImage(g.img, -dw / 2, -dh, dw, dh);
      ctx.restore();
    }
    for (const p of this.parts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.restore();
    }
  }
}

export const Particles = new ParticleSystem();
```

- [ ] **Step 2: Renderer 接入（步驟 9 子彈之後、10 玩家之前）**

```js
      // 9.5 粒子層（死亡溶解 ghost + 碎片）
      s.particles?.draw?.(ctx);
```

- [ ] **Step 3: main.js 接線**

import：`import { Particles } from "./render/Particles.js";`
`renderer.scene.particles = Particles;`（scene 組裝區）。
update() 內 `hud.update(dt);` 旁加 `Particles.update(dt);`。
EventBus 接線（放在既有 `enemyDied` 掉落訂閱之後）：

```js
// ── M7 粒子特效（純視覺）──
EventBus.on("enemyDied", (e) => {
  if (!e?.w) return;
  Particles.ghost(e);
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  Particles.burst({ x: cx, y: cy, count: 10, color: "#16161c", speed: 4 });
  Particles.burst({ x: cx, y: cy, count: 4, color: "#ffe9a0", speed: 2.5, size: 2 });
});
EventBus.on("enemyHurt", ({ enemy }) => {
  if (!enemy?.w) return;
  Particles.burst({ x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h / 2,
                    count: 3, color: "#ffffff", speed: 2.5, size: 2, grav: 0.05, life: 14 });
});
EventBus.on("playerLand", (p) => Particles.burst({
  x: p.x + p.w / 2, y: p.y + p.h, count: 6, color: "#3a3a42",
  speed: 1.6, grav: -0.01, life: 18, size: 2.5, spread: Math.PI * 0.9, baseAngle: -Math.PI / 2,
}));
EventBus.on("playerDash", (p) => Particles.burst({
  x: p.x + p.w / 2, y: p.y + p.h, count: 5, color: "#3a3a42",
  speed: 1.2, grav: -0.01, life: 14, size: 2, spread: Math.PI * 0.7, baseAngle: -Math.PI / 2,
}));
EventBus.on("coinPickup", () => {
  const p = gm.player; if (!p) return;
  Particles.burst({ x: p.x + p.w / 2, y: p.y + p.h / 2, count: 6,
                    color: "#ffd75e", speed: 2.2, grav: 0.08, life: 20, size: 2.5 });
});
```

- [ ] **Step 4: 驗證**

preview：進首個有怪的房，`game.step` 打死一隻怪（或 eval `enemy.takeDamage(999)`）→
截圖確認溶解 ghost＋黑色碎片；跳躍落地有揚塵；console 乾淨；
連續 `game.step(600)` 後 `window.game.renderer.scene.particles.parts.length` ≤ 300。

- [ ] **Step 5: Commit**

```bash
git add js/render/Particles.js js/render/Renderer.js js/main.js
git commit -m 'feat: M7-3 粒子系統（死亡溶解/命中火花/揚塵/金幣閃光）'
```

---

## Task 4: 玩家手感（落地壓扁、衝刺殘影）

**Files:**
- Modify: `js/entities/Player.js`

- [ ] **Step 1: constructor「動畫狀態」區加**

```js
    this.landSquash = 0;     // 落地壓扁回彈剩餘幀
    this.afterimages = [];   // 衝刺殘影 {x,y,poseKey,facing,life}
```

- [ ] **Step 2: update() 兩處 `EventBus.emit("playerLand", this);` 後各加**

```js
        this.landSquash = 8;
```

- [ ] **Step 3: update() Dash 區（`this.x += this.facing * DASH_SPEED * dt;` 之後）加殘影取樣**

```js
      // 衝刺殘影：每 3 幀取樣一張
      if (Math.floor(this.dashFrames) % 3 === 0) {
        this.afterimages.push({ x: this.x, y: this.y, facing: this.facing, life: 12 });
        if (this.afterimages.length > 6) this.afterimages.shift();
      }
```

update() 尾端（`this.x = Math.max(...)` 邊界處理後）加衰減：

```js
    if (this.landSquash > 0) this.landSquash -= dt;
    for (const a of this.afterimages) a.life -= dt;
    this.afterimages = this.afterimages.filter(a => a.life > 0);
```

- [ ] **Step 4: draw() 整合**

draw() 開頭（選 poseKey 之前）先畫殘影：

```js
    // 衝刺殘影（畫在本體之下）
    const ghostImg = getAsset("player_jump") || getAsset("player_idle");
    if (ghostImg) for (const a of this.afterimages) {
      const fit = Math.min(this.w / ghostImg.width, (this.h + 10) / ghostImg.height);
      const dw = ghostImg.width * fit, dh = ghostImg.height * fit;
      ctx.save();
      ctx.globalAlpha = (a.life / 12) * 0.25;
      ctx.translate(a.x + this.w / 2, a.y + this.h);
      ctx.scale(-a.facing, 1);
      ctx.drawImage(ghostImg, -dw / 2, -dh, dw, dh);
      ctx.restore();
    }
```

本體 sprite 繪製處（既有 `ctx.drawImage(img, ...)` 的外層 transform）加落地壓扁：
在既有 translate/scale 序列中乘上

```js
    const k = this.landSquash > 0 ? this.landSquash / 8 : 0; // 1→0
    // 既有 scale 乘上 (1 + 0.08*k, 1 - 0.14*k)，錨點同樣是腳底
```

實作時對照 draw() 現有結構（456 行起），把壓扁倍率併入既有的 scale 呼叫，
錨點若為中心則先 translate 至腳底再縮放（與 BaseEnemy.drawSprite 同手法）。

- [ ] **Step 5: 驗證**

preview：跳躍落地有 Q 彈壓扁回彈（截圖落地當幀）；Shift 衝刺有 ≤6 張淡殘影尾跡；
趴下/爬牆/跑步姿勢不受影響；console 乾淨。

- [ ] **Step 6: Commit**

```bash
git add js/entities/Player.js
git commit -m 'feat: M7-4 玩家手感（落地壓扁回彈+衝刺殘影）'
```

---

## Task 5: 中文遊戲字型（jf open 粉圓）

**Files:**
- Create: `assets/fonts/jf-openhuninn.ttf`（下載）＋ `assets/fonts/LICENSE-OFL.txt`
- Modify: `js/core/Constants.js`（加 UI_FONT）
- Modify: `js/main.js`（boot 載入字型）
- Modify: 所有 `sans-serif` 出現處（HUD.js、Screens.js、MapDisplay.js、ItemDisplay.js、SynergyAlert.js、rooms/*.js 等）

- [ ] **Step 1: 下載字型**

```bash
mkdir -p assets/fonts
curl -s https://api.github.com/repos/justfont/open-huninn-font/releases/latest
# 從回應的 assets[].browser_download_url 取 .ttf 下載：
curl -L -o assets/fonts/jf-openhuninn.ttf <browser_download_url>
```

同時把 repo 的 OFL 授權文字存成 `assets/fonts/LICENSE-OFL.txt`（OFL 要求隨字型附帶）。
檔案約 5-8MB，GitHub Pages 可承受；只在 boot 載入一次。

- [ ] **Step 2: Constants.js 加（2.1 畫面區之後）**

```js
// ── M7 UI 字型（jf open 粉圓，OFL；boot 以 FontFace 載入）──
export const UI_FONT = "'openhuninn', sans-serif";
```

- [ ] **Step 3: main.js boot() 載入（loadAllAssets 之前）**

```js
async function boot() {
  try {
    const font = new FontFace("openhuninn", "url(assets/fonts/jf-openhuninn.ttf)");
    await font.load();
    document.fonts.add(font);
  } catch (err) {
    console.warn("字型載入失敗，退回 sans-serif", err); // 字型缺失不可擋遊戲
  }
  await loadAllAssets();
  state.change(STATES.MAIN_MENU);
  requestAnimationFrame(gameLoop);
}
```

- [ ] **Step 4: 全域替換字體字串**

```bash
grep -rn 'sans-serif' js/
```

逐檔把 `ctx.font = "bold 14px sans-serif"` 形式改為樣板字串：
`` ctx.font = `bold 14px ${UI_FONT}`; ``（各檔加 `UI_FONT` import）。
不可漏掉 rooms/（商店價格標籤等）與 ui/ 全部檔案。

- [ ] **Step 5: 驗證**

preview reload → 主選單標題/HUD 數字/商店標籤全部變圓體（截圖比對）；
`grep -rn 'sans-serif' js/` 僅剩 `Constants.js` 的 fallback 一處；console 乾淨。

- [ ] **Step 6: Commit**

```bash
git add assets/fonts js/
git commit -m 'feat: M7-5 jf open 粉圓字型（FontFace 載入+全 UI 套用）'
```

---

## Task 6: HUD 動效打磨

**Files:**
- Modify: `js/ui/HUD.js`

- [ ] **Step 1: constructor 加狀態＋事件**

```js
    this.hurtPulse = 0;     // 受傷心跳（幀）
    this.coinBounce = 0;    // 金幣數字彈跳（幀）
    this.lastCoins = gm.coins;
    EventBus.on("playerHurt", () => { this.hurtPulse = 18; });
```

（HUD.js 需加 `import { EventBus } from "../core/EventBus.js";`）

- [ ] **Step 2: update() 加衰減＋金幣偵測**

```js
  update(dt) {
    this.blinkTimer += dt;
    if (this.hurtPulse > 0) this.hurtPulse -= dt;
    if (this.coinBounce > 0) this.coinBounce -= dt;
    if (this.gm.coins !== this.lastCoins) { this.coinBounce = 12; this.lastCoins = this.gm.coins; }
  }
```

- [ ] **Step 3: drawHearts 加脈動＋描邊高光**

drawHearts 開頭計算縮放（受傷心跳 / 低血量持續脈動）：

```js
    const low = p.hp <= 1 && p.soulHearts <= 0;
    const beat = this.hurtPulse > 0 ? 1 + (this.hurtPulse / 18) * 0.25
               : low ? 1 + Math.sin(this.blinkTimer * 0.18) * 0.08 : 1;
```

drawHeart 簽名加 `scale = 1`，紅心呼叫帶 `beat`；繪製時以心形中心縮放：

```js
  drawHeart(ctx, x, y, color, fillRatio = 1, scale = 1) {
    const s = HEART_SIZE;
    ctx.save();
    ctx.translate(x + s / 2, y + s / 2);
    ctx.scale(scale, scale);
    ctx.translate(-(x + s / 2), -(y + s / 2));
    // …既有 clip 與兩圓+三角繪製不變…
    // 末尾加描邊＋高光點：
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = 1.5;
    ctx.stroke();                                   // 沿用最後的心形 path
    if (fillRatio >= 1 && color !== "#4a4a4a") {
      ctx.fillStyle = "rgba(255,255,255,0.35)";     // 左上高光
      ctx.beginPath();
      ctx.arc(x + s * 0.3, y + s * 0.26, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
```

（實作時把描邊放在三角形 path 完成後、restore 前，確保 stroke 包住整顆心。）

- [ ] **Step 4: drawResources 金幣彈跳**

金幣數字 y 座標改 `` y + 13 - (this.coinBounce > 0 ? Math.sin((this.coinBounce / 12) * Math.PI) * 5 : 0) ``。

- [ ] **Step 5: drawBossBar 名牌化**

```js
    // 名牌底框 + 雙層漸變血條
    ctx.fillStyle = "rgba(8,8,12,0.7)";
    ctx.beginPath();
    ctx.roundRect(x - 8, y - 6, w + 16, h + 34, 8);
    ctx.fill();
    ctx.fillStyle = "#3a3a3a";
    ctx.fillRect(x, y, w, h);
    const ratio = boss.hp / boss.maxHP;
    const grad = ctx.createLinearGradient(0, y, 0, y + h);
    const main = boss.phase === 2 ? "#ff5e3a" : "#c8102e";
    grad.addColorStop(0, "#ff8a6a");
    grad.addColorStop(0.4, main);
    grad.addColorStop(1, "#7a0a1c");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w * ratio, h);
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
```

名稱字體改 `` `bold 13px ${UI_FONT}` ``。

- [ ] **Step 6: 驗證**

preview：被怪打一下 → 心形放大回彈；剩 1 心 → 持續脈動；撿金幣 → 數字彈跳；
進 Boss 房 → 名牌血條（截圖）。console 乾淨。

- [ ] **Step 7: Commit**

```bash
git add js/ui/HUD.js
git commit -m 'feat: M7-6 HUD 動效（心跳/低血脈動/金幣彈跳/Boss 名牌血條）'
```

---

## Task 7: 轉場（換房淡入＋樓層字卡）

**Files:**
- Create: `js/render/TransitionFX.js`
- Modify: `js/core/Constants.js`（FLOOR_NAMES）
- Modify: `js/main.js`（接線）
- Modify: `js/render/Renderer.js`（screens 之前繪製）

- [ ] **Step 1: Constants.js 加樓層名（檔尾）**

```js
// ── M7 樓層顯示名（轉場字卡）──
export const FLOOR_NAMES = {
  1: "陽光屋頂", 2: "深夜廚房", 3: "雨夜暗巷",
  4: "廢棄倉庫", 5: "神秘圖書館", 6: "月光神社", 7: "流浪終點",
};
```

- [ ] **Step 2: 新建 js/render/TransitionFX.js**

```js
// =====================================================
// TransitionFX.js — 換房黑幕淡出 + 樓層字卡（純視覺覆蓋）
// =====================================================
import { CANVAS_W, CANVAS_H, FLOOR_NAMES, UI_FONT } from "../core/Constants.js";

const ROOM_FADE_FRAMES = 18;   // 換房：瞬間全黑 → 18 幀淡出（0.3s）
const CARD_IN = 20, CARD_HOLD = 80, CARD_OUT = 30;

export class TransitionFX {
  constructor() {
    this.fade = 0;     // 0~1 黑幕不透明度
    this.cardT = -1;   // 字卡剩餘幀（總長 IN+HOLD+OUT）
    this.cardText = "";
  }

  onRoomChanged() { this.fade = 1; }

  onFloorChanged(num) {
    this.fade = 1;
    this.cardText = `F${num}・${FLOOR_NAMES[num] || ""}`;
    this.cardT = CARD_IN + CARD_HOLD + CARD_OUT;
  }

  update(dt) {
    if (this.fade > 0) this.fade = Math.max(0, this.fade - dt / ROOM_FADE_FRAMES);
    if (this.cardT >= 0) this.cardT -= dt;
  }

  draw(ctx) {
    if (this.fade > 0) {
      ctx.fillStyle = `rgba(4,4,8,${this.fade.toFixed(3)})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }
    if (this.cardT >= 0) {
      const t = this.cardT;
      let a = 1;
      if (t > CARD_HOLD + CARD_OUT) a = (CARD_IN + CARD_HOLD + CARD_OUT - t) / CARD_IN;
      else if (t < CARD_OUT) a = t / CARD_OUT;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, a));
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(8,8,12,0.6)";
      ctx.beginPath();
      ctx.roundRect(CANVAS_W / 2 - 150, 120, 300, 64, 10);
      ctx.fill();
      ctx.fillStyle = "#ffd75e";
      ctx.font = `bold 30px ${UI_FONT}`;
      ctx.fillText(this.cardText, CANVAS_W / 2, 162);
      ctx.restore();
    }
  }
}
```

- [ ] **Step 3: main.js 接線**

```js
import { TransitionFX } from "./render/TransitionFX.js";
const transitionFX = new TransitionFX();
renderer.scene.transition = transitionFX;
EventBus.on("roomChanged", () => transitionFX.onRoomChanged());
EventBus.on("floorChanged", (n) => transitionFX.onFloorChanged(n));
```

update() 內加 `transitionFX.update(dt);`——放在 `screens.update(dt);` 旁
（**狀態閘門 return 之前**，暫停/選單時字卡也要能淡完）。

- [ ] **Step 4: Renderer 繪製（HUD 層之後、screens 之前）**

```js
    // 17.5 轉場層（黑幕/字卡蓋住場景與 HUD，但在全螢幕覆蓋之下）
    s.transition?.draw?.(ctx);
```

- [ ] **Step 5: 驗證**

preview：過門 → 0.3s 黑幕淡出；`EventBus.emit('requestNextFloor')` →
黑幕＋「F2・深夜廚房」字卡淡入停留淡出（截圖各階段）；
開頭按 Enter 開局 → F1 字卡出現；console 乾淨。

- [ ] **Step 6: Commit**

```bash
git add js/render/TransitionFX.js js/core/Constants.js js/main.js js/render/Renderer.js
git commit -m 'feat: M7-7 轉場（換房淡出+樓層字卡）'
```

---

## Task 8: 去背工具 tools/unwhite.js（白底反解）

**Files:**
- Create: `tools/unwhite.js`、`tools/package.json`、`tools/.gitignore`（node_modules）

舊管線（`_tmp/imgproc/` pad→dekey flood→pass2）只適用純黑剪影；新風格有藍 rim light
與發光眼，flood-fill 會誤刪。新工具：**外部 flood 找背景 → 邊緣帶白底反解 → 內部不動**。

- [ ] **Step 1: 建 tools/ 並安裝 pngjs**

```bash
mkdir -p tools && cd tools
printf '{ "name": "blackcat-tools", "private": true, "dependencies": { "pngjs": "^7.0.0" } }' > package.json
printf 'node_modules\n' > .gitignore
npm install
```

- [ ] **Step 2: 寫 tools/unwhite.js**

```js
// =====================================================
// unwhite.js — 白底精確去背（M7 素材管線）
// 用法：node tools/unwhite.js <in.png> <out.png>
// 1) 四周補 8px 純白（剪影觸邊時 flood 仍可繞行）
// 2) 從邊框 flood-fill 標記「外部近白」＝背景
// 3) 背景 → 全透明；與背景相鄰 2px 內的非背景像素 →
//    白底反解：a = 1 - min(r,g,b)/255，F = (C-255(1-a))/a
//    （抗鋸齒邊緣得到正確半透明，無白邊）
// 4) 內部像素完全不動（發光眼、rim light 安全）
// =====================================================
const fs = require("fs");
const { PNG } = require("pngjs");

const [, , inPath, outPath] = process.argv;
const src = PNG.sync.read(fs.readFileSync(inPath));
const PAD = 8, W = src.width + PAD * 2, H = src.height + PAD * 2;

// 補白邊
const img = new PNG({ width: W, height: H });
img.data.fill(255);
PNG.bitblt(src, img, 0, 0, src.width, src.height, PAD, PAD);

const idx = (x, y) => (y * W + x) * 4;
const nearWhite = (i) =>
  Math.min(img.data[i], img.data[i + 1], img.data[i + 2]) >= 242;

// 外部 flood（4 向 BFS，從四邊框出發）
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

fs.writeFileSync(outPath, PNG.sync.write(img));
console.log(`unwhite: ${inPath} -> ${outPath} (${W}x${H})`);
```

- [ ] **Step 3: 驗證**

```bash
node tools/unwhite.js _tmp/style_samples/1_silhouette_refined.png _tmp/style_samples/verify_tool.png
node _tmp/bgremove/composite.js assets/images/backgrounds/bg_f3.png _tmp/style_samples/verify_tool.png _tmp/style_samples/verify_tool_ingame.png 0.28
```

Read 目視 `verify_tool_ingame.png`：無白邊、毛邊平滑、眼睛保留。

- [ ] **Step 4: Commit**

```bash
git add tools/unwhite.js tools/package.json tools/.gitignore
git commit -m 'feat: M7-8 白底反解去背工具（外部 flood+邊緣帶反解）'
```

---

## Task 9: 重產 18 隻小怪（剪影精修）

**Files:**
- Create: `_tmp/gen_m7_enemies.sh`（生成腳本，prompt 全記錄）
- Modify: `assets/images/sprites/enemy_*.png` × 18（覆蓋）

- [ ] **Step 1: 寫批次腳本 _tmp/gen_m7_enemies.sh**

```bash
#!/bin/bash
# M7 小怪剪影精修重產：以現有 sprite 為姿勢參考，逐隻生成
# 用法：bash _tmp/gen_m7_enemies.sh [起始索引]（中斷後可續跑）
cd "$(dirname "$0")/.."
mkdir -p _tmp/m7_enemies/raw _tmp/m7_enemies/out

# key|英文描述|眼睛顏色（可含保留色彩元素的補充）
LIST=(
"pigeon|plump city pigeon|pale-yellow"
"sparrow|small round sparrow|pale-yellow"
"fatpigeon|fat messenger pigeon, keep the red satchel bag as a red accent|pale-yellow"
"cockroach|scuttling cockroach with long antennae|amber"
"mouse|small quick mouse|pale-yellow"
"chefbot|boxy chef robot with a chef hat|cyan"
"straydog|scruffy hunched stray dog|pale-yellow"
"ghost|wispy floating ghost with ragged tail|cold-white"
"trashcan|monster hiding in a dented trash can|green"
"giantrat|big hulking rat|red"
"boxbot|cardboard box robot|orange"
"eliterat|armored elite rat|red"
"booksoul|flying possessed open book|cold-white"
"inkpus|small octopus dripping ink|violet"
"compass|floating ornate compass creature|gold"
"spiritfox|elegant spirit fox|gold"
"lantern|floating paper lantern yokai|warm-orange"
"komainu|stone guardian lion-dog|gold"
)

START=${1:-0}
for i in "${!LIST[@]}"; do
  [ "$i" -lt "$START" ] && continue
  IFS='|' read -r KEY DESC EYE <<< "${LIST[$i]}"
  SRC="assets/images/sprites/enemy_${KEY}.png"
  echo "=== [$i] enemy_${KEY} ==="
  URL=$(higgsfield generate create nano_banana_2 \
    --prompt "Redraw this ${DESC} game enemy sprite in refined silhouette style: pure black silhouette body keeping the exact same pose and proportions, add glowing ${EYE} eye(s), subtle cold blue rim light along the back and outer edges, wispy textured edges matching the creature, dark fairytale mood like the game Limbo. Side view, full body, game sprite asset on plain solid white background, no other objects, no ground shadow." \
    --image "$SRC" --wait --wait-timeout 10m | tail -1)
  echo "$URL"
  curl -s -o "_tmp/m7_enemies/raw/enemy_${KEY}.png" "$URL"
  node tools/unwhite.js "_tmp/m7_enemies/raw/enemy_${KEY}.png" "_tmp/m7_enemies/out/enemy_${KEY}.png"
done
echo "ALL DONE"
```

- [ ] **Step 2: 分批執行（每批 6 隻，限時內可完成）**

```bash
bash _tmp/gen_m7_enemies.sh 0    # 卡住/逾時就從中斷索引續跑
```

- [ ] **Step 3: 逐張目視審查**

Read 工具逐張看 `_tmp/m7_enemies/out/enemy_*.png`：
姿勢與原圖一致（碰撞箱不變的前提）、風格統一（黑剪影+發光眼+藍 rim）、去背乾淨。
不合格者單獨重抽（重跑該索引），最多重抽 2 次，仍不行則保留原圖並記錄。

- [ ] **Step 4: 覆蓋進 assets 並遊戲內驗證**

```bash
cp _tmp/m7_enemies/out/enemy_*.png assets/images/sprites/
```

preview reload：`game.gotoRoom` 巡 F1-F6 各 1-2 房（`requestNextFloor` 換層），
snapshot 截圖每層一張目視：怪物清晰、不浮空、不穿地、翻面正常。

- [ ] **Step 5: Commit**

```bash
git add assets/images/sprites/enemy_*.png
git commit -m 'feat: M7-9 18 隻小怪剪影精修重產（發光眼+rim light）'
```

（`_tmp/` 不進版控，腳本即文件——與既有 gen_*.sh 慣例一致。）

---

## Task 10: 重產 13 Boss＋13 攻擊幀

**Files:**
- Create: `_tmp/gen_m7_bosses.sh`
- Modify: `assets/images/sprites/boss_*.png` × 13（覆蓋）
- Create: `assets/images/sprites/boss_*_atk.png` × 13（新增）
- Modify: `js/render/AssetLoader.js`（註冊 13 個 `_atk` key）

- [ ] **Step 1: 寫 _tmp/gen_m7_bosses.sh**

與 Task 9 同構，LIST 換成（key|描述|眼色）：

```bash
LIST=(
"feathertop|giant crowned pigeon boss|red"
"antenna|rooftop antenna monster boss|cyan"
"roachmaster|giant cockroach overlord boss|amber"
"potfiend|possessed cooking pot boss|warm-orange"
"dogfather|huge mafia boss dog|pale-yellow"
"raincat|melancholic rain spirit cat boss|cold-white"
"ratking|rat king boss with crown|red"
"steamroller|industrial steamroller machine boss|orange"
"tomegod|giant ancient tome god boss|gold"
"librarian|ghostly librarian boss|cold-white"
"ninetails|nine-tailed fox boss|gold"
"gateguardian|massive shrine gate guardian boss|gold"
"chaoswanderer|final chaos wanderer god boss|violet"
)
```

每隻跑兩次生成：
1. **本體**：prompt 同 Task 9（參考圖 = 現有 `boss_<key>.png`）。
2. **攻擊幀**：參考圖 = **剛產好的新本體**（風格一致性鎖定），prompt：

```
Same character in the same refined silhouette style: now in an aggressive
attack pose - lunging forward with mouth wide open / striking limb extended,
body leaning into the attack, same glowing eyes brighter. Keep identical
style: pure black silhouette, cold blue rim light, plain solid white
background, side view, full body, no other objects, no ground shadow.
```

輸出 `boss_<key>.png` 與 `boss_<key>_atk.png`，都過 `tools/unwhite.js`。

- [ ] **Step 2: 分批執行＋逐張目視**（同 Task 9 Step 2-3，共 26 張）

攻擊幀額外檢查：**腳底位置與本體大致對齊**（繪製錨點是腳底中心，
差太多會跳動；輕微差異可接受，切換時有 squash 掩護）。

- [ ] **Step 3: 入 assets＋AssetLoader 註冊**

```bash
cp _tmp/m7_bosses/out/boss_*.png assets/images/sprites/
```

AssetLoader.js ASSETS 加 13 行：

```js
  // M7 ── Boss 攻擊幀
  boss_feathertop_atk:  "assets/images/sprites/boss_feathertop_atk.png",
  boss_antenna_atk:     "assets/images/sprites/boss_antenna_atk.png",
  boss_roachmaster_atk: "assets/images/sprites/boss_roachmaster_atk.png",
  boss_potfiend_atk:    "assets/images/sprites/boss_potfiend_atk.png",
  boss_dogfather_atk:   "assets/images/sprites/boss_dogfather_atk.png",
  boss_raincat_atk:     "assets/images/sprites/boss_raincat_atk.png",
  boss_ratking_atk:     "assets/images/sprites/boss_ratking_atk.png",
  boss_steamroller_atk: "assets/images/sprites/boss_steamroller_atk.png",
  boss_tomegod_atk:     "assets/images/sprites/boss_tomegod_atk.png",
  boss_librarian_atk:   "assets/images/sprites/boss_librarian_atk.png",
  boss_ninetails_atk:   "assets/images/sprites/boss_ninetails_atk.png",
  boss_gateguardian_atk:"assets/images/sprites/boss_gateguardian_atk.png",
  boss_chaoswanderer_atk:"assets/images/sprites/boss_chaoswanderer_atk.png",
```

- [ ] **Step 4: 驗證**

preview：巡 F1/F4/F7 Boss 房截圖，新 Boss 本體顯示正常（攻擊幀切換是 Task 11）。

- [ ] **Step 5: Commit**

```bash
git add assets/images/sprites/boss_*.png js/render/AssetLoader.js
git commit -m 'feat: M7-10 13 Boss 剪影精修重產+攻擊幀素材'
```

---

## Task 11: Boss 攻擊幀切換＋前搖蓄力

**Files:**
- Modify: `js/entities/boss/BossController.js`

- [ ] **Step 1: constructor 加 `this.atkAnim = 0;`（出手動畫剩餘幀）**

- [ ] **Step 2: update() 彈幕區改**

```js
    // ── 彈幕 ──
    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && player?.active) {
      this.fireTimer = this.currentPhase.interval;
      this.currentPhase.fire(this, player, this.bulletPool);
      this.atkAnim = 16;                        // 出手：攻擊幀+拉伸 16 幀
    }
    if (this.atkAnim > 0) this.atkAnim -= dt;
```

- [ ] **Step 3: draw() sprite 區改**

```js
    // ── 前搖蓄力（開火前 20 幀壓扁）/ 出手（攻擊幀+拉伸）──
    const telegraph = !this.isDying && this.fireTimer <= 20 && this.atkAnim <= 0;
    const striking = this.atkAnim > 0;
    let sprKey = this.pattern.sprite;
    if (striking && this.pattern.sprite) {
      const atk = getAsset(this.pattern.sprite + "_atk");
      if (atk) sprKey = this.pattern.sprite + "_atk";
    }
    const img = sprKey ? getAsset(sprKey) : null;
    if (img) {
      const fit = Math.min(w / img.width, h / img.height);
      const dw = img.width * fit, dh = img.height * fit;
      if (telegraph) ctx.scale(1.06, 0.92);              // 蓄力壓扁
      else if (striking) ctx.scale(0.96, 1.06);          // 出手拉伸
      if (this.hurtFrames > 0) ctx.filter = "invert(1)";
      ctx.drawImage(img, -dw / 2, h / 2 - dh, dw, dh);
      ctx.filter = "none";
      ctx.restore();
      return;
    }
```

（縮放在既有 `ctx.translate(cx..)` 之後、繪圖之前；錨點為中心可接受——
Boss 懸浮空中，沒有腳貼地問題。`_atk` 素材缺失自動退回本體，不會崩。）

- [ ] **Step 4: 驗證**

preview 進 F1 Boss 房，`game.step` 連跑觀察一個開火週期截圖×3
（蓄力壓扁 → 攻擊幀拉伸 → 回常態）；殘血進 Phase 2 行為不變；console 乾淨。

- [ ] **Step 5: Commit**

```bash
git add js/entities/boss/BossController.js
git commit -m 'feat: M7-11 Boss 攻擊幀切換+前搖蓄力動畫'
```

---

## Task 12: 主選單 key art＋畫面裝飾

**Files:**
- Create: `assets/images/backgrounds/bg_keyart.png`
- Modify: `js/render/AssetLoader.js`（註冊 `bg_keyart`——用 `bg_` 前綴吃 2048 縮放上限）
- Modify: `js/ui/Screens.js`

- [ ] **Step 1: 產 key art**

```bash
higgsfield generate create nano_banana_2 \
  --prompt "Game title screen key art, 16:9: a cute black cat silhouette with a red bowtie and big round white eyes, sitting on a glowing night rooftop looking at a huge moon, luminous colorful painted background in deep blues and teals with warm window lights, in the exact same painting style as the reference image, the upper third is calm open sky reserved for a game title, no text, no logo." \
  --image assets/images/backgrounds/bg_f3.png \
  --aspect_ratio 16:9 --wait --wait-timeout 10m
curl -s -o _tmp/keyart_raw.png <輸出URL>
```

目視合格（貓有紅領結、上 1/3 留空、色調與遊戲背景一致）後存
`assets/images/backgrounds/bg_keyart.png`（不需去背）。不合格重抽（預算 3 次內）。

- [ ] **Step 2: AssetLoader 註冊**

```js
  bg_keyart: "assets/images/backgrounds/bg_keyart.png", // M7 主選單 key art
```

- [ ] **Step 3: Screens.drawMenu 改用 key art**

```js
  drawMenu(ctx) {
    ctx.save();
    const cx = CANVAS_W / 2;
    const art = getAsset("bg_keyart");
    if (art) {
      const scale = Math.max(CANVAS_W / art.width, CANVAS_H / art.height);
      ctx.drawImage(art, (CANVAS_W - art.width * scale) / 2,
                    (CANVAS_H - art.height * scale) / 2,
                    art.width * scale, art.height * scale);
      const veil = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      veil.addColorStop(0, "rgba(8,8,12,0.35)");   // 上方壓一點讓標題浮出
      veil.addColorStop(0.5, "rgba(8,8,12,0)");
      veil.addColorStop(1, "rgba(8,8,12,0.45)");   // 下方供操作說明
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    } else {
      this.drawBackdrop(ctx, 0.92);
      this.drawCatSilhouette(ctx, cx, 270);        // 無圖 fallback 保留
    }

    // 標題：層次陰影
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.font = `bold 54px ${UI_FONT}`;
    ctx.fillText("黑貓流浪記", cx + 3, 123);
    ctx.fillStyle = "#fff";
    ctx.fillText("黑貓流浪記", cx, 120);
    ctx.font = `16px ${UI_FONT}`;
    ctx.fillStyle = "#c9d4dc";
    ctx.fillText("Black Cat Wanderer", cx, 150);
    // …最高紀錄 / Enter 提示 / 操作說明沿用既有程式（y 座標微調避開貓）…
    ctx.restore();
  }
```

（Screens.js 需 import `getAsset` 與 `UI_FONT`；既有最高紀錄/提示文字移到
下半部 veil 區，具體 y 值實作時對畫面微調。）

- [ ] **Step 4: 死亡/通關畫面小裝飾**

drawDeath / drawClear 標題下各加一條金色分隔線：

```js
    ctx.strokeStyle = "rgba(255,215,94,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 120, 205); ctx.lineTo(cx + 120, 205);
    ctx.stroke();
```

- [ ] **Step 5: 驗證**

preview reload → 主選單 key art＋標題陰影（截圖）；死一次看死亡畫面；console 乾淨。

- [ ] **Step 6: Commit**

```bash
git add assets/images/backgrounds/bg_keyart.png js/render/AssetLoader.js js/ui/Screens.js
git commit -m 'feat: M7-12 主選單 key art+標題層次+畫面裝飾'
```

---

## Task 13: 整合驗收＋交接文件

**Files:**
- Modify: `HANDOFF.md`（M7 進度＋素材管線更新）

- [ ] **Step 1: 全流程煙霧測試（HANDOFF §5 方法）**

preview reload 後依序：
1. Enter 開局 → F1 字卡。
2. 每層：`game.gotoRoom` 巡訪全部房間（`floor.rooms` 動態取），各 `game.step(60)`，
   檢查 console 零錯誤。
3. Boss 房 eval `boss.takeDamage(9999)` → 字卡＋換層。
4. F7 通關 → RUN_CLEAR 畫面正常。
5. 全程 `game.fps` 抽查 ≥ 55（粒子+動畫不掉幀）。

- [ ] **Step 2: 視覺驗收截圖（snapshot server）**

每層 1 張戰鬥中截圖＋主選單＋Boss 房＋死亡畫面，Read 逐張目視最終確認。

- [ ] **Step 3: 視窗縮放最終檢查**

`preview_resize` 三種尺寸（1920×1080 / 1280×720 / 800×600）截圖：等比、銳利、置中。

- [ ] **Step 4: 更新 HANDOFF.md**

進度表加 M7 列；§4 素材管線補：新去背工具 `tools/unwhite.js`（取代 _tmp/imgproc
舊 flood 管線）、M7 生成腳本 `_tmp/gen_m7_enemies.sh`／`gen_m7_bosses.sh`、
剪影精修配方 prompt；§7 剩餘工作維持「真人試玩平衡」並加「M7 真人視覺驗收」。

- [ ] **Step 5: Commit（不部署）**

```bash
git add HANDOFF.md
git commit -m 'docs: M7 完成記錄（HANDOFF 進度+素材管線更新）'
```

**部署（推 main＋gh-pages）等使用者本地驗收 OK 後再執行：**
`git push origin master:main master:gh-pages`

---

## 風險與備援

- **素材生成風格飄移**：每張都以現有 sprite 當參考；攻擊幀以新本體當參考；逐張目視，不合格重抽（≤2 次），最終不合格保留舊圖（有圖用圖機制保證不崩）。
- **credits 不足**（現約 900）：45 張基準＋重抽餘裕共約 60 次生成，nano_banana_2 單次成本低，足夠；超支時優先砍攻擊幀（Boss 程序式 squash 仍在）。
- **效能**：粒子上限 300＋ghost 上限 8；動畫是 O(1) 數學變換。fps 驗收 ≥55。
- **字型下載失敗**：FontFace try/catch 退回 sans-serif，遊戲不擋。
