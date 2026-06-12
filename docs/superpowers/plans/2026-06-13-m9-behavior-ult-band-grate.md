# M9 怪物行為強化＋居合大招＋底帶 80px＋排水柵 S 門 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 七隻怪換上「可學習的行為循環」、L 鍵 EX 改成黑白居合爪連斬、底部黑帶 106→80px 並質感化成土層斷面、S 門改排水柵口（掰彎欄杆＋樓層色光柱）。

**Architecture:** 怪物只改 `behave()`/`update()` 行為層（HP/傷害/移速不動）；大招在 Player 加三階段狀態機＋新 `SlashFX.js` 全屏特效模組（difference 合成，零素材）；底帶縮短＝常數整體 +26 平移；土層質感與排水柵分別落在既有 `FrameSilhouette`（烘焙）與 `Door.draw`（執行期）兩層，沿用 M8 架構。

**Tech Stack:** 純前端 Canvas 2D（ES Module、無建置工具、無測試框架）。驗證採 HANDOFF §5 無頭方法：`window.game.step(n)` 逐幀＋`preview_eval` 斷言＋snapshot server 截圖。

**規格:** `docs/superpowers/specs/2026-06-13-m9-monster-ult-band-design.md`

---

## 驗證環境（每個 Task 共用）

- 起 preview：`preview_start`（`.claude/launch.json` 已設定，port 8765），開 `http://localhost:8765/index.html`
- 進入遊戲：eval `window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Enter' })); game.step(30);`
- 截圖：先 `node _tmp\snapshot_server.js`（port 8766）背景跑著，eval 內 `fetch('http://localhost:8766/<name>', { method: 'POST', body: canvas.toDataURL('image/jpeg', 0.8) })` → 存 `_tmp/snaps/<name>.jpg`，再用 Read 看圖。**不要 return base64。**
- 每次 reload 房間配置隨機，找特定房用 `game.floor.rooms.find(...)` ＋ `game.gotoRoom(x, y)`
- 模擬按鍵：dispatch `KeyboardEvent` 用 `code`（不是 `key`）、dispatch 到 `window`（不是 document），記得補 keyup
- 換層：`const { EventBus } = await import('/js/core/EventBus.js'); EventBus.emit('requestNextFloor');`
- **中文檔一律用 Write/Edit 工具改（禁 PowerShell 管線）；commit 訊息不可含雙引號**

---

### Task 1: Constants 平移 — 底帶 106 → 80px

**Files:**
- Modify: `js/core/Constants.js:12`（FLOOR_Y）、`js/core/Constants.js:9-10`（刪死常數）、`js/core/Constants.js:50-57`（平台註解＋數值）

- [ ] **Step 1: 改 FLOOR_Y 並刪除死常數**

`js/core/Constants.js` 三處修改。

(a) 第 9-10 行刪除（grep 已確認 `ROOM_W`/`ROOM_H` 定義後從未被 import）：

```js
// 刪除這兩行：
export const ROOM_W = 780;          // 房間可用寬度（不含牆壁）
export const ROOM_H = 400;          // 房間可用高度（不含地板/天花板）
```

(b) `FLOOR_Y` 改值＋註記：

```js
export const FLOOR_Y = 426;         // 地板 Y 座標（M9：400→426，底帶 106→80px）
```

(c) 平台區塊（原 50-57 行）整段換成（數值 +26、驗算註解同步重寫）：

```js
// ── 2.2b 平台 & 姿態（M5.5 新功能；M9 隨 FLOOR_Y 整體 +26 平移）──
// 跳躍最大上升高度 = 13²/(2×0.6) ≈ 141px；玩家高 44px
// 地板（426）起跳腳底最高到 y≈285 → TIER1 必須 ≥ 286 才踩得到
// TIER1（306）起跳腳底最高到 y≈165 → TIER2 必須 ≥ 166
// TIER2（196）起跳頭頂可達天花板（y=60）→ 北門觸發區（y≤62）可進
export const PLATFORM_H = 14;          // 平台厚度（px）
export const PLATFORM_TIER1_Y = 306;   // 第一層平台頂面 Y
export const PLATFORM_TIER2_Y = 196;   // 第二層平台頂面 Y（通北門）
```

- [ ] **Step 2: grep 掃寫死座標的漏網**

```
Grep pattern: \b(400|280|170)\b  path: js/  output_mode: content
```

逐筆檢查：與「地板/平台高度」語義相關的字面量必須改用常數或 +26。已知合法命中（**不要改**）：`Player.js` `bulletReturnDistance = 300` 之類無關數值、`Constants.js` 本身、各檔 `0.4`/`1.40` 等小數。已知會命中且**屬於 M9 後續 Task 範圍**（本 Task 不改）：`F1Enemies.js:109` 麻雀 `FLOOR_Y - 160`（Task 5 重寫時整段消失）。若發現其他確實寫死地板/平台的字面量，改為引用常數並記錄在 commit 訊息。

- [ ] **Step 3: 全樓層煙霧驗證**

reload → Enter → 逐層 `EventBus.emit('requestNextFloor')`，每層逐房 `game.gotoRoom` ＋ `game.step(30)`，期望零 console error。再 eval 物理鏈驗證（玩家從地板跳，必須能站上 TIER1）：

```js
const { PLATFORM_TIER1_Y, FLOOR_Y } = await import('/js/core/Constants.js');
JSON.stringify({ floor: FLOOR_Y, t1: PLATFORM_TIER1_Y, jumpReach: FLOOR_Y - 141, ok: FLOOR_Y - 141 <= PLATFORM_TIER1_Y });
```

期望：`ok: true`。再找一間有平台的房，模擬按住 W 跳躍 `game.step(40)` 後斷言 `game.player.standingPlatform !== null`（站上跳台）或 `game.player.y + game.player.h === 426`（落回地板）。截圖 `m9_band80.jpg` 確認底帶視覺變薄、S 門洞與地表裝飾無錯位。

- [ ] **Step 4: Commit**

```bash
git add js/core/Constants.js
git commit -m 'feat: M9-1 常數平移——FLOOR_Y 426 底帶 80px、平台+26、清除 ROOM_W/H 死常數'
```

---

### Task 2: FrameSilhouette 土層斷面質感

**Files:**
- Modify: `js/render/FrameSilhouette.js`（`bakeFloor` 內、頂緣亮線之後、S 門 punch 之前）

- [ ] **Step 1: 在 `bakeFloor` 插入土層裝飾**

位置：`bakeFloor` 函式中，「頂緣亮線」stroke 區塊之後、`if (room.doors.S) punch(...)` 之前。插入（**全部無條件消耗 rnd()，不依賴門狀態，維持 M8-2 的 RNG 序列與門無關原則**；punch 在後，洞內裝飾會被一併挖掉）：

```js
  // ── M9 土層斷面質感（全烘焙，零每幀成本）────────────
  // 地層橫線 1~2 條（極淡、帶微起伏）
  const strataN = 1 + Math.floor(rnd() * 2);
  for (let i = 0; i < strataN; i++) {
    const ly = FLOOR_Y + 18 + rnd() * (CANVAS_H - FLOOR_Y - 30);
    c.strokeStyle = `rgba(255,232,170,${(0.05 + rnd() * 0.02).toFixed(3)})`;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, ly);
    let sx2 = 0;
    while (sx2 < CANVAS_W) {
      sx2 += 90 + rnd() * 60;
      c.lineTo(Math.min(sx2, CANVAS_W), ly + rnd() * 4 - 2);
    }
    c.stroke();
  }
  // 埋藏石塊 2~4 顆（#1b1b22，比底色 #101014 微亮一階）
  const rocks = 2 + Math.floor(rnd() * 3);
  c.fillStyle = "#1b1b22";
  for (let i = 0; i < rocks; i++) {
    const rx2 = 40 + rnd() * (CANVAS_W - 80);
    const ry2 = FLOOR_Y + 22 + rnd() * (CANVAS_H - FLOOR_Y - 40);
    c.beginPath();
    c.ellipse(rx2, ry2, 8 + rnd() * 14, 5 + rnd() * 8, rnd() * Math.PI, 0, Math.PI * 2);
    c.fill();
  }
  // 根鬚 1~2 根（從地表往下、漸隱的微光線）
  const roots = 1 + Math.floor(rnd() * 2);
  for (let i = 0; i < roots; i++) {
    const x2 = WALL_THICKNESS + 40 + rnd() * (CANVAS_W - 2 * WALL_THICKNESS - 80);
    const len = 18 + rnd() * 22;
    const g = c.createLinearGradient(0, FLOOR_Y, 0, FLOOR_Y + len);
    g.addColorStop(0, "rgba(255,232,170,0.10)");
    g.addColorStop(1, "rgba(255,232,170,0)");
    c.strokeStyle = g;
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(x2, FLOOR_Y + 2);
    c.quadraticCurveTo(x2 + rnd() * 10 - 5, FLOOR_Y + len * 0.6, x2 + rnd() * 14 - 7, FLOOR_Y + len);
    c.stroke();
  }
  // 底緣 1px 紫微光
  c.strokeStyle = "rgba(120,80,200,0.35)";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(0, CANVAS_H - 0.5);
  c.lineTo(CANVAS_W, CANVAS_H - 0.5);
  c.stroke();
```

