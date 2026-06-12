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
    this.cardText = FLOOR_NAMES[num] ? `F${num}・${FLOOR_NAMES[num]}` : `F${num}`;
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
      ctx.textBaseline = "alphabetic"; // 不依賴全域預設，防外部污染
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
