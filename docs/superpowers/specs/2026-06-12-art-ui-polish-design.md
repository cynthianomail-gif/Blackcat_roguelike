# M7：美術/UI 精緻化 — 設計規格

日期：2026-06-12
狀態：使用者已核准設計方向（剪影精修＋程序式動畫＋Boss 第二幀＋UI 全套＋等比滿版）

## 背景與目標

M6 後遊戲機制完整、已上線 GitHub Pages，但視覺粗糙：

- 網頁不是滿版（canvas 固定 900×506 置中）
- 怪物只有一張靜態 PNG，僅左右翻面，完全不會動
- HUD/選單全是程式畫的幾何圖形＋系統字體 sans-serif
- 主選單的貓是程式畫的，與遊戲內 PNG 素材不一致

目標：不動任何遊戲邏輯與平衡，純表現層升級，讓整體質感上一個檔次。

## 已拍板的方向決策

| 決策點 | 結論 | 理由 |
|---|---|---|
| 美術風格 | 剪影精修版（黑剪影＋發光眼＋冷藍 rim light＋毛流） | 看過 4 種風格樣張後選定（樣張在 `_tmp/style_samples/`）；與現有背景、黑貓主角零違和，重產風險最低 |
| 怪物動畫 | 程序式動畫打底＋Boss 加第二幀（攻擊幀） | 單圖即可全體生效；Boss 是視覺焦點值得加幀 |
| UI 範圍 | 全套：字型＋HUD＋主選單 key art＋轉場 | — |
| 滿版方式 | 等比放大留黑邊＋動態渲染解析度 | 不動遊戲判定；拉伸變形與擴大遊戲區域皆否決 |
| 去背方式 | 白底反解（封閉解），非 AI 去背 | 黑剪影＋白底為高對比情境，alpha 可逐像素精確反算；已實測無白邊（見下） |

## 1. 網頁滿版

- 遊戲內部邏輯解析度維持 900×506，所有判定、座標、平衡不變。
- canvas 依視窗等比縮放鋪滿，短邊貼齊、長邊留黑（letterbox）。
- 實際渲染解析度 = 900×506 × 縮放比 × devicePixelRatio，透過 `ctx.setTransform` 統一放大，放大後線條與文字保持銳利。
- 監聽 `resize`，HUD 座標體系不變（仍以 900×506 邏輯座標繪製）。

## 2. 怪物素材重產（31 張＋13 張 Boss 攻擊幀＋1 張 key art）

### 風格 prompt 基準（已驗證，樣張 1）

> Redraw this <怪物描述> game enemy sprite in refined silhouette style: pure black
> silhouette body keeping the exact same pose, add glowing pale-yellow eye(s),
> subtle cold blue rim light along the back and fur edges, wispy jagged fur
> texture, dark fairytale mood like the game Limbo. Side view, full body, game
> sprite asset on plain white background, no other objects.

- 模型：`nano_banana_2`（Nano Banana Pro，角色/風格化首選）。
- 每隻以**現有剪影 PNG 當參考圖**（`--image`），姿勢不變、只加質感 → 遊戲碼免改、碰撞箱不變。
- Boss 每隻多產一張攻擊幀（張嘴/撲擊/前傾姿勢），命名 `boss_<name>_atk.png`。
- 發光眼顏色可依怪物主題微調（如鬼魂用冷白、狐用金）。

### 去背管線（已實測通過）

Higgsfield 模型無原生透明輸出參數（已查 `gpt_image_2`、`nano_banana_2` schema 確認）。
採「白底反解」：把白色視為合成底色，逐像素反算 alpha 與原色：

```
觀察色 C = 前景 F × a + 255 × (1 − a)
a = 1 − min(r,g,b)/255   （深色主體至少一個通道為深 → 成立）
F = (C − 255×(1−a)) / a
```

- 對黑剪影是封閉解而非估計：抗鋸齒毛邊得到正確半透明值，無白邊、無鋸齒。
- 已用樣張 1 實測疊上 bg_f3 確認（`_tmp/style_samples/1_in_game_test.png`）。
- 腳本：`_tmp/bgremove/unwhite.js`（pngjs），實作時移入 `tools/unwhite.js` 並加批次模式。
- 每張產出後人工目視確認（姿勢、風格一致性、去背品質），不合格重抽；
  預算 45 次生成＋重抽餘裕，總計 60 次內。

## 3. 程序式動畫

在 `BaseEnemy.drawSprite` 加一層動畫變換（錨點＝腳底中心，現有繪製已底部對齊）：

| 狀態 | 效果 |
|---|---|
| IDLE | 呼吸：縱向 ±2% 緩慢正弦縮放 |
| 移動（地面） | 上下小彈跳＋朝移動方向微傾 |
| 移動（飛行） | 拍翅式上下擺動（幅度較大、頻率較高） |
| ATTACK 前搖 | 壓扁蓄力（squash）；Boss 同時切攻擊幀 |
| ATTACK 出手 | 瞬間拉伸（stretch）回彈 |
| HURT | 保留白閃＋小幅抖動 |
| DEAD | 壓扁溶解（alpha 漸消＋縱向塌縮）＋粒子爆散，不再瞬間消失 |

- 參數（振幅/頻率/是否飛行）由各敵人子類宣告，預設值合理即可全體生效。
- 玩家手感補強：落地壓扁回彈、衝刺殘影、落地與衝刺揚塵。
- 相位用個體隨機 offset，避免整房怪同步呼吸。

## 4. 粒子系統

單一 `ParticleSystem`（物件池、上限封頂）：

- 死亡爆散（黑色碎片＋少量眼色光點）
- 子彈命中火花
- 金幣撿取閃光
- 揚塵（玩家落地/衝刺）

## 5. UI 全套打磨

- **字型**：自架開源中文字型「jf open 粉圓」（justfont，OFL 可商用，繁中完整），
  放 `assets/fonts/`，以 FontFace API 載入完成後才開始繪製，取代所有 sans-serif。
- **HUD**：
  - 心形：描邊＋高光；受傷時心跳一下；低血量（≤1 顆）持續脈動
  - 金幣/炸彈/鑰匙圖示加質感；數量變動時數字彈跳
  - Boss 血條：名牌底框＋雙層漸變
- **主選單**：Higgsfield 產主視覺 key art（夜色屋頂上的紅領結黑貓，構圖預留標題區），
  取代程式畫的貓；標題用新字型＋層次陰影。死亡/通關/暫停畫面同步換字型＋簡單裝飾。
- **轉場**：
  - 過門：約 0.3s 淡出淡入
  - 新樓層：字卡「F3・後巷」淡入→停留→淡出（樓層名取自既有 Constants）

## 6. 驗收

1. 全程零邏輯更動：現有 smoke test 必須維持綠燈。
2. preview 逐項目視：滿版縮放（拉視窗大小）、六層各怪動畫、Boss 攻擊幀切換、
   HUD 動效、死亡溶解、轉場字卡、字型載入。
3. 使用者上線上版玩一輪驗手感（與既有的平衡試玩合併進行）。

## 不做的事（本次範圍外）

- 不動遊戲邏輯、數值、碰撞箱、關卡生成
- 不擴大遊戲可視區域（滿版只做等比縮放）
- 小怪不做多幀動畫（只有 Boss 加攻擊幀）
- 背景 6 張不重產（現有品質已足夠）
- 數值平衡調整另案處理（等真人試玩回饋）