- [ ] **Step 2: 視覺驗證**

reload → Enter → 截圖 `m9_strata.jpg`：底帶可見極淡地層線/石塊/根鬚/底緣紫光，整體仍是「黑前景」不搶戲；S 門房間確認洞內乾淨（裝飾被挖掉）。換 2-3 間房截圖確認 seed 不同裝飾不同、同房重進裝飾一致（`game.gotoRoom` 出去再回來比對）。

- [ ] **Step 3: Commit**

```bash
git add js/render/FrameSilhouette.js
git commit -m 'feat: M9-2 土層斷面質感烘焙——地層線+埋石+根鬚+底緣紫微光'
```

---

### Task 3: S 門排水柵＋樓層光色

**Files:**
- Modify: `js/core/Constants.js`（加 FLOOR_LIGHT_COLORS）
- Modify: `js/world/Door.js`（draw 簽名＋S 門分支＋drawGrate）
- Modify: `js/world/Room.js:152-154`（drawDoors 傳 floorNum）

- [ ] **Step 1: Constants 加光色查表**

加在 `FLOOR_NAMES` 區塊後：

```js
// ── M9 S 門排水柵：柵縫光柱顏色 = 下一層主題色（下樓預告）──
export const FLOOR_LIGHT_COLORS = {
  2: "#ffd75e",  // 廚房暖黃
  3: "#6ebeff",  // 雨夜藍
  4: "#e8a13c",  // 倉庫琥珀
  5: "#ffc878",  // 燭光金
  6: "#dce8f0",  // 月白
  7: "#ff5e3a",  // 終點緋紅
};
```

- [ ] **Step 2: Room.drawDoors 傳樓層**

```js
  drawDoors(ctx) {
    Object.values(this.doors).forEach(d => d?.draw(ctx, this.floorNum));
  }
```

- [ ] **Step 3: Door.js 改寫 S 門繪製**

(a) import 行加 `FLOOR_LIGHT_COLORS`：

```js
import {
  CANVAS_W, CANVAS_H, WALL_THICKNESS, FLOOR_Y, DOOR_W, DOOR_H,
  FLOOR_LIGHT_COLORS,
} from "../core/Constants.js";
```

(b) 檔案底部（class 外）加 helper：

```js
// hex → rgba（光柱漸層需要帶 alpha 的樓層色）
function withAlpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
```

(c) `draw` 簽名加 floorNum，開頭攔截 S 門：

```js
  draw(ctx, floorNum = 1) {
    if (this.dir === "S") { this.drawGrate(ctx, floorNum); return; }
    const r = this.rect;
    // …以下原樣不動…
```

(d) class 內新增 `drawGrate`（取代 S 門的開/鎖通用畫法；E/W/N 不變）：

```js
  // ── M9 S 門＝排水柵口 ───────────────────────────────
  // 開＝中間兩根欄杆掰彎出貓縫＋柵縫 3 束呼吸光柱（顏色=下層主題色）；
  // 鎖＝五根直欄全黑、無光。清怪瞬間「掰彎+亮光」即開門演出。
  drawGrate(ctx, floorNum) {
    const r = this.rect;
    const now = performance.now();
    const color = FLOOR_LIGHT_COLORS[Math.min(floorNum + 1, 7)] || "#ffd75e";
    ctx.save();
    // 洞內底色（蓋掉烘焙挖洞透出的背景）
    ctx.beginPath();
    traceOpening(ctx, "S", r);
    ctx.fillStyle = this.isOpen ? "#0c1418" : "#0a0a10";
    ctx.fill();

    if (this.isOpen) {
      // 3 束呼吸光柱：從柵縫往上打 ~50px，錯相位
      const slots = [r.x + r.w * 0.22, r.x + r.w * 0.5, r.x + r.w * 0.78];
      for (let i = 0; i < 3; i++) {
        const pulse = 0.55 + Math.sin(now * 0.003 + i * 2.1) * 0.45;
        const bx = slots[i];
        const g = ctx.createLinearGradient(0, r.y - 50, 0, r.y);
        g.addColorStop(0, withAlpha(color, 0));
        g.addColorStop(1, withAlpha(color, 0.30 * pulse));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(bx - 4, r.y);
        ctx.lineTo(bx + 4, r.y);
        ctx.lineTo(bx + 9, r.y - 50);
        ctx.lineTo(bx - 9, r.y - 50);
        ctx.closePath();
        ctx.fill();
      }
      // 洞內透光面（柵欄後面的光）
      ctx.beginPath();
      traceOpening(ctx, "S", r);
      ctx.fillStyle = withAlpha(color, 0.30);
      ctx.fill();
      // 上飄光塵（沿用 N/E/W 門的光塵語言，染樓層色）
      this._drawGrateMotes(ctx, now, color, r);
    }

    // 五根欄杆（黑剪影；開門時中間兩根掰彎出貓縫）
    ctx.strokeStyle = "#101014";
    ctx.lineCap = "round";
    ctx.lineWidth = 5;
    for (let i = 0; i < 5; i++) {
      const bx = r.x + r.w * (0.1 + 0.2 * i);
      ctx.save();
      ctx.translate(bx, r.y);
      if (this.isOpen && i === 2) ctx.rotate(-0.24);      // 中央欄杆向左掰
      else if (this.isOpen && i === 3) ctx.rotate(0.21);  // 右鄰欄杆向右掰
      ctx.beginPath();
      ctx.moveTo(0, -1);
      ctx.lineTo(0, r.h - 6);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // 柵縫光塵：3 粒上飄微光點（染樓層色；S 門專用）
  _drawGrateMotes(ctx, now, color, r) {
    const t = now * 0.001;
    const span = 56;
    for (let i = 0; i < 3; i++) {
      const rise = (t * 14 + i * 19) % span;
      const x = r.x + r.w / 2 + Math.sin(t * 0.8 + i * 2.4) * (10 + i * 6);
      const y = r.y - 4 - rise;
      ctx.globalAlpha = 0.7 * (1 - rise / span);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
```

注意：原 `draw` 的開門分支裡 `_drawSpill` 有 S 門 case（`else { // S：光由下往上透 }`）與 `_drawMotes` 的 S default case——S 門不再走那條路，**保留原碼不動**（dead branch 無害，刪了反而動到 E/W/N 共用路徑）。

- [ ] **Step 4: 驗證兩態＋光色**

找有 S 門的房：`game.floor.rooms.find(r => r.doors.S)` → gotoRoom。eval 強制兩態截圖：

```js
const room = game.floor.currentRoom;
room.doors.S.close(); game.step(2);   // 截 m9_grate_locked.jpg：五根直欄全黑無光
room.doors.S.open(); game.step(2);    // 截 m9_grate_open.jpg：掰彎+光柱
```

換層到 F2/F5 再各截一張開門狀態，確認光柱顏色分別是雨夜藍（F2→F3）與月白（F5→F6）。走到 S 門上按住 S 確認下樓觸發邏輯不變。

- [ ] **Step 5: Commit**

```bash
git add js/core/Constants.js js/world/Door.js js/world/Room.js
git commit -m 'feat: M9-3 S 門排水柵——掰彎欄杆+樓層色呼吸光柱+柵縫光塵'
```

---

### Task 4: 居合爪連斬（取代 EX 能量彈）

**Files:**
- Modify: `js/core/Constants.js`（EX_SLASH_* 取代 EX_BULLET_*）
- Modify: `js/entities/Player.js`（狀態機＋EX 彈退役）
- Modify: `js/entities/enemies/BaseEnemy.js`（slashMarkFrames 定格）
- Create: `js/render/SlashFX.js`
- Modify: `js/render/Renderer.js`（scene 欄位＋13.5 繪製）
- Modify: `js/main.js`（接線）

- [ ] **Step 1: Constants 換常數**

