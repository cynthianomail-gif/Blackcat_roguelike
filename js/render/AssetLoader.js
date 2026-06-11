// =====================================================
// AssetLoader.js — 預載入 Higgsfield 圖片
// 所有 draw() 必須同時支援：有圖用圖，無圖用幾何圖形。
// 不可因素材缺失導致崩潰。
// =====================================================

export const ASSETS = {
  // Higgsfield P1 素材（M3 里程碑）
  player_idle:      "assets/images/sprites/cat_idle.png",
  player_jump:      "assets/images/sprites/cat_jump.png",
  boss_feathertop:  "assets/images/sprites/boss_feathertop.png",
  boss_roachmaster: "assets/images/sprites/boss_roachmaster.png",
  boss_ratking:     "assets/images/sprites/boss_ratking.png",
  boss_ninetails:   "assets/images/sprites/boss_ninetails.png",

  // Higgsfield P2 素材（M4 里程碑）── 其餘 9 個 Boss
  boss_antenna:     "assets/images/sprites/boss_antenna.png",
  boss_potfiend:    "assets/images/sprites/boss_potfiend.png",
  boss_dogfather:   "assets/images/sprites/boss_dogfather.png",
  boss_raincat:     "assets/images/sprites/boss_raincat.png",
  boss_steamroller: "assets/images/sprites/boss_steamroller.png",
  boss_tomegod:     "assets/images/sprites/boss_tomegod.png",
  boss_librarian:   "assets/images/sprites/boss_librarian.png",
  boss_gateguardian:"assets/images/sprites/boss_gateguardian.png",
  boss_chaoswanderer:"assets/images/sprites/boss_chaoswanderer.png",

  // M4 ── 18 個敵人剪影（每層 3 個）
  enemy_pigeon:    "assets/images/sprites/enemy_pigeon.png",
  enemy_sparrow:   "assets/images/sprites/enemy_sparrow.png",
  enemy_fatpigeon: "assets/images/sprites/enemy_fatpigeon.png",
  enemy_cockroach: "assets/images/sprites/enemy_cockroach.png",
  enemy_mouse:     "assets/images/sprites/enemy_mouse.png",
  enemy_chefbot:   "assets/images/sprites/enemy_chefbot.png",
  enemy_straydog:  "assets/images/sprites/enemy_straydog.png",
  enemy_ghost:     "assets/images/sprites/enemy_ghost.png",
  enemy_trashcan:  "assets/images/sprites/enemy_trashcan.png",
  enemy_giantrat:  "assets/images/sprites/enemy_giantrat.png",
  enemy_boxbot:    "assets/images/sprites/enemy_boxbot.png",
  enemy_eliterat:  "assets/images/sprites/enemy_eliterat.png",
  enemy_booksoul:  "assets/images/sprites/enemy_booksoul.png",
  enemy_inkpus:    "assets/images/sprites/enemy_inkpus.png",
  enemy_compass:   "assets/images/sprites/enemy_compass.png",
  enemy_spiritfox: "assets/images/sprites/enemy_spiritfox.png",
  enemy_lantern:   "assets/images/sprites/enemy_lantern.png",
  enemy_komainu:   "assets/images/sprites/enemy_komainu.png",

  // M4 ── 六層視差背景（F7 沿用 bg_f6）
  bg_f1: "assets/images/backgrounds/bg_f1.png",
  bg_f2: "assets/images/backgrounds/bg_f2.png",
  bg_f3: "assets/images/backgrounds/bg_f3.png",
  bg_f4: "assets/images/backgrounds/bg_f4.png",
  bg_f5: "assets/images/backgrounds/bg_f5.png",
  bg_f6: "assets/images/backgrounds/bg_f6.png",
};

let loaded = {};

// 原圖 2048px；角色/Boss 遊戲內最大顯示約 150px → 縮到 512；
// 背景要鋪滿 900px 畫布（含視差超掃描）→ 留 1280。
const MAX_DIM = 512;
const MAX_DIM_BG = 1280;
function downscale(img, maxDim = MAX_DIM) {
  if (Math.max(img.width, img.height) <= maxDim) return img;
  const s = maxDim / Math.max(img.width, img.height);
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * s);
  c.height = Math.round(img.height * s);
  const cctx = c.getContext("2d");
  cctx.imageSmoothingQuality = "high";
  cctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

export async function loadAllAssets() {
  loaded = {};
  await Promise.all(Object.entries(ASSETS).map(([key, src]) =>
    new Promise((res) => {
      const img = new Image();
      img.onload = () => { loaded[key] = downscale(img, key.startsWith("bg_") ? MAX_DIM_BG : MAX_DIM); res(); };
      img.onerror = () => { loaded[key] = null; res(); }; // fallback 幾何圖形
      img.src = src;
    })
  ));
  return loaded;
}

// 取得已載入圖片；無圖回傳 null，呼叫端使用幾何 fallback
export function getAsset(key) {
  return loaded[key] || null;
}
