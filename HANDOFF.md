# 黑貓流浪記 — 交接文件（2026-06-12）

> 給接手的開發者／Claude Code 帳號。本文件是唯一的跨帳號交接來源，
> 涵蓋進度、架構、素材管線、測試方法與已知偏差。規格細節請對照三份 docx。

## 1. 專案概況

LIMBO/BADLAND 風格 2D Roguelike，純前端（Canvas + ES Module，無建置工具）。
入口 `index.html`，本地開 server 即可跑（任何 static server，preview 設定在 `.claude/launch.json`，port 8765）。

規格驅動開發，三份文件在 repo 根目錄：
- `黑貓流浪記_企畫書_v2.0_Roguelike.docx`（**內容已更新至 v2.1**：美術方向改版＋里程碑進度標記）
- `黑貓流浪記_技術規格書_v1.0.docx`（Section 8 列 Task 1-13，各有驗收清單與指定 commit 訊息）
- `黑貓流浪記_音訊規格書_v1.0.docx`（Audio-1~4）
- 純文字版在 `_tmp/*.txt`（已同步）；若遺失可從 docx 解 zip 取 `word/document.xml` 去標籤重生（**環境無 pandoc、無 Python**）

## 2. 進度狀態

| 里程碑 | 狀態 | Commit |
|---|---|---|
| M1 可玩骨架 / M2 Roguelike 核心（Task 1-13） | ✅ | `679fc10` |
| M3 音訊系統（AudioManager + 22 SFX） | ✅ | `3716fc9` |
| M3 P1 美術（黑貓 + 4 Boss） | ✅ | `4c0b2fd` |
| M4 六層擴充（6 背景 + 13 Boss + 18 敵人全 sprite） | ✅ | `425cfa8` `c4fa9ed` |
| Audio-3 BGM（8 首 Suno MP3 整合驗證） | ✅ | `d79331a` |
| **美術方向改版（BADLAND 式）** | ✅ | `f5be1b8` |
| M5 道具完整（100 道具＋10 Synergy 全量驗證） | ✅ 驗證通過（無程式變更） | — |
| **M5.5 平台系統＋姿態擴充**（單向跳台/北門可達/趴下/下穿/跑步動畫/爬牆貼圖） | ✅ | `2787c81` |
| M6 平衡＋全流程＋Audio-4 | ⬜ **需真人試玩**，剩餘工作見 §7 |

## 3. 美術方向（v2.1，已取代企畫書 7.1 原則）

- **背景**：發光彩色（BADLAND 式），整張含底部都明亮、禁止純黑區域。每層色調：F1 金色日出／F2 暖橘廚房／F3 青藍雨夜／F4 鏽橘工業／F5 金色燭光／F6 紫青月光（F7 沿用 F6，BGM 同）
- **前景＝純黑**：角色、敵人、Boss 黑剪影；地板牆面 `#101014`。黑色=可互動的視覺語言
- **子彈**：亮核心＋3px 粗黑邊（亮背景靠黑邊讀、黑前景靠亮核心讀）；玩家彈黑核心白邊
- 改版原因：原 LIMBO 全剪影風格中角色會融進背景黑色區，玩家看不到自己
- 敵人 sprite 有 0.30 淡白 rim glow（`BaseEnemy.drawSprite`）；受傷白閃用 `invert(1)` filter

## 3b. 平台系統（M5.5，2026-06-12）

背景：原版北門（天花板開口）物理上進不去——跳躍最高升 141px（`13²/(2×0.6)`），
從地板（y=356）最高到 y≈215，北門觸發需 y≤61；空中怪（y≈120–280）也打不到（子彈只能水平射）。

- `js/world/Platform.js`：單向跳台。**只有玩家會碰撞**；子彈/敵人/跟班全穿透（跟班是 lerp 跟隨無地形碰撞，貓咪軍團等技能不受影響）
- 有 N 門的房間保證階梯：TIER1（y=280，左右隨機）→ TIER2（y=170，北門正下方）→ 跳起貼天花板進北門；NORMAL/CHALLENGE/BOSS 無 N 門也有一座戰術平台（站高打空中怪）
- 操作：S/↓ 趴下（碰撞箱 44→26、速度 ×0.45）；平台上趴+W＝下穿；**S 門（地板開口）改為須按住 S/↓ 才下樓**——否則經 N 門進房會落在對面 S 門上被立刻彈回（出生點也踩著 S 門）
- N 門觸發放寬：向下 12px 寬容帶＋僅上升中（vy≤0）觸發
- 姿態貼圖：`cat_run1/run2`（跑步兩幀，8f 交替）、`cat_crouch`（趴下）、`cat_climb`（空中貼牆推方向時顯示）；prompt 在 `_tmp/gen_poses.sh`，常數在 Constants.js「2.2b 平台 & 姿態」區