刪除 `EX_BULLET_DAMAGE_MULT`、`EX_BULLET_SPEED`、`EX_BULLET_W`、`EX_BULLET_H` 四行（保留 `EX_ENERGY_MAX`、`EX_ENERGY_PER_HIT`），原位置改為：

```js
// ── M9 EX 居合爪連斬（取代 EX 能量彈）──
export const EX_SLASH_RANGE = 280;      // 衝刺距離（px）
export const EX_SLASH_DMG_MULT = 6;     // 結算傷害倍率（舊 EX 彈單體 ×5 → 多體 ×6 換貼身風險）
export const EX_SLASH_CORRIDOR_H = 90;  // 命中走廊高度（px）
export const EX_SLASH_STARTUP = 6;      // 啟動幀（黑白反轉+架式）
export const EX_SLASH_DASH = 10;        // 衝刺幀
export const EX_SLASH_FREEZE = 20;      // 定格幀（黑白分鏡）
export const EX_SLASH_BUFFER_INV = 10;  // 結算後無敵緩衝幀
```

- [ ] **Step 2: BaseEnemy 加居合定格**

(a) constructor（狀態異常區塊後）加：

```js
    this.slashMarkFrames = 0; // M9 居合定格：獨立於 stun/slow，互不覆寫
```

(b) `update` 開頭 `if (this.state === "DEAD" || !this.active) return;` 之後插入：

```js
    // ── M9 居合定格：AI/移動/接觸傷害全凍結（白閃由 draw 端讀取）──
    if (this.slashMarkFrames > 0) { this.slashMarkFrames -= dt; return; }
```

(c) `drawSprite` 白閃條件改成（原 `ctx.filter = this.hurtFrames > 0 ? ...`）：

```js
    ctx.filter = (this.hurtFrames > 0 || this.slashMarkFrames > 0)
      ? "invert(1)"
      : "drop-shadow(0 0 3px rgba(255,255,255,0.30))";
```

且上方受傷抖動行改：

```js
    if (this.hurtFrames > 0 || this.slashMarkFrames > 0) ox = (Math.random() - 0.5) * 3;
```

(d) `bodyColor`（幾何 fallback 白閃）改：

```js
  bodyColor(base) {
    return (this.hurtFrames > 0 || this.slashMarkFrames > 0) ? "#ffffff" : base;
  }
```

- [ ] **Step 3: Player 狀態機＋EX 彈退役**

(a) import：刪 `EX_BULLET_DAMAGE_MULT, EX_BULLET_SPEED, EX_BULLET_W, EX_BULLET_H`，加 `EX_SLASH_RANGE, EX_SLASH_DMG_MULT, EX_SLASH_CORRIDOR_H, EX_SLASH_STARTUP, EX_SLASH_DASH, EX_SLASH_FREEZE, EX_SLASH_BUFFER_INV`，並新增一行：

```js
import { Particles } from "../render/Particles.js";
import { rectsOverlap } from "./Entity.js";
```

（Entity 已從同檔 import，把 `rectsOverlap` 加進該行即可。）

(b) constructor（`this.exEnergy = 0;` 之後）加：

```js
    // ── M9 居合爪連斬狀態 ──
    this.slashPhase = null;   // null | "startup" | "dash" | "freeze"
    this.slashT = 0;          // 當前階段剩餘幀
    this.slashTargets = [];   // 走廊內標記的敵人（含 Boss）
    this.slashLines = [];     // 爪痕線段 {x0,y0,x1,y1}（SlashFX 繪製）
    this.slashStartX = 0;
```

(c) `isInvincible` getter 改：

```js
  get isInvincible() {
    return this.invincibleFrames > 0 || this.dashFrames > 0 || this.slashPhase !== null;
  }
```

(d) `update` 開頭 `if (!input) return;` 之後插入：

```js
    // ── M9 居合進行中：鎖一般輸入，走專屬階段機 ──
    if (this.slashPhase) { this.updateSlash(dt, room); return; }
```

(e) EX 觸發分支（原 261-266 行）整段換成：

```js
    // ── EX 必殺：居合爪連斬（M9，取代能量彈）──
    if (input.exPressed && this.exEnergy >= EX_ENERGY_MAX) {
      this.exEnergy = 0;
      this.startSlash();
    }
```

(f) class 內新增四個方法（放在 `currentChargeMult` 之前）：

```js
  // ── M9 居合爪連斬 ────────────────────────────────
  startSlash() {
    this.slashPhase = "startup";
    this.slashT = EX_SLASH_STARTUP;
    this.slashTargets = [];
    this.slashLines = [];
    this.slashStartX = this.x;
    this.vy = 0;
    this.mouthOpenScale = 1;
    EventBus.emit("playerShootEX", this); // 沿用 EX 觸發音（AudioEvents 不用改）
    EventBus.emit("playerDash", this);    // 疊 Dash 音
  }

  updateSlash(dt, room) {
    this.slashT -= dt;
    if (this.slashPhase === "startup") {
      if (this.slashT <= 0) { this.slashPhase = "dash"; this.slashT = EX_SLASH_DASH; }
      return;
    }
    if (this.slashPhase === "dash") {
      this.x += this.facing * (EX_SLASH_RANGE / EX_SLASH_DASH) * dt;
      this.x = Math.max(WALL_THICKNESS, Math.min(CANVAS_W - WALL_THICKNESS - this.w, this.x)); // 撞牆提前停
      // 殘影（複用 Dash 系統；玩家步距 28px < 殘影壽命覆蓋範圍，軌跡連續）
      this.afterimages.push({ x: this.x, y: this.y, w: this.w, h: this.h,
                              facing: this.facing, life: AFTERIMAGE_LIFE });
      if (this.afterimages.length > 6) this.afterimages.shift();
      this.markSlashTargets(room);
      if (this.slashT <= 0) {
        this.slashPhase = "freeze";
        this.slashT = EX_SLASH_FREEZE;
        this.buildSlashLines();
      }
      return;
    }
    // freeze
    if (this.slashT <= 0) this.resolveSlash();
  }

  // 走廊標記：每幀以玩家當前位置掃（步距 28px < 玩家寬 36px，無縫隙）
  markSlashTargets(room) {
    if (!room) return;
    const corridor = {
      x: this.x - 4,
      y: this.y + this.h / 2 - EX_SLASH_CORRIDOR_H / 2,
      w: this.w + 8,
      h: EX_SLASH_CORRIDOR_H,
    };
    const candidates = [...(room.enemies || [])];
    if (room.boss?.active) candidates.push(room.boss);
    for (const e of candidates) {
      if (!e.active || this.slashTargets.includes(e)) continue;
      if (!rectsOverlap(corridor, e.hitbox)) continue;
      this.slashTargets.push(e);
      // Boss 只記傷害不定格（不破壞 Boss 行為機）
      if (e !== room.boss) e.slashMarkFrames = EX_SLASH_FREEZE + 6;
    }
  }

  buildSlashLines() {
    const x0 = this.slashStartX + this.w / 2, x1 = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    this.slashLines = [
      { x0, y0: cy - 18, x1, y1: cy - 26 },
      { x0, y0: cy + 2,  x1, y1: cy - 2 },
      { x0, y0: cy + 20, x1, y1: cy + 26 },
    ];
  }

  resolveSlash() {
    for (const e of this.slashTargets) {
      if (!e.active) continue; // 定格期間被跟班打死等情況
      e.takeDamage(this.totalDamage * EX_SLASH_DMG_MULT, this.facing * 10, -2);
      Particles.burst({ x: e.x + e.w / 2, y: e.y + e.h / 2,
                        count: 10, color: "#ffffff", speed: 4 });
    }
    this.slashTargets = [];
    this.slashLines = [];
    this.slashPhase = null;
    this.invincibleFrames = Math.max(this.invincibleFrames, EX_SLASH_BUFFER_INV); // 落點緩衝
  }
```

(g) EX 彈退役——`shootVolley`/`spawnBullet` 去 isEX 化：

`shootVolley` 簽名與首段改為：

```js
  // 發射一輪子彈（bulletCount 顆，扇形展開 spreadAngle）
  shootVolley(chargeMult = 1) {
    const count = this.bulletCount;
    const spreadRad = (this.spreadAngle * Math.PI) / 180;
    const baseAngle = this.facing === 1 ? 0 : Math.PI;

    // 左爪強化：每隔一顆子彈傷害 ×2（交替觸發）
    let dmgMult = chargeMult;
    if (this.altDoubleShot) {
      this._altToggle = !this._altToggle;
      if (this._altToggle) dmgMult *= 2;
    }

    for (let i = 0; i < count; i++) {
      const offset = count > 1 ? (i - (count - 1) / 2) * spreadRad : 0;
      this.spawnBullet(baseAngle + offset, dmgMult, chargeMult > 1);
    }

    // 十字貓掌：機率向其餘三個方向齊射
    if (this.crossFireChance > 0 && Math.random() < this.crossFireChance) {
      for (const extra of [Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        this.spawnBullet(baseAngle + extra, dmgMult, false);
      }
    }
  }
```

