// =====================================================
// Player.js — 玩家（移動/跳躍/射擊/Dash/EX/受傷）
// 黑貓剪影：純黑輪廓 + 白圓眼 + 紅領結（LIMBO 風格）
// 道具系統會動態修改 stats（damage/fireRate/bulletCount…）
// =====================================================
import { Entity } from "./Entity.js";
import { EventBus } from "../core/EventBus.js";
import {
  PLAYER_SPEED, PLAYER_JUMP_FORCE, PLAYER_GRAVITY, PLAYER_MAX_FALL,
  PLAYER_W, PLAYER_H, PLAYER_BASE_HP, PLAYER_BASE_DAMAGE,
  PLAYER_FIRE_RATE, PLAYER_BULLET_SPEED, PLAYER_BULLET_RANGE,
  PLAYER_BULLET_W, PLAYER_BULLET_H,
  EX_ENERGY_MAX, EX_BULLET_DAMAGE_MULT, EX_BULLET_SPEED, EX_BULLET_W, EX_BULLET_H,
  DASH_SPEED, DASH_DURATION, DASH_COOLDOWN,
  INVINCIBILITY_FRAMES, BLINK_INTERVAL,
  BOBBING_AMPLITUDE, BOBBING_FREQ, TILT_MAX, TILT_SPEED,
  WALL_THICKNESS, FLOOR_Y, CANVAS_W,
} from "../core/Constants.js";

const CEILING_Y = 60; // 天花板（牆壁厚度）

export class Player extends Entity {
  constructor(x, y, bulletPool) {
    super(x, y, PLAYER_W, PLAYER_H);
    this.bulletPool = bulletPool;

    // ── 血量 ──
    this.maxHP = PLAYER_BASE_HP;
    this.hp = PLAYER_BASE_HP;
    this.soulHearts = 0;
    this.lives = 0; // 九條命道具用

    // ── 可被道具修改的 stats ──
    this.damage = PLAYER_BASE_DAMAGE;
    this.fireRate = PLAYER_FIRE_RATE;       // 射擊間隔（frames）
    this.speed = PLAYER_SPEED;
    this.bulletSpeed = PLAYER_BULLET_SPEED;
    this.bulletRange = PLAYER_BULLET_RANGE;
    this.bulletCount = 1;                   // 三眼貓=3、四爪攻擊=4
    this.spreadAngle = 0;                   // 扇形展開角（度）
    this.bulletPiercing = false;
    this.bulletHoming = 0;                  // homingStrength
    this.bulletSizeMulti = 1;
    this.bulletKnockback = 0;
    this.bulletBounces = 0;                 // 彈力毛球：撞牆反彈次數
    this.crossFireChance = 0;               // 十字貓掌：四向齊射機率
    this.luck = 0;
    this.damageBonus = 0;                   // 戰鬥本能等臨時加成

    // ── EX 能量 ──
    this.exEnergy = 0;

    // ── 移動/物理狀態 ──
    this.isGrounded = false;
    this.facing = 1; // 1=右, -1=左

    // ── 計時器 ──
    this.fireTimer = 0;
    this.dashFrames = 0;
    this.dashCooldown = 0;
    this.invincibleFrames = 0;

    // ── 動畫狀態 ──
    this.bobbingTimer = 0;
    this.spriteOffsetY = 0;
    this.tiltAngle = 0;     // 度
    this.isShooting = false;
    this.mouthOpenScale = 0; // 0~1，EX 時瞬間放大
  }

  get isInvincible() { return this.invincibleFrames > 0 || this.dashFrames > 0; }
  get totalDamage() { return this.damage + this.damageBonus; }

