// =====================================================
// AssetLoader.js — 預載入 Higgsfield 圖片
// 所有 draw() 必須同時支援：有圖用圖，無圖用幾何圖形。
// 不可因素材缺失導致崩潰。
// =====================================================

export const ASSETS = {
  // Higgsfield 素材就位後在此登錄（M3 里程碑）
  // player_idle: "assets/images/player_idle.png",
  // player_jump: "assets/images/player_jump.png",
  // boss_f1a:    "assets/images/boss_feathertop.png",
};

let loaded = {};

export async function loadAllAssets() {
  loaded = {};
  await Promise.all(Object.entries(ASSETS).map(([key, src]) =>
    new Promise((res) => {
      const img = new Image();
      img.onload = () => { loaded[key] = img; res(); };
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