`spawnBullet` 改為（刪所有 isEX 分支；`Bullet.js`/`BulletPool.js` 的 isEX 欄位保留不動，只是永遠不為 true）：

```js
  spawnBullet(angle, dmgMult = 1, charged = false) {
    const mouthX = this.facing === 1 ? this.x + this.w : this.x;
    const mouthY = this.y + 12;
    const bullet = this.bulletPool.spawn({
      x: mouthX - PLAYER_BULLET_W / 2, y: mouthY - PLAYER_BULLET_H / 2,
      vx: Math.cos(angle) * this.bulletSpeed, vy: Math.sin(angle) * this.bulletSpeed,
      damage: this.totalDamage * dmgMult,
      range: this.bulletRange,
      w: PLAYER_BULLET_W, h: PLAYER_BULLET_H,
      piercing: this.bulletPiercing,
    });
    bullet.homingStrength = this.bulletHoming || (charged && this.chargeHoming ? 0.08 : 0);
    bullet.sizeMulti = this.bulletSizeMulti;
    bullet.knockback = this.bulletKnockback;
    bullet.maxBounces = this.bulletBounces;

    // ── Task 12 進階屬性傳遞 ──
    bullet.returns = this.bulletReturns;
    // …此區以下原樣保留（returns/hoverTime/splitOnHit/…），只是不再被 isEX 提前 return 擋住…
```

原本 `if (isEX) return bullet;` 那行刪除。`shootVolley` 的兩個呼叫端同步改：蓄力分支 `this.shootVolley(false, this.currentChargeMult())` → `this.shootVolley(this.currentChargeMult())`；連發分支 `this.shootVolley(false)` → `this.shootVolley()`。

- [ ] **Step 4: SlashFX 模組**

Create `js/render/SlashFX.js`：

```js
// =====================================================
// SlashFX.js — 居合爪連斬全屏特效（M9）
// 讀 player.slashPhase 繪製：startup＝全屏黑白反轉；
// dash/freeze＝黑白斜紋漫畫分鏡＋白色爪痕。
// difference 合成反轉場景色彩，零素材、零狀態。
// 繪製時機：Renderer 13.5（camera reset 後、HUD 前）
// =====================================================
import { CANVAS_W, CANVAS_H } from "../core/Constants.js";

export class SlashFX {
  constructor(player) {
    this.player = player;
    this._stripes = null; // 斜紋 pattern（lazy 一次性離屏）
  }

  stripes(ctx) {
    if (this._stripes) return this._stripes;
    const cv = document.createElement("canvas");
    cv.width = 48; cv.height = 48;
    const c = cv.getContext("2d");
    c.strokeStyle = "#ffffff";
    c.lineWidth = 14;
    for (let i = -48; i < 96; i += 32) {
      c.beginPath();
      c.moveTo(i, 48);
      c.lineTo(i + 48, 0);
      c.stroke();
    }
    this._stripes = ctx.createPattern(cv, "repeat");
    return this._stripes;
  }

  draw(ctx) {
    const p = this.player;
    if (!p?.slashPhase) return;
    ctx.save();
    ctx.globalCompositeOperation = "difference";
    if (p.slashPhase === "startup") {
      ctx.fillStyle = "#ffffff"; // 全屏反轉一瞬
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    } else {
      ctx.fillStyle = this.stripes(ctx); // 斜紋分鏡：紋上反轉、縫隙原色
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }
    ctx.restore();
    // 爪痕（正常合成：白線+光暈）
    if (p.slashLines.length) {
      ctx.save();
      ctx.strokeStyle = "#ffffff";
      ctx.lineCap = "round";
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 8;
      ctx.lineWidth = 3;
      for (const l of p.slashLines) {
        ctx.beginPath();
        ctx.moveTo(l.x0, l.y0);
        ctx.lineTo(l.x1, l.y1);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}
```

- [ ] **Step 5: Renderer＋main 接線**

(a) `js/render/Renderer.js` scene 欄位（constructor）加 `slashFX: null,`；render() 在 `finally` 區塊之後、HUD 之前插入：

```js
    // 13.5 居合全屏特效（蓋場景、不蓋 HUD；不受 Camera 震動影響）
    s.slashFX?.draw?.(ctx);
```

(b) `js/main.js`：import 區加 `import { SlashFX } from "./render/SlashFX.js";`，`renderer.scene.particles = Particles;`（115 行附近）之後加：

```js
renderer.scene.slashFX = new SlashFX(player);
```

(c) `js/main.js` 門觸發（約 209 行）加居合防護——衝刺貼到 E/W 牆時，開著的門只看位置就會觸發換房，定格中換房會把演出截斷：

```js
    // 門觸發 → 房間切換（input：S 門需按住下鍵；居合中不換房）
    const dir = player.slashPhase ? null : room.checkDoorTransition(player, input);
```

- [ ] **Step 6: 驗證**

找有敵人的房（戰鬥中），eval：

```js
game.player.exEnergy = 100;
const before = game.floor.currentRoom.enemies.filter(e => e.active).map(e => [e.constructor.name, e.hp]);
window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyL' }));
game.step(2);
window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyL' }));
game.step(8);  // startup+dash 前半 → 截 m9_slash_dash.jpg（殘影+反轉/斜紋）
game.step(12); // freeze 中 → 截 m9_slash_freeze.jpg（斜紋分鏡+爪痕+敵人白閃）
game.step(20); // 結算完
JSON.stringify({
  phase: game.player.slashPhase,           // null
  ex: game.player.exEnergy,                // 0
  after: game.floor.currentRoom.enemies.filter(e => e.active).map(e => [e.constructor.name, e.hp]),
  before,
});
```

期望：走廊內敵人 HP 減 `totalDamage×6` 或死亡；走廊外（高處飛怪）不受傷；`slashPhase` 回 null。再驗：(1) 面朝牆釋放 → 玩家停在牆邊不穿出；(2) 站在已清房朝開著的 E 門衝刺 → 全程不換房（門防護生效），結算完再走過去才換房；(3) 普通射擊（按 J）正常、蓄力道具房測蓄力射擊不噴錯；(4) Boss 房釋放 → Boss 掉血但行為不中斷。

- [ ] **Step 7: Commit**

```bash
git add js/core/Constants.js js/entities/Player.js js/entities/enemies/BaseEnemy.js js/render/SlashFX.js js/render/Renderer.js js/main.js
git commit -m 'feat: M9-4 居合爪連斬取代 EX 能量彈——黑白反轉+斜紋分鏡定格+走廊結算x6'
```

---

### Task 5: F1 鳥類重做 — 麻雀俯衝轟炸＋鴿子鐘擺俯衝

**Files:**
- Modify: `js/entities/enemies/F1Enemies.js`（Sparrow/Pigeon 整類重寫；FatPigeon 與 spawn 不動）
- Modify: `js/entities/enemies/BaseEnemy.js`（telegraphFlash 通用前搖白閃）

- [ ] **Step 1: BaseEnemy 加 telegraphFlash**

(a) constructor（slashMarkFrames 行後）加：

```js
    this.telegraphFlash = false; // M9 前搖白閃（子類自行切換；draw 端統一讀取）
```

(b) `drawSprite` 兩處條件再加一項（Task 4 已改過一次，最終樣子）：

```js
    if (this.hurtFrames > 0 || this.slashMarkFrames > 0) ox = (Math.random() - 0.5) * 3;
```

（抖動**不**加 telegraphFlash——前搖只閃白不抖。）filter 行：

```js
    ctx.filter = (this.hurtFrames > 0 || this.slashMarkFrames > 0 || this.telegraphFlash)
      ? "invert(1)"
      : "drop-shadow(0 0 3px rgba(255,255,255,0.30))";
```

(c) `bodyColor`：

```js
  bodyColor(base) {
    return (this.hurtFrames > 0 || this.slashMarkFrames > 0 || this.telegraphFlash)
      ? "#ffffff" : base;
  }
```

- [ ] **Step 2: Sparrow 重寫（俯衝轟炸，刪射擊）**

