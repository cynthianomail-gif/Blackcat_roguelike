// =====================================================
// BaseEnemy.js — 敵人基底類（FSM）
// 狀態：IDLE | CHASE | ATTACK | HURT | DEAD
// 受傷：白閃 8 幀 + 擊退；死亡 emit "enemyDied"
// =====================================================
import { Entity, rectsOverlap } from "../Entity.js";
import { EventBus } from "../../core/EventBus.js";
import { getAsset } from "../../render/AssetLoader.js";
import {
  CANVAS_W, WALL_THICKNESS, FLOOR_Y, ENEMY_HP_SCALE,
} from "../../core/Constants.js";

const CEILING_Y = WALL_THICKNESS;
const KNOCKBACK_DECAY = 0.8; // 擊退速度每幀衰減

export class BaseEnemy extends Entity {
  constructor(x, y, w, h, hp, speed, damage) {
    super(x, y, w, h);
    // 規格 Section 7 數值 × 平衡縮放（Boss 由 BossController 覆寫為 BOSS_HP_SCALE）
    const scaled = Math.round(hp * ENEMY_HP_SCALE);
    this.maxHP = scaled; this.hp = scaled;
    this.speed = speed; this.damage = damage;
    this.state = "IDLE"; // IDLE | CHASE | ATTACK | HURT | DEAD
    this.hurtFrames = 0;
    this.knockbackX = 0; this.knockbackY = 0;
    this.room = null;        // 生成時由 spawner 填入
    this.contactDamage = true;
    // ── 狀態異常（道具效果）──
    this.stunFrames = 0;     // 暈眩：AI 完全停止
    this.slowFrames = 0;     // 減速：behave 的 dt 打折
    this.slowAmt = 0;        // 減速比例（0.4 = 速度 -40%）
    this.poisonFrames = 0;   // 中毒：每 60f 扣 poisonDmg
    this.poisonDmg = 0;
    this.poisonTick = 0;

    // ── M7 程序式動畫（純繪製變換，不碰碰撞箱）──
    this.animT = Math.random() * Math.PI * 2; // 個體相位差，避免整房同步呼吸
    this.prevX = x;
    this.moveVX = 0;       // 每幀實際水平位移（判斷移動中/方向）
    this.airborne = false; // 空中（飛行系自動判別）
  }

  applyStun(frames) { this.stunFrames = Math.max(this.stunFrames, frames); }

  applySlow(frames, amt) {
    this.slowFrames = Math.max(this.slowFrames, frames);
    this.slowAmt = Math.max(this.slowAmt, amt);
  }

  applyPoison(dmg, frames) {
    this.poisonDmg = Math.max(this.poisonDmg, dmg);
    this.poisonFrames = Math.max(this.poisonFrames, frames);
  }

  takeDamage(dmg, knockX = 0, knockY = 0) {
    if (this.state === "DEAD") return;
    this.hp -= dmg;
    this.hurtFrames = 8;
    this.knockbackX = knockX; this.knockbackY = knockY;
    EventBus.emit("enemyHurt", { enemy: this, dmg });
    if (this.hp <= 0) this.die();
  }

  die() {
    this.state = "DEAD"; this.active = false;
    EventBus.emit("enemyDied", this);
  }

  update(dt, player) {
    if (this.state === "DEAD" || !this.active) return;

    this.animT += 0.06 * dt;
    this.moveVX = this.x - this.prevX;
    this.prevX = this.x;
    this.airborne = this.y + this.h < FLOOR_Y - 6;

    // ── 中毒：每 60f 扣血（不打斷 AI）──
    if (this.poisonFrames > 0) {
      this.poisonFrames -= dt;
      this.poisonTick += dt;
      if (this.poisonTick >= 60) {
        this.poisonTick = 0;
        this.hp -= this.poisonDmg;
        if (this.hp <= 0) { this.die(); return; }
      }
    }
    if (this.slowFrames > 0) this.slowFrames -= dt;

    if (this.hurtFrames > 0) {
      // HURT：行為中斷，套用擊退
      this.state = "HURT";
      this.hurtFrames -= dt;
      this.x += this.knockbackX * dt;
      this.y += this.knockbackY * dt;
      this.knockbackX *= KNOCKBACK_DECAY;
      this.knockbackY *= KNOCKBACK_DECAY;
    } else if (this.stunFrames > 0) {
      this.stunFrames -= dt; // 暈眩：原地停止
    } else {
      // 減速：縮小 behave 收到的時間刻度
      const effDt = this.slowFrames > 0 ? dt * (1 - this.slowAmt) : dt;
      this.behave(effDt, player); // 子類各自的 AI
    }

    this.clampToRoom();

    // 接觸傷害（玩家無敵幀由 Player.takeDamage 內部處理）
    if (this.contactDamage && player?.active &&
        rectsOverlap(this.hitbox, player.hitbox)) {
      player.takeDamage(this.damage);
    }
  }

