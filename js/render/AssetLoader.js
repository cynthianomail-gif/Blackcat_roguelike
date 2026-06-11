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
};

let loaded = {};

// 原圖 2048px，遊戲內最大顯示約 150px；預縮放避免每幀大圖縮放的開銷
const MAX_DIM = 512;
function downscale(img) {
  if (Math.max(img.width, img.height) <= MAX_DIM) return img;
  const s = MAX_DIM / Math.max(img.width, img.height);
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
      img.onload = () => { loaded[key] = downscale(img); res(); };
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
