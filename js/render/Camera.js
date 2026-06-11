// =====================================================
// Camera.js — 視角跟隨 + CameraShake
// =====================================================

export class Camera {
  constructor() {
    this.x = 0; this.y = 0;
    this.shakeFrames = 0; this.shakeMagnitude = 0;
    this.offsetX = 0; this.offsetY = 0;
  }

  shake(frames = 12, magnitude = 6) {
    this.shakeFrames = frames; this.shakeMagnitude = magnitude;
  }

  update() {
    if (this.shakeFrames > 0) {
      this.offsetX = (Math.random() - 0.5) * 2 * this.shakeMagnitude;
      this.offsetY = (Math.random() - 0.5) * 2 * this.shakeMagnitude;
      this.shakeFrames--;
    } else { this.offsetX = 0; this.offsetY = 0; }
  }

  apply(ctx) { ctx.save(); ctx.translate(-this.x + this.offsetX, -this.y + this.offsetY); }
  reset(ctx) { ctx.restore(); }
}
