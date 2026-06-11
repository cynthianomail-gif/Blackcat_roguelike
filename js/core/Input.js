// =====================================================
// Input.js — 鍵盤輸入管理
// 操作：A/D/箭頭移動、W/Space 跳、J 射擊（按住）、
//       L EX 必殺、Shift Dash、E 主動道具、Tab 地圖、Esc 暫停
// =====================================================

export class Input {
  constructor() {
    this.keys = new Set();        // 目前按住的鍵（KeyboardEvent.code）
    this.justPressed = new Set(); // 本幀剛按下的鍵（每幀結束清空）

    window.addEventListener("keydown", (e) => {
      if (!this.keys.has(e.code)) this.justPressed.add(e.code);
      this.keys.add(e.code);
      // 防止 Tab/Space/方向鍵捲動頁面
      if (["Tab", "Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => { this.keys.clear(); this.justPressed.clear(); });
  }

  isDown(code) { return this.keys.has(code); }
  pressed(code) { return this.justPressed.has(code); }

  // 水平輸入軸：-1（左）/ 0 / +1（右）
  get axisX() {
    let x = 0;
    if (this.isDown("KeyA") || this.isDown("ArrowLeft")) x -= 1;
    if (this.isDown("KeyD") || this.isDown("ArrowRight")) x += 1;
    return x;
  }

  get jumpPressed()  { return this.pressed("KeyW") || this.pressed("Space") || this.pressed("ArrowUp"); }
  get shootHeld()    { return this.isDown("KeyJ"); }
  get exPressed()    { return this.pressed("KeyL"); }
  get dashPressed()  { return this.pressed("ShiftLeft") || this.pressed("ShiftRight"); }
  get usePressed()   { return this.pressed("KeyE"); }
  get mapHeld()      { return this.isDown("Tab"); }
  get pausePressed() { return this.pressed("Escape"); }
  get confirmPressed() { return this.pressed("Enter"); }

  // 每幀結束時呼叫，清除單幀按鍵
  endFrame() { this.justPressed.clear(); }
}