  update(dt, input) {
    if (!input) return;

    // ── Dash ──
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (input.dashPressed && this.dashFrames <= 0 && this.dashCooldown <= 0) {
      this.dashFrames = DASH_DURATION;
      this.dashCooldown = DASH_COOLDOWN;
      EventBus.emit("playerDash", this);
    }

    // ── 水平移動 ──
    const ax = input.axisX;
    if (this.dashFrames > 0) {
      this.dashFrames -= dt;
      this.x += this.facing * DASH_SPEED * dt;
    } else {
      this.x += ax * this.speed * dt;
      if (ax !== 0) this.facing = ax > 0 ? 1 : -1;
    }

    // ── 跳躍 / 重力 ──
    if (input.jumpPressed && this.isGrounded) {
      this.vy = PLAYER_JUMP_FORCE;
      this.isGrounded = false;
      EventBus.emit("playerJump", this);
    }
    this.vy = Math.min(this.vy + PLAYER_GRAVITY * dt, PLAYER_MAX_FALL);
    this.y += this.vy * dt;

    // ── 地板 / 天花板 / 牆壁碰撞 ──
    if (this.y + this.h >= FLOOR_Y) {
      const wasAirborne = !this.isGrounded;
      this.y = FLOOR_Y - this.h;
      this.vy = 0;
      this.isGrounded = true;
      if (wasAirborne) EventBus.emit("playerLand", this);
    } else {
      this.isGrounded = false;
    }
    if (this.y < CEILING_Y) { this.y = CEILING_Y; this.vy = Math.max(this.vy, 0); }
    this.x = Math.max(WALL_THICKNESS, Math.min(CANVAS_W - WALL_THICKNESS - this.w, this.x));

    // ── 連發射擊 ──
    if (this.fireTimer > 0) this.fireTimer -= dt;
    this.isShooting = input.shootHeld;
    if (input.shootHeld && this.fireTimer <= 0) {
      this.shootVolley(false);
      this.fireTimer = this.fireRate;
      EventBus.emit("playerShoot", this);
    }

    // ── EX 必殺 ──
    if (input.exPressed && this.exEnergy >= EX_ENERGY_MAX) {
      this.shootVolley(true);
      this.exEnergy = 0;
      this.mouthOpenScale = 1; // 嘴巴瞬間放大
      EventBus.emit("playerShootEX", this);
    }
    this.mouthOpenScale = Math.max(0, this.mouthOpenScale - 0.05 * dt);

    // ── 受傷無敵幀 ──
    if (this.invincibleFrames > 0) this.invincibleFrames -= dt;

    // ── 走路動畫：彈跳 + 傾斜 ──
    const moving = ax !== 0 && this.isGrounded && this.dashFrames <= 0;
    if (moving) {
      this.bobbingTimer += BOBBING_FREQ * dt;
      this.spriteOffsetY = Math.sin(this.bobbingTimer) * BOBBING_AMPLITUDE;
    } else {
      this.spriteOffsetY *= 0.8;
    }
    const targetTilt = -ax * TILT_MAX;
    this.tiltAngle += (targetTilt - this.tiltAngle) * TILT_SPEED * dt;
  }