`F1Enemies.js` 常數區：刪 `SPARROW_FIRE_INTERVAL`、`SPARROW_BULLET_SPEED`、`SPARROW_HOVER_DIST` 三行，補上：

```js
// M9 俯衝轟炸（取代懸停射擊；不再與玩家鎖距離）
const SPARROW_ORBIT_FRAMES = 90;     // 盤旋時間基準（個體 ±）
const SPARROW_TELEGRAPH = 24;        // 鎖定前搖（白閃）
const SPARROW_DIVE_SPEED = 9;        // 俯衝速度
const SPARROW_DIVE_MAX = 60;         // 俯衝最長幀數（逾時拉起）
const SPARROW_ORBIT_RX = 70;         // 盤旋 8 字橫半徑
const SPARROW_ORBIT_RY = 34;         // 盤旋 8 字縱半徑
const SPARROW_ALT = 90;              // 盤旋高度（天花板下緣起算）
const SPARROW_RECOVER_RISE = 3;      // 拉起爬升速度
```

`EnemyBullet` 若只剩 EnemyBomb 使用就保留 import（FatPigeon 用 EnemyBomb；確認 `EnemyBullet` 在本檔已無人用則從 import 行移除）。Sparrow 整類換成：

```js
// ── 麻雀：盤旋 → 鎖定前搖（白閃）→ 弧線俯衝 → 拉起 ────
export class Sparrow extends BaseEnemy {
  constructor(x, y, flockIndex = 0) {
    super(x, y, SPARROW_W, SPARROW_H, SPARROW_HP, SPARROW_SPEED, SPARROW_DMG);
    this.flockIndex = flockIndex;
    this.phase = "orbit";            // orbit | telegraph | dive | recover
    this.phaseT = SPARROW_ORBIT_FRAMES * (0.6 + 0.3 * flockIndex); // 群體錯開俯衝
    this.orbitT = flockIndex * 1.9;  // 盤旋相位錯開
    this.anchorX = x;
    this.anchorY = y;
    this.diveVX = 0; this.diveVY = 0;
  }

  behave(dt, player) {
    this.phaseT -= dt;

    if (this.phase === "orbit") {
      this.state = "CHASE";
      this.telegraphFlash = false;
      this.orbitT += 0.045 * dt;
      // 錨點緩慢漂向玩家上空（只求大致在附近，不鎖距離）
      if (player?.active) {
        this.anchorX += Math.sign((player.x + player.w / 2) - this.anchorX) * 0.6 * dt;
      }
      this.anchorY = CEILING_Y + SPARROW_ALT + this.flockIndex * 22;
      this.x = this.anchorX + Math.cos(this.orbitT) * SPARROW_ORBIT_RX - this.w / 2;
      this.y = this.anchorY + Math.sin(this.orbitT * 2) * SPARROW_ORBIT_RY - this.h / 2; // 8 字飛行
      if (Math.abs(this.moveVX) > 0.3) this.facing = this.moveVX > 0 ? 1 : -1;
      if (this.phaseT <= 0 && player?.active) {
        this.phase = "telegraph";
        this.phaseT = SPARROW_TELEGRAPH;
      }

    } else if (this.phase === "telegraph") {
      this.state = "ATTACK";
      this.telegraphFlash = Math.floor(this.phaseT / 4) % 2 === 0; // 白閃預警
      if (this.phaseT <= 0 && player?.active) {
        this.telegraphFlash = false;
        const dx = (player.x + player.w / 2) - (this.x + this.w / 2);
        const dy = (player.y + player.h / 2) - (this.y + this.h / 2);
        const d = Math.hypot(dx, dy) || 1;
        this.diveVX = (dx / d) * SPARROW_DIVE_SPEED;
        this.diveVY = (dy / d) * SPARROW_DIVE_SPEED;
        this.facing = dx > 0 ? 1 : -1;
        this.phase = "dive";
        this.phaseT = SPARROW_DIVE_MAX;
      }

    } else if (this.phase === "dive") {
      this.state = "ATTACK";
      this.x += this.diveVX * dt;
      this.y += this.diveVY * dt;
      const hitFloor = this.y + this.h >= FLOOR_Y - 2;
      const hitWall = this.x <= WALL_THICKNESS + 2 ||
                      this.x + this.w >= CANVAS_W - WALL_THICKNESS - 2;
      if (hitFloor || hitWall || this.phaseT <= 0) {
        this.phase = "recover";
        this.phaseT = 40;
      }

    } else { // recover：慣性滑行 + 爬升回盤旋高度
      this.state = "CHASE";
      this.y -= SPARROW_RECOVER_RISE * dt;
      this.x += this.diveVX * 0.4 * dt;
      if (this.y <= this.anchorY || this.phaseT <= 0) {
        this.anchorX = this.x; // 從現位置接續盤旋（不瞬移）
        this.phase = "orbit";
        this.phaseT = SPARROW_ORBIT_FRAMES * (0.8 + Math.random() * 0.5);
      }
    }
  }

  draw(ctx) {
    if (this.drawSprite(ctx, "enemy_sparrow")) return;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(this.facing || 1, 1);
    // 身體（棕色小圓）
    ctx.fillStyle = this.bodyColor("#8a6a4a");
    ctx.beginPath();
    ctx.ellipse(0, 0, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // 尾羽
    ctx.beginPath();
    ctx.moveTo(-this.w / 2, 0);
    ctx.lineTo(-this.w / 2 - 8, -4);
    ctx.lineTo(-this.w / 2 - 8, 4);
    ctx.closePath();
    ctx.fill();
    // 喙
    ctx.fillStyle = this.bodyColor("#e8a13c");
    ctx.beginPath();
    ctx.moveTo(this.w / 2, -2);
    ctx.lineTo(this.w / 2 + 6, 0);
    ctx.lineTo(this.w / 2, 2);
    ctx.closePath();
    ctx.fill();
    // 眼
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(this.w / 2 - 6, -3, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.drawHPBar(ctx);
  }
}
```

（draw 與原版相同——保留即可，這裡完整列出是因為整類重寫。`shootAt` 方法刪除。）

- [ ] **Step 3: Pigeon 改鐘擺俯衝**

常數區 `PIGEON_IDLE_FRAMES` 行後加：

```js
// M9 鐘擺俯衝（取代直線貼臉追擊）
const PIGEON_SWOOP_ACCEL = 0.25;   // 朝玩家的恆定加速度（衝過頭自然盪回=鐘擺）
const PIGEON_MAX_SPEED = 7;        // 速度上限
const PIGEON_TURN_PAUSE = 18;      // 鐘擺端點（高處近停時）的折返停頓
```

Pigeon 的 constructor 與 behave 換成（draw 不動）：

```js
  constructor(x, y) {
    super(x, y, PIGEON_W, PIGEON_H, PIGEON_HP, PIGEON_SPEED, PIGEON_DMG);
    this.idleTimer = PIGEON_IDLE_FRAMES;
    this.flapTimer = Math.random() * Math.PI * 2;
    this.swoopVX = 0; this.swoopVY = 0; // 鐘擺速度（不用 Entity.vy，避免與重力混用）
    this.pauseT = 0;
  }

  behave(dt, player) {
    this.flapTimer += 0.3 * dt;
    if (this.idleTimer > 0) { this.idleTimer -= dt; this.state = "IDLE"; return; }
    if (!player?.active) return;
    this.state = "CHASE";
    if (this.pauseT > 0) { this.pauseT -= dt; return; }

    // 恆定加速度指向玩家：衝過頭靠慣性盪到另一側高處再折返
    const tx = player.x + player.w / 2 - this.w / 2;
    const ty = player.y + player.h / 2 - this.h / 2;
    this.swoopVX += Math.sign(tx - this.x) * PIGEON_SWOOP_ACCEL * dt;
    this.swoopVY += Math.sign(ty - this.y) * PIGEON_SWOOP_ACCEL * dt;
    const sp = Math.hypot(this.swoopVX, this.swoopVY);
    if (sp > PIGEON_MAX_SPEED) {
      this.swoopVX *= PIGEON_MAX_SPEED / sp;
      this.swoopVY *= PIGEON_MAX_SPEED / sp;
    }
    this.x += this.swoopVX * dt;
    this.y += this.swoopVY * dt;
    if (Math.abs(this.moveVX) > 0.3) this.facing = this.moveVX > 0 ? 1 : -1;

    // 鐘擺端點：高於玩家且近乎靜止 → 短暫停頓（攻擊節奏的呼吸口）
    if (sp < 1.2 && this.y + this.h / 2 < player.y) this.pauseT = PIGEON_TURN_PAUSE;
  }
```

