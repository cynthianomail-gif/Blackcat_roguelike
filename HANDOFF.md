# 黑貓流浪記 — 交接文件（2026-06-12）

> 給接手的開發者／Claude Code 帳號。本文件是唯一的跨帳號交接來源，
> 涵蓋進度、架構、素材管線、測試方法與已知偏差。規格細節請對照三份 docx。

## 1. 專案概況

LIMBO/BADLAND 風格 2D Roguelike，純前端（Canvas + ES Module，無建置工具）。
入口 `index.html`，本地開 server 即可跑（任何 static server，preview 設定在 `.claude/launch.json`，port 8765）。

**線上版（GitHub Pages）**：<https://cynthianomail-gif.github.io/Blackcat_roguelike/>
remote `origin` = `https://github.com/cynthianomail-gif/Blackcat_roguelike.git`；本地分支 `master` 推 `main`（程式碼）＋ `gh-pages`（Pages 來源）。
**部署＝兩個分支都推**：`git push origin master:main master:gh-pages`（程式全相對路徑，子路徑下可直跑）。

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
| **M7 美術/UI 打磨**（滿版縮放/怪物程序動畫/粒子/字型/HUD/轉場/31 怪剪影精修/Boss 攻擊幀/key art） | ✅ 程式面完成，**真人視覺驗收後再部署** | `f1b62b4`…`7b57428`（13 commits） |

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
- 生成腳本（含全部 prompt，可直接重跑）：`_tmp/gen_bg_badland.sh`（現行背景）、`_tmp/gen_m7_enemies.sh`／`_tmp/gen_m7_bosses.sh`（**現行怪物剪影精修**，M7）、`_tmp/gen_boss.sh`、`_tmp/gen_enemy.sh`、`_tmp/gen_bg.sh`（舊版，已棄用）
- **剪影精修配方（M7 現行）**：`Redraw this <描述> in refined silhouette style: pure black silhouette keeping the exact same pose, add glowing <色> eye(s), subtle cold blue rim light, wispy textured edges, dark fairytale mood like Limbo … plain solid white background`，參考圖 `--image` 傳現有 sprite 鎖姿勢；Boss 攻擊幀以**新本體**當參考。攻擊幀對「載具/姿勢已張揚」的角色容易照抄原圖——prompt 要描述具體輪廓劇變（如 LEAPING airborne 45 degrees／mechanical arm SWINGS THE ROLLER UP），蟑螂王/壓路機各重試 3-4 次才過
- **去背工具（M7 現行）**：`tools/unwhite.js`（白底反解：外部 flood＋邊緣帶反解 alpha，輸出裁回原尺寸）——取代舊 `_tmp/imgproc/` flood 管線（pad/dekey/pass2 已棄用）
- **坑：higgsfield `result_url` 偶爾回 JPEG（不論副檔名）**，pngjs 會炸 `unrecognised content`——先驗 magic bytes（`FF D8`=JPEG），用 PowerShell `System.Drawing` Image.Save 轉真 PNG 再過 unwhite
- **角色剪影配方（舊版字卡）**：`plain solid white background, flat solid pure black silhouette, no shadows no glow`（寫 transparent background 會生出假棋盤格）
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

M6 pass 2 已完成（2026-06-12）——**炸彈＋隱藏房系統補完**（原規格註記「門待炸彈系統」的缺口）：
- B 鍵放置炸彈（`js/items/PlacedBomb.js`，活在 room.items）：1.5s 引信、爆風半徑 110、對敵 10 傷（Boss 也吃）、玩家在範圍內扣 1（吃無敵幀）、Camera shake＋explosion SFX（新 preset）
- 爆風圓與 `Door.rectFor(dir)` 重疊且該方向鄰格是 SECRET → 雙向建門（戰鬥中炸開＝清怪後才開）；炸彈有重力且**會停在跳台上**——北側隱藏房要把炸彈帶上 TIER2 炸天花板
- RoomGenerator：北側是隱藏房的房間、與上方有房的隱藏房自身，都預置階梯（兼當提示）；隱藏房 isRevealed 在炸開時設定
- 驗證：北側隱藏房全流程（階梯→TIER2 放彈→開門→跳入→4 道具）✓；PLAYER_DEAD 流程 ✓；console 乾淨
- 另新增 README.md（線上遊玩連結＋操作表＋docs/ 截圖）

M6 pass 1 已完成（`86dd415`，2026-06-12）：
- ✅ 全流程煙霧測試：F1–F7 每房間無頭巡訪零錯誤；F7 Boss 擊殺 → RUN_CLEAR 驗證通過
- ✅ UI 配色打磨：門改 BADLAND 發光語言（開=金框暖光脈動、鎖=紅色發光閘欄；原黑門疊黑牆不可讀）；愛心每排 12 顆換行；商店提示上移；S 門 rect 高度 typo 修正（CANVAS_W→CANVAS_H）
- ✅ Audio-4 程式面：playSFX 加 35ms 同名合併窗（多彈同幀命中不疊加爆音）

M7 已完成（2026-06-12，計畫在 `docs/superpowers/plans/2026-06-12-m7-art-ui-polish.md`）：滿版等比縮放、怪物程序式動畫、粒子特效、jf open 粉圓字型、HUD 打磨、換房/換層轉場字卡、18 小怪＋13 Boss 剪影精修重產（發光眼＋rim light）、13 Boss 攻擊幀（出手切幀＋前搖蓄力 squash）、主選單 key art。整合驗收過：F1–F7 煙霧測試零錯誤、~0.1ms/幀、三種視窗尺寸等比置中、console 乾淨。

剩餘（需真人）：
1. **真人試玩平衡**：數值旋鈕在 `Constants.js`（`ENEMY_HP_SCALE` 2.5／`BOSS_HP_SCALE` 1.6）。無頭估算（單一 seed）：普通房 HP/房 F1≈59→F7≈180，對照目標 15–30s 大致在帶內；**F6 偏輕（≈86 HP/房）**、F1 Boss 變體上緣（352 HP）可能拖長，以體感為準
2. **Audio-4 真人驗收**：開聲音完整玩一局確認 SFX 時機/音量（含新 explosion）
3. 平台手感（M5.5 新增）＋炸彈/隱藏房手感（M6 pass 2 新增）
4. ~~M7 真人視覺驗收後部署~~ ✅ 已部署（2026-06-12，使用者指示直接上線）：<https://cynthianomail-gif.github.io/Blackcat_roguelike/>
5. ~~文件收尾~~ ✅ 企畫書 docx 已更新 v2.2（里程碑表補 M5.5/M7 列＋M6 狀態、文末新增「10. 開發補記」四小節；備份 `_tmp/企畫書_backup_v2.1.docx`、編輯腳本 `_tmp/edit_plan_docx_v22.js`）。**若真人試玩後調了平衡數值，記得回寫 10.4 小節**

## 8. 已知小坑

- PowerShell 5.1：`Expand-Archive` 不吃 .docx 副檔名（先改名 .zip）；`ZipFile::CreateFromDirectory` 會產生反斜線 entry（docx 重打包要手動用正斜線 entry name）
- git 警告 LF→CRLF 屬正常；commit author 未設定（沿用機器帳號）
- `_tmp/`、`.claude/skills/`、`skills-lock.json` 刻意不進版控；`_tmp/企畫書_backup_v2.0.docx` 是改版前備份