  // 發射一輪子彈（bulletCount 顆，扇形展開 spreadAngle）
  shootVolley(isEX) {
    const count = isEX ? 1 : this.bulletCount;
    const spreadRad = (this.spreadAngle * Math.PI) / 180;
    const baseAngle = this.facing === 1 ? 0 : Math.PI;

    for (let i = 0; i < count; i++) {
      // 多顆時以正前方為中心扇形展開
      const offset = count > 1 ? (i - (count - 1) / 2) * spreadRad : 0;
      this.spawnBullet(baseAngle + offset, isEX);
    }

    // 十字貓掌：機率向其餘三個方向齊射
    if (!isEX && this.crossFireChance > 0 && Math.random() < this.crossFireChance) {
      for (const extra of [Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        this.spawnBullet(baseAngle + extra, false);
      }
    }
  }

  spawnBullet(angle, isEX) {
    const mouthX = this.facing === 1 ? this.x + this.w : this.x;
    const mouthY = this.y + 12;
    const speed = isEX ? EX_BULLET_SPEED : this.bulletSpeed;
    const size = isEX ? { w: EX_BULLET_W, h: EX_BULLET_H }
                      : { w: PLAYER_BULLET_W, h: PLAYER_BULLET_H };
    const bullet = this.bulletPool.spawn({
      x: mouthX - size.w / 2, y: mouthY - size.h / 2,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      damage: isEX ? this.totalDamage * EX_BULLET_DAMAGE_MULT : this.totalDamage,
      range: isEX ? 9999 : this.bulletRange,
      w: size.w, h: size.h,
      isEX, piercing: this.bulletPiercing,
    });
    bullet.homingStrength = this.bulletHoming;
    bullet.sizeMulti = this.bulletSizeMulti;
    bullet.knockback = this.bulletKnockback;
    bullet.maxBounces = this.bulletBounces;
    return bullet;
  }

  // 命中敵人時呼叫（碰撞系統觸發）
  gainEX(amount) {
    this.exEnergy = Math.min(this.exEnergy + amount, EX_ENERGY_MAX);
  }

  takeDamage(dmg) {
    if (this.isInvincible) return false;
    // 魂心優先扣
    if (this.soulHearts > 0) {
      this.soulHearts = Math.max(0, this.soulHearts - dmg);
    } else {
      this.hp -= dmg;
    }
    this.invincibleFrames = INVINCIBILITY_FRAMES;
    EventBus.emit("playerHurt", { player: this, damage: dmg });
    if (this.hp <= 0) this.die();
    return true;
  }

  heal(amount) {
    this.hp = Math.min(this.hp + amount, this.maxHP);
    EventBus.emit("playerHeal", { player: this, amount });
  }

  die() {
    if (this.lives > 0) {
      this.lives--;
      this.hp = 1;
      this.invincibleFrames = INVINCIBILITY_FRAMES * 2;
      return;
    }
    this.active = false;
    EventBus.emit("playerDied", this);
  }

  draw(ctx) {
    // 受傷閃爍：invincibleFrames 期間每 BLINK_INTERVAL 幀隱藏一次
    if (this.invincibleFrames > 0 &&
        Math.floor(this.invincibleFrames / BLINK_INTERVAL) % 2 === 1) {
      return;
    }

    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2 + this.spriteOffsetY;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((this.tiltAngle * Math.PI) / 180);
    ctx.scale(this.facing, 1); // 朝左時水平翻轉

    const w = this.w, h = this.h;

    // ── 身體（黑色圓角剪影）──
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2 + 6, w, h - 6, 8);
    ctx.fill();

    // ── 頭 ──
    ctx.beginPath();
    ctx.arc(0, -h / 2 + 10, w / 2, 0, Math.PI * 2);
    ctx.fill();

    // ── 耳朵（兩個三角形）──
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 2, -h / 2 + 2);
    ctx.lineTo(-w / 4, -h / 2 - 12);
    ctx.lineTo(-2, -h / 2 + 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(2, -h / 2 + 2);
    ctx.lineTo(w / 4, -h / 2 - 12);
    ctx.lineTo(w / 2 - 2, -h / 2 + 2);
    ctx.closePath();
    ctx.fill();

    // ── 尾巴（彎曲線條）──
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-w / 2, h / 2 - 10);
    ctx.quadraticCurveTo(-w, h / 2 - 24, -w + 6, -2);
    ctx.stroke();

    // ── 白圓眼 ──
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(w / 6, -h / 2 + 8, 4, 0, Math.PI * 2);
    ctx.fill();

    // ── 嘴巴（射擊時張開；EX 時瞬間放大）──
    if (this.isShooting || this.mouthOpenScale > 0) {
      const mouthR = 3 + this.mouthOpenScale * 6;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(w / 2 - 4, -h / 2 + 14, mouthR, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── 紅領結（角色辨識特徵）──
    ctx.fillStyle = "#c8102e";
    ctx.beginPath();
    ctx.moveTo(0, -h / 2 + 22);
    ctx.lineTo(-7, -h / 2 + 17);
    ctx.lineTo(-7, -h / 2 + 27);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -h / 2 + 22);
    ctx.lineTo(7, -h / 2 + 17);
    ctx.lineTo(7, -h / 2 + 27);
    ctx.closePath();
    ctx.fill();

    // ── Dash 殘影效果 ──
    if (this.dashFrames > 0) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.roundRect(-w / 2 - this.facing * 14, -h / 2 + 6, w, h - 6, 8);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }
}