- [ ] **Step 4: 驗證**

reload 到 F1，找有麻雀的房（`game.floor.rooms` 找含 `Sparrow` 的，或 reload 重抽）。eval 斷言相位機：

```js
const s = game.floor.currentRoom.enemies.find(e => e.constructor.name === 'Sparrow');
const seen = new Set();
for (let i = 0; i < 360; i++) { game.step(1); if (s.active) seen.add(s.phase); }
JSON.stringify([...seen]); // 期望包含 orbit / telegraph / dive / recover 四相位
```

觀察點：麻雀**不再**停在玩家側上方固定距離；無子彈生成（`room.enemyBullets` 全程不含麻雀彈）。鴿子 `game.step(300)` 後位置軌跡有高-低-高擺盪（取樣 `[p.x, p.y]` 多幀確認 y 有往返）。截圖 `m9_f1_birds.jpg`。

- [ ] **Step 5: Commit**

```bash
git add js/entities/enemies/F1Enemies.js js/entities/enemies/BaseEnemy.js
git commit -m 'feat: M9-5 F1 鳥類重做——麻雀盤旋俯衝轟炸刪射擊、鴿子鐘擺俯衝'
```

---

### Task 6: F2 行為強化 — 蟑螂爬全屏＋老鼠叼道具＋廚師油漬

**Files:**
- Modify: `js/entities/enemies/F2Enemies.js`（三類）
- Modify: `js/entities/Player.js`（applySlip 打滑）

- [ ] **Step 1: Player 加打滑機制**

(a) constructor 狀態異常區（`this.slowFrames = 0;` 後）加：

```js
    this.slipFrames = 0;     // 油漬打滑：水平操控改慣性（M9）
    this.slipVX = 0;
```

(b) `update` 狀態異常衰減處（`if (this.slowFrames > 0) this.slowFrames -= dt;` 後）加：

```js
    if (this.slipFrames > 0) this.slipFrames -= dt;
```

(c) 水平移動段改為三分支（原 dash/普通二分支）：

```js
    if (this.dashFrames > 0) {
      // …原 dash 分支不動…
    } else if (this.slipFrames > 0) {
      // 打滑：速度向輸入方向緩慢逼近，鬆手也滑行（慣性失控感）
      this.slipVX += (ax * effSpeed - this.slipVX) * 0.06 * dt;
      this.x += this.slipVX * dt;
      if (ax !== 0) this.facing = ax > 0 ? 1 : -1;
    } else {
      this.slipVX = ax * effSpeed; // 隨時同步：踏進油漬瞬間不跳變
      this.x += ax * effSpeed * dt;
      if (ax !== 0) this.facing = ax > 0 ? 1 : -1;
    }
```

(d) `applySlow` 方法旁加：

```js
  applySlip(durFrames) {
    this.slipFrames = Math.max(this.slipFrames, durFrames);
  }
```

- [ ] **Step 2: 蟑螂全畫面爬行**

`F2Enemies.js` import 行確認含 `Entity, rectsOverlap`（OilZone 要用）：

```js
import { Entity, rectsOverlap } from "../Entity.js";
```

常數：刪 `ROACH_ZIGZAG_MIN`、`ROACH_ZIGZAG_MAX`，補：

```js
// M9 全畫面爬行（地板→右牆→天花板→左牆 逆時針環繞）
const ROACH_PERIM_SPEED = 3.2;   // 沿表面爬行速度
const ROACH_DROP_TRIGGER = 30;   // 天花板上與玩家水平距 < 此值 → 落下突襲
const ROACH_FALL_G = 0.5;        // 落下重力
const ROACH_LAND_PAUSE = 30;     // 落地停頓（破綻窗口）
```

Cockroach 的 constructor/behave/draw 換成：

```js
export class Cockroach extends BaseEnemy {
  constructor(x) {
    super(x, FLOOR_Y - ROACH_H, ROACH_W, ROACH_H, ROACH_HP, ROACH_SPEED, ROACH_DMG);
    this.legTimer = 0;
    this.mode = "crawl";       // crawl | fall | pause
    this.surface = "floor";    // floor | rightWall | ceiling | leftWall
    this.fallVY = 0;
    this.pauseT = 0;
  }

  behave(dt, player) {
    this.state = "CHASE";
    this.legTimer += 0.5 * dt;
    const minX = WALL_THICKNESS;
    const maxX = CANVAS_W - WALL_THICKNESS - this.w;

    if (this.mode === "fall") {
      this.state = "ATTACK";
      this.fallVY = Math.min(this.fallVY + ROACH_FALL_G * dt, 9);
      this.y += this.fallVY * dt;
      if (this.y + this.h >= FLOOR_Y) {
        this.y = FLOOR_Y - this.h;
        this.mode = "pause";
        this.pauseT = ROACH_LAND_PAUSE;
      }
      return;
    }
    if (this.mode === "pause") { // 落地停頓（破綻）
      this.pauseT -= dt;
      if (this.pauseT <= 0) { this.mode = "crawl"; this.surface = "floor"; }
      return;
    }

    // crawl：沿內緣逆時針環繞
    const v = ROACH_PERIM_SPEED * dt;
    if (this.surface === "floor") {
      this.y = FLOOR_Y - this.h;
      this.x += v; this.facing = 1;
      if (this.x >= maxX) { this.x = maxX; this.surface = "rightWall"; }
    } else if (this.surface === "rightWall") {
      this.x = maxX;
      this.y -= v;
      if (this.y <= CEILING_Y) { this.y = CEILING_Y; this.surface = "ceiling"; }
    } else if (this.surface === "ceiling") {
      this.y = CEILING_Y;
      this.x -= v; this.facing = -1;
      if (this.x <= minX) { this.x = minX; this.surface = "leftWall"; }
      // 爬到玩家頭頂上方 → 落下突襲
      if (player?.active &&
          Math.abs((this.x + this.w / 2) - (player.x + player.w / 2)) < ROACH_DROP_TRIGGER) {
        this.mode = "fall";
        this.fallVY = 0;
      }
    } else { // leftWall
      this.x = minX;
      this.y += v;
      if (this.y + this.h >= FLOOR_Y) { this.y = FLOOR_Y - this.h; this.surface = "floor"; }
    }
  }

  draw(ctx) {
    // 依所在表面旋轉（fall/pause 視為地板向）
    const rot = this.mode !== "crawl" ? 0
              : this.surface === "rightWall" ? -Math.PI / 2
              : this.surface === "leftWall" ? Math.PI / 2
              : this.surface === "ceiling" ? Math.PI : 0;
    if (this.drawSprite(ctx, "enemy_cockroach", { rotate: rot })) return;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.scale(this.facing || 1, 1);
    // 扁橢圓身體（深棕）
    ctx.fillStyle = this.bodyColor("#4a2f1f");
    ctx.beginPath();
    ctx.ellipse(0, 0, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // 六足（爬行擺動）
    ctx.strokeStyle = this.bodyColor("#4a2f1f");
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      const sway = Math.sin(this.legTimer + i) * 3;
      ctx.beginPath();
      ctx.moveTo(i * 8, this.h / 2 - 2);
      ctx.lineTo(i * 8 + sway, this.h / 2 + 6);
      ctx.stroke();
    }
    // 觸鬚
    ctx.beginPath();
    ctx.moveTo(this.w / 2 - 4, -this.h / 2 + 2);
    ctx.lineTo(this.w / 2 + 8, -this.h / 2 - 6);
    ctx.moveTo(this.w / 2 - 2, -this.h / 2 + 3);
    ctx.lineTo(this.w / 2 + 10, -this.h / 2 - 2);
    ctx.stroke();
    ctx.restore();
    this.drawHPBar(ctx);
  }
}
```

（碰撞箱維持 30×16 AABB 不旋轉——牆上時略寬於視覺屬可接受誤差；`clampToRoom` 對四表面座標皆不越界，無需覆寫。）

- [ ] **Step 3: 老鼠叼道具跑**

常數：`MOUSE_GNAW_FRAMES` 改名換值，補逃跑參數：

```js
// M9 小偷化：啃 1 秒叼起逃跑；擊殺掉回、逾時帶走
const MOUSE_GRAB_FRAMES = 60;    // 接觸道具到叼起
const MOUSE_FLEE_MULT = 1.3;     // 叼跑速度倍率
const MOUSE_ESCAPE_FRAMES = 480; // 8 秒未擊殺 → 鑽牆帶走道具
const MOUSE_BLINK_FAST = 120;    // 消失前 2 秒道具加速閃爍
```