  // 子類覆寫：每幀 AI 行為（非 HURT/DEAD 時呼叫）
  behave(dt, player) {}

  clampToRoom() {
    this.x = Math.max(WALL_THICKNESS, Math.min(CANVAS_W - WALL_THICKNESS - this.w, this.x));
    this.y = Math.max(CEILING_Y, Math.min(FLOOR_Y - this.h, this.y));
  }

  // 受傷白閃用：本幀身體顏色
  bodyColor(base) { return this.hurtFrames > 0 ? "#ffffff" : base; }

  // ── Higgsfield 剪影素材（M4）──────────────────────
  // 有圖：等比縮放塞進 w×h、底部對齊碰撞箱底、畫 HP 條後回傳 true
  //（呼叫端直接 return）；無圖回傳 false 走幾何 fallback。
  // 素材一律面朝左；facing=1（朝右）時水平翻面。
  // opts: { alpha, rotate, facing, noFlip }
  drawSprite(ctx, key, opts = {}) {
    const img = getAsset(key);
    if (!img) return false;
    const fit = Math.min(this.w / img.width, this.h / img.height);
    const dw = img.width * fit, dh = img.height * fit;
    ctx.save();
    if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
    // ── 程序式動畫：呼吸 / 移動彈跳+傾斜 / 飛行浮沉 / 攻擊蓄力 / 受傷抖動 ──
    let sx = 1, sy = 1, oy = 0, rot = 0, ox = 0;
    const moving = Math.abs(this.moveVX) > 0.3;
    if (this.airborne) {
      oy = Math.sin(this.animT * 2.2) * 3;                  // 拍翅浮沉
      rot = Math.sin(this.animT * 2.2 + 1) * 0.06;
    } else if (moving) {
      oy = -Math.abs(Math.sin(this.animT * 1.8)) * 3;       // 走路彈跳
      rot = (this.moveVX > 0 ? 1 : -1) * 0.05;              // 朝移動方向微傾
    } else {
      sy = 1 + Math.sin(this.animT) * 0.02;                 // 待機呼吸
      sx = 1 - Math.sin(this.animT) * 0.012;
    }
    if (this.state === "ATTACK") { sy *= 0.93; sx *= 1.05; } // 攻擊蓄力壓扁
    if (this.hurtFrames > 0) ox = (Math.random() - 0.5) * 3; // 受傷抖動

    ctx.translate(this.x + this.w / 2 + ox, this.y + this.h + oy);
    ctx.rotate(rot);                                         // 世界座標傾斜（翻面前）
    if (opts.rotate) {
      ctx.translate(0, -this.h / 2);
      ctx.rotate(opts.rotate);
      ctx.translate(0, this.h / 2);
    }
    ctx.scale((opts.noFlip ? 1 : -(opts.facing ?? this.facing ?? 1)) * sx, sy);
    this.lastSpriteKey = key; // Task 3 死亡溶解 ghost 用
    // 受傷白閃；平時留極淡 rim glow（亮彩背景下黑剪影本身可讀，
    // glow 只為腳部與前景黑地板交界處保留一點分離度）
    ctx.filter = this.hurtFrames > 0
      ? "invert(1)"
      : "drop-shadow(0 0 3px rgba(255,255,255,0.30))";
    ctx.drawImage(img, -dw / 2, -dh, dw, dh);
    ctx.restore();
    this.drawHPBar(ctx);
    return true;
  }

  // 幾何佔位共用：身體上方的小血條
  drawHPBar(ctx) {
    if (this.hp >= this.maxHP) return;
    const ratio = Math.max(0, this.hp / this.maxHP);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(this.x, this.y - 8, this.w, 4);
    ctx.fillStyle = "#c8102e";
    ctx.fillRect(this.x, this.y - 8, this.w * ratio, 4);
  }
}