## 4. 素材管線（Higgsfield）

- 帳號：`cynthianomail@gmail.com`（PLUS 方案，2026-06-12 餘額約 910 credits）；CLI：`higgsfield`，模型用 `nano_banana_2`
- 生成腳本（含全部 prompt，可直接重跑）：`_tmp/gen_bg_badland.sh`（現行背景）、`_tmp/gen_boss.sh`、`_tmp/gen_enemy.sh`、`_tmp/gen_bg.sh`（舊版 LIMBO 背景，已棄用）
- **角色剪影配方**：`plain solid white background, flat solid pure black silhouette, no shadows no glow`（寫 transparent background 會生出假棋盤格）
- **去背管線** `_tmp/imgproc/`（node + pngjs）：`pad.js`（補 16px 白邊，**必跑**——剪影觸到圖邊時 dekey 會把黑色本體誤判為背景）→ `dekey.js flood` → `pass2.js`（連通元件清殘渣）
- 背景不需去背，直接縮到 1280px PNG（PowerShell System.Drawing）放 `assets/images/backgrounds/`
- `AssetLoader.js`：素材 key 前綴 `bg_` 縮放上限 1280、其餘 512；**有圖用圖、無圖幾何 fallback**，素材缺失不會崩潰

## 5. 測試方法（Claude Code 無頭驗證）

- 全域掛載 `window.game`：`game.step(n)` 確定性逐幀（背景分頁 rAF 不跑、`preview_screenshot` 會逾時、fps=0 正常）、`game.gotoRoom(x,y)`、`game.generateFloor`
- 模擬輸入：`new KeyboardEvent('keydown', { code: 'Enter' })` **dispatch 到 window、用 `code` 不是 `key`**（M 鍵靜音例外，掛在 document 用 `key`）；記得發 keyup
- 換層：`EventBus.emit('requestNextFloor')`（eval 內 `await import('/js/core/EventBus.js')`）
- 截圖：起 `node _tmp/snapshot_server.js`（port 8766，CORS 全開），eval 內 `canvas.toDataURL` 後 `fetch POST http://localhost:8766/<name>` 存 `_tmp/snaps/<name>.jpg`——**不要直接 return base64**（會塞爆對話）
- 每次 reload 換隨機 seed，房間配置會變，測試要動態找目標房（`floor.rooms.find(r => r.type === ROOM_TYPES.BOSS)`，格子座標在 `room.gridPos`）
- M5 驗證方法可重跑：逐道具 `itemManager.pickup(id)` 前後 diff player/gm 原始屬性快照；Synergy 逐組湊齊驗 `im.synergies` ＋ `synergyActivated` 事件

## 6. 規格偏差（DEMO 簡化，皆為刻意決策）

- 82 精準飛爪：自動鎖定最高 HP 敵人（規格為手動準星 2s）
- 66 窺視眼球：接觸傷害每 12 幀一跳（規格逐幀 5 傷會秒殺）
- 主動道具：拾取即滿充能、清房 +1（規格充能規則簡化）
- AudioEvents.js 集中訂閱 EventBus（規格要求散在各檔，集中接線較好維護）
- F7 最終層：背景與 BGM 沿用 F6 神社（規格未定義 F7 素材）
- M5.5 平台/趴下/下穿/S 門意圖判定為規格外新增功能（使用者要求）；企畫書 docx 尚未補記，M6 文件收尾時一併更新

## 7. 剩餘工作（M6）

1. **真人試玩平衡**：數值（敵人 HP/傷害縮放在 `Constants.js` 的 `ENEMY_HP_SCALE`/`BOSS_HP_SCALE`）需體感回饋再調
2. **Audio-4 最終驗收**：完整遊玩一局確認 SFX 時機、低幀率下音效不重複觸發
3. **UI 配色打磨**（建議）：HUD／門／商店道具框還是樸素幾何，與新版發光背景檔次落差大
4. 全流程測試 + 最終輸出

## 8. 已知小坑

- PowerShell 5.1：`Expand-Archive` 不吃 .docx 副檔名（先改名 .zip）；`ZipFile::CreateFromDirectory` 會產生反斜線 entry（docx 重打包要手動用正斜線 entry name）
- git 警告 LF→CRLF 屬正常；commit author 未設定（沿用機器帳號）
- `_tmp/`、`.claude/skills/`、`skills-lock.json` 刻意不進版控；`_tmp/企畫書_backup_v2.0.docx` 是改版前備份