Mouse 換成（draw 的幾何身體不變，只加 drawCarried）：

```js
export class Mouse extends BaseEnemy {
  constructor(x) {
    super(x, FLOOR_Y - MOUSE_H, MOUSE_W, MOUSE_H, MOUSE_HP, MOUSE_SPEED, MOUSE_DMG);
    this.gnawTimer = 0;
    this.carrying = null;  // 叼著的道具（已自 room.items 移出）
    this.escapeT = 0;
  }

  findTargetItem() {
    return this.room?.items.find(i => i.active && i.itemId !== undefined) || null;
  }

  behave(dt, player) {
    this.y = FLOOR_Y - this.h;

    if (this.carrying) {
      // 叼著跑：遠離玩家；逾時鑽牆帶走（道具真消失，老鼠離場）
      this.state = "CHASE";
      this.escapeT -= dt;
      const dir = Math.sign((this.x + this.w / 2) - ((player?.x ?? this.x) + (player?.w ?? 0) / 2)) || 1;
      this.x += dir * this.speed * MOUSE_FLEE_MULT * dt;
      this.facing = dir;
      if (this.escapeT <= 0) {
        this.carrying = null;
        this.active = false; // 直接離場：不 emit enemyDied（無掉落、無擊殺特效）
      }
      return;
    }

    const item = this.findTargetItem();
    const target = item ?? player;
    if (!target) return;
    const tx = target.x + (target.w || 0) / 2;
    const dx = tx - (this.x + this.w / 2);

    if (item && Math.abs(dx) < 24) {
      // 啃 1 秒 → 叼起（道具暫離世界：不繪製、不可拾取）
      this.state = "ATTACK";
      this.gnawTimer += dt;
      if (this.gnawTimer >= MOUSE_GRAB_FRAMES) {
        item.active = false; // Room.update 會將其 splice 出 items
        this.carrying = item;
        this.escapeT = MOUSE_ESCAPE_FRAMES;
        this.gnawTimer = 0;
      }
      return;
    }

    this.state = "CHASE";
    this.gnawTimer = 0;
    const dir = Math.sign(dx) || 1;
    this.x += dir * this.speed * dt;
    this.facing = dir;
  }

  // 被擊殺：道具掉回腳下（重新入列 room.items）
  die() {
    if (this.carrying) {
      const it = this.carrying;
      it.active = true;
      it.x = this.x + this.w / 2 - (it.w || 16) / 2;
      it.y = FLOOR_Y - (it.h || 16);
      this.room?.items.push(it);
      this.carrying = null;
    }
    super.die();
  }

  // 叼著的道具畫在背上（閃爍提示；最後 2 秒加速閃）
  drawCarried(ctx) {
    if (!this.carrying) return;
    const period = this.escapeT < MOUSE_BLINK_FAST ? 8 : 20;
    if (Math.floor(this.escapeT / period) % 2 === 0) return;
    const it = this.carrying;
    it.x = this.x + this.w / 2 - (it.w || 16) / 2;
    it.y = this.y - (it.h || 16) + 4;
    it.draw?.(ctx);
  }

  draw(ctx) {
    if (this.drawSprite(ctx, "enemy_mouse")) { this.drawCarried(ctx); return; }
    // …原幾何身體（身體/耳朵/尾巴/眼）原樣保留…
    this.drawCarried(ctx);
  }
}
```

（draw 的幾何段照原檔複製，僅在 `this.drawHPBar(ctx);` 之後補 `this.drawCarried(ctx);`。）

- [ ] **Step 4: ChefBot 油漬區**

OilZone class 加在 ChefBot 之前：

```js
// ── 油漬滑區：踩到操控打滑（掛 room.items，同 InkZone 模式）──
const OIL_ZONE_FRAMES = 150, OIL_ZONE_W = 80;
export class OilZone extends Entity {
  constructor(x) {
    super(x - OIL_ZONE_W / 2, FLOOR_Y - 8, OIL_ZONE_W, 8);
    this.timer = OIL_ZONE_FRAMES;
  }

  update(dt, player) {
    if (!this.active) return;
    this.timer -= dt;
    if (this.timer <= 0) { this.active = false; return; }
    if (player?.active && rectsOverlap(this.hitbox, player.hitbox)) {
      player.applySlip?.(10); // 持續踩著就持續打滑
    }
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.globalAlpha = Math.min(0.6, this.timer / 50);
    ctx.fillStyle = "#3a3220"; // 油的暗黃褐
    ctx.beginPath();
    ctx.ellipse(this.x + this.w / 2, FLOOR_Y - 3, this.w / 2, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,220,120,0.25)"; // 油面高光
    ctx.beginPath();
    ctx.ellipse(this.x + this.w / 2 - 10, FLOOR_Y - 5, 10, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
```

ChefBot：constructor 加 `this.oilDrops = [];`；`behave` 末尾（fire 邏輯後）加追蹤；`sprayOil` 記錄子彈：

```js
  behave(dt, player) {
    this.state = "ATTACK";
    this.y = FLOOR_Y - this.h; // 固定站位
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = CHEF_FIRE_INTERVAL;
      this.sprayOil();
    }
    // M9：油滴失效（撞地/撞牆/命中）時，落點貼近地板的留油漬
    for (let i = this.oilDrops.length - 1; i >= 0; i--) {
      const b = this.oilDrops[i];
      if (b.active) continue;
      if (b.y >= FLOOR_Y - 20) this.room?.items.push(new OilZone(b.x + b.w / 2));
      this.oilDrops.splice(i, 1);
    }
  }

  sprayOil() {
    if (!this.room) return;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 3;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const b = new EnemyBullet(
        cx, cy,
        Math.cos(angle) * CHEF_BULLET_SPEED,
        Math.sin(angle) * CHEF_BULLET_SPEED,
        this.damage, 6,
      );
      this.room.enemyBullets.push(b);
      this.oilDrops.push(b); // M9：追蹤落點生成油漬
    }
  }
```

- [ ] **Step 5: 驗證**

換層到 F2。蟑螂：

```js
const r2 = game.floor.rooms.find(r => r.enemies.some(e => e.constructor.name === 'Cockroach'));
game.gotoRoom(r2.gridPos.x, r2.gridPos.y);
const roach = game.floor.currentRoom.enemies.find(e => e.constructor.name === 'Cockroach');
const surf = new Set();
for (let i = 0; i < 900; i++) { game.step(1); if (roach.active) surf.add(roach.surface + ':' + roach.mode); }
JSON.stringify([...surf]); // 期望含 floor/rightWall/ceiling/leftWall 的 crawl；站到牠下方等到 fall:… 出現
```

老鼠：找道具房或 eval 在 F2 房間 `room.items.push` 一個有 itemId 的道具 → step 觀察 `mouse.carrying` 變真、道具從 items 消失；`mouse.takeDamage(999)` → items 重新出現該道具。油漬：ChefBot 房 step 200+ 斷言 `room.items.some(i => i.constructor.name === 'OilZone')`，玩家走進油漬 `game.player.slipFrames > 0`。截圖 `m9_f2.jpg`（蟑螂在天花板＋油漬在地上的畫面）。

- [ ] **Step 6: Commit**

```bash
git add js/entities/enemies/F2Enemies.js js/entities/Player.js
git commit -m 'feat: M9-6 F2 行為強化——蟑螂全畫面爬行落下突襲、老鼠叼道具逃跑、廚師油漬滑區'
```

---

### Task 7: F3/F6 強化 — 流浪狗前搖撞牆暈＋燈籠鬼自爆衝刺

**Files:**
- Modify: `js/entities/enemies/F3Enemies.js`（StrayDog）
- Modify: `js/entities/enemies/F6Enemies.js`（Lantern）

- [ ] **Step 1: StrayDog 吠叫前搖＋撞牆自暈**

import 加 `Particles`：

```js
import { Particles } from "../../render/Particles.js";
```

常數加：

```js
// M9 衝撞可讀化
const DOG_BARK_FRAMES = 20;   // 吠叫前搖（壓低身體+揚塵）
const DOG_WALL_STUN = 30;     // 撞牆自暈（懲罰窗口）
```

constructor 加 `this.barkTimer = 0;`，`behave` 換成：

