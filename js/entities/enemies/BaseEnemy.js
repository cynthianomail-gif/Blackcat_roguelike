// =====================================================
// BaseEnemy.js — 敵人基底類（FSM）
// 狀態：IDLE | CHASE | ATTACK | HURT | DEAD
// 受傷：白閃 8 幀 + 擊退；死亡 emit "enemyDied"
// =====================================================
import { Entity, rectsOverlap } from "../Entity.js";
import { EventBus } from "../../core/EventBus.js";
import { CANVAS_W, WALL_THICKNESS, FLOOR_Y } from "../../core/Constants.js";

const CEILING_Y = WALL_THICKNESS;
const KNOCKBACK_DECAY = 0.8; // 擊退速度每幀衰減

export class BaseEnemy extends Entity {
  constructor(x, y, w, h, hp, speed, damage) {
    super(x, y, w, h);
    this.maxHP = hp; this.hp = hp;
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