```js
  behave(dt, player) {
    this.y = FLOOR_Y - this.h;
    if (!player?.active) return;

    if (this.restTimer > 0) {
      this.restTimer -= dt;
      this.state = "IDLE";
      this.facing = Math.sign(player.x - this.x) || 1;
      if (this.restTimer <= 0) {
        this.barkTimer = DOG_BARK_FRAMES; // 喘息結束 → 吠叫前搖
        this.chargeDir = this.facing;     // 此刻鎖定衝撞方向
      }
      return;
    }

    if (this.barkTimer > 0) {
      // 吠叫前搖：方向已鎖、壓低身體（進 ATTACK 觸發 atkSquash）、腳下揚塵
      this.state = "ATTACK";
      this.barkTimer -= dt;
      if (Math.floor(this.barkTimer) % 6 === 0) {
        Particles.burst({
          x: this.x + this.w / 2 - this.chargeDir * 14, y: FLOOR_Y - 2,
          count: 2, color: "#6e5a46", speed: 1.5, grav: 0.12,
        });
      }
      return;
    }

    this.state = "CHASE";
    this.x += this.chargeDir * this.speed * dt;
    this.facing = this.chargeDir;
    // 撞牆 → 自暈（誘導撞牆的打法成立）＋ 喘息
    if (this.x <= WALL_THICKNESS || this.x + this.w >= CANVAS_W - WALL_THICKNESS) {
      this.applyStun(DOG_WALL_STUN);
      this.restTimer = DOG_REST_FRAMES;
      Particles.burst({
        x: this.chargeDir > 0 ? CANVAS_W - WALL_THICKNESS : WALL_THICKNESS,
        y: this.y + this.h / 2, count: 6, color: "#6e5a46", speed: 2.5,
      });
    }
  }
```

（`update` 的接觸擊退覆寫不動——撞到玩家仍直接進喘息。）

- [ ] **Step 2: Lantern 自爆衝刺**

常數加：

```js
// M9 自爆化：貼近轉紅加速衝刺，接觸或逾時自爆（=既有死亡四向彈）
const LANTERN_FUSE_DIST = 120;       // 觸發距離
const LANTERN_FUSE_FRAMES = 60;      // 引信（逾時自爆）
const LANTERN_FUSE_SPEED_MULT = 2.2; // 衝刺加速
```

constructor 加 `this.fusing = false; this.fuseT = 0;`，`behave` 換成：

```js
  behave(dt, player) {
    this.swing += 0.07 * dt;
    if (!player?.active) return;
    const dx = (player.x + player.w / 2) - (this.x + this.w / 2);
    const dy = (player.y + player.h / 2) - (this.y + this.h / 2);
    const dist = Math.hypot(dx, dy) || 1;

    if (this.fusing) {
      // 自爆衝刺：直線加速撲向玩家；接觸或引信燒完即自爆
      this.state = "ATTACK";
      this.fuseT -= dt;
      this.x += (dx / dist) * this.speed * LANTERN_FUSE_SPEED_MULT * dt;
      this.y += (dy / dist) * this.speed * LANTERN_FUSE_SPEED_MULT * dt;
      if (this.fuseT <= 0 || rectsOverlap(this.hitbox, player.hitbox)) {
        this.die(); // die() 已有四向爆裂彈 → 自爆共用同一條路
      }
      return;
    }

    this.state = "CHASE";
    this.x += (dx / dist) * this.speed * dt;
    this.y += (dy / dist) * this.speed * dt + Math.sin(this.swing) * 0.8 * dt;
    if (dist < LANTERN_FUSE_DIST) { this.fusing = true; this.fuseT = LANTERN_FUSE_FRAMES; }
  }
```

draw 改兩處——sprite 路徑疊紅色警示光暈、幾何路徑燈身換色：

```js
  draw(ctx) {
    if (this.drawSprite(ctx, "enemy_lantern")) {
      if (this.fusing) { // 紅色警示光暈（自爆預警）
        ctx.save();
        ctx.globalAlpha = 0.4 + Math.sin(this.swing * 6) * 0.2;
        ctx.fillStyle = "#ff3a2a";
        ctx.beginPath();
        ctx.arc(this.x + this.w / 2, this.y + this.h / 2, this.w * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      return;
    }
    // …幾何路徑：燈籠身（暖橘光）兩行改為…
    const bodyGlow = this.fusing ? "#ff3a2a" : "#ff9d42";
    ctx.fillStyle = this.bodyColor(bodyGlow);
    ctx.shadowColor = bodyGlow;
    // …其餘原樣…
  }
```

（`rectsOverlap` 在 F6Enemies.js 已 import；`die()` 的四向爆裂不動。）

- [ ] **Step 3: 驗證**

F3：狗房 step 觀察循環 `IDLE(喘息) → ATTACK(吠叫+揚塵) → CHASE(衝撞)`；衝到牆邊斷言 `dog.stunFrames > 0`。F6：燈籠房控制貓走近 120px 內（gotoRoom 後 eval 直接 `game.player.x = lantern.x - 100`）→ step 斷言 `lantern.fusing === true`，續 step ~60f 斷言 `!lantern.active` 且 `room.enemyBullets.length >= 4`（自爆四向彈）。遠程擊殺路徑：另一隻燈籠用 `takeDamage(999)` 確認也正常爆裂。截圖 `m9_f3_f6.jpg`。

- [ ] **Step 4: Commit**

```bash
git add js/entities/enemies/F3Enemies.js js/entities/enemies/F6Enemies.js
git commit -m 'feat: M9-7 F3/F6 強化——流浪狗吠叫前搖+撞牆自暈、燈籠鬼轉紅自爆衝刺'
```

---

### Task 8: 整合驗收＋HANDOFF

**Files:**
- Modify: `HANDOFF.md`（§2 進度表加 M9 列）

- [ ] **Step 1: 全樓層煙霧**

依 HANDOFF §5：reload → Enter → 逐層 `EventBus.emit('requestNextFloor')`，每層 `game.floor.rooms` 逐房 `game.gotoRoom` ＋ `game.step(30)`。期望：零 console error、`game.step` 不變慢（土層烘焙＋大招特效僅釋放期繪製）。

- [ ] **Step 2: 大招專項回歸**

任一戰鬥房：集滿 EX → L → 驗證四階段、結算傷害、EX 歸零再集氣；面對牆放、Boss 房放各一次。普通射擊/蓄力/雷射道具（撿到時）不噴錯。

- [ ] **Step 3: 行為專項抽查**

F1 麻雀俯衝＋鴿子鐘擺、F2 蟑螂天花板落下＋老鼠叼跑擊殺掉回＋油漬打滑、F3 狗撞牆暈、F6 燈籠自爆，各跑一遍（用 Task 5-7 的 eval 斷言）。其餘 11 隻抽 3 隻（垃圾桶怪/書魂/靈狐）確認行為與改前一致。

- [ ] **Step 4: 視覺巡檢**

F1/F2/F5 各截 `m9_final_f<N>.jpg`：底帶 80px＋土層質感、S 門柵欄兩態、整體前景語言一致。發現比例違和直接調 `FrameSilhouette.js`/`Door.js` 常數重驗。

- [ ] **Step 5: 更新 HANDOFF.md**

§2 進度表 M8 列後新增：

```markdown
| **M9 行為強化＋居合大招＋底帶土層＋排水柵**（7 怪行為循環/黑白居合/FLOOR_Y 426/S 門柵欄光柱） | ✅ 程式面完成，待真人試玩 | （填實際 commit 範圍） |
```

- [ ] **Step 6: Commit**

```bash
git add HANDOFF.md
git commit -m 'feat: M9-8 整合驗收通過——全樓層煙霧+大招回歸+行為抽查+視覺巡檢，HANDOFF 更新'
```

---

## 驗收總表（對照規格 §7）

| 規格驗收項 | 對應 Task |
|---|---|
| 7 隻新行為逐隻實測＋11 隻不動 | Task 5-7 各驗證步 ＋ Task 8 Step 3 |
| 大招四階段/走廊結算/Boss 不定格/撞牆停/緩衝無敵 | Task 4 Step 6 ＋ Task 8 Step 2 |
| 底帶 80px＋跳躍鏈＋無寫死殘留 | Task 1 Step 2-3 |
| S 門柵欄兩態＋樓層光色 | Task 3 Step 4 |
| 零邏輯回歸（門/子彈/拾取） | Task 8 Step 1 |
| 效能（烘焙化＋大招限時繪製） | Task 8 Step 1 |

## 注意事項

- 部署（push `main`＋`gh-pages`）**不在本計畫內**——等真人試玩驗收後由使用者決定。
- commit 訊息不可含雙引號；中文檔一律用 Write/Edit 工具改，禁用 PowerShell 管線。
- Task 4 與 Task 5 都動 `BaseEnemy.js` 的同一行 filter——Task 5 的版本是最終態（含 `telegraphFlash`），按順序執行不衝突。
