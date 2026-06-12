// =====================================================
// PlacedBomb.js — 放置型炸彈（B 鍵，消耗 gm.bombs）
// 1.5s 引信 → 範圍傷害（敵我皆傷）＋ 炸開相鄰隱藏房的門。
// 開門判定：爆風圓與該方向門的位置（Door.rectFor）重疊才算，
// 所以要「炸對牆」——北側隱藏房靠生成時預置的跳台階梯把炸彈帶上去。
// 生存於 room.items（update/draw/active 語義一致，換房不殘留）。
// =====================================================
import { Entity } from "../entities/Entity.js";
import { EventBus } from "../core/EventBus.js";
import { GameManager } from "../core/GameManager.js";
import { Door } from "../world/Door.js";
import {
  FLOOR_Y, PLAYER_GRAVITY, PLAYER_MAX_FALL, ROOM_TYPES,
} from "../core/Constants.js";

const FUSE_FRAMES = 90;     // 引信 1.5s
const BLAST_RADIUS = 110;   // 爆風半徑
const BLAST_DAMAGE = 10;    // 對敵傷害（Boss 也吃）
const BLAST_ANIM = 14;      // 爆風視覺幀數

// 圓 vs 矩形重疊
function circleHitsRect(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  return (cx - nx) ** 2 + (cy - ny) ** 2 <= r * r;
}

const DIRS = {
  N: { dx: 0, dy: -1, opp: "S" }, S: { dx: 0, dy: 1, opp: "N" },
  E: { dx: 1, dy: 0, opp: "W" },  W: { dx: -1, dy: 0, opp: "E" },
};

export class PlacedBomb extends Entity {
  constructor(cx, bottomY) {
    super(cx - 8, bottomY - 18, 16, 18);
    this.fuse = FUSE_FRAMES;
    this.explodeAnim = 0; // >0 = 爆風動畫中
    this.vy = 0;
  }

  update(dt, player) {
    if (!this.active) return;
    if (this.explodeAnim > 0) {
      this.explodeAnim -= dt;
      if (this.explodeAnim <= 0) this.active = false;
      return;
    }

    // 重力落下（可停在單向跳台上——北側隱藏房得靠這個）
    const room = GameManager.getInstance().currentRoom;
    const prevBottom = this.y + this.h;
    this.vy = Math.min(this.vy + PLAYER_GRAVITY * dt, PLAYER_MAX_FALL);
    this.y += this.vy * dt;
    if (this.y + this.h >= FLOOR_Y) {
      this.y = FLOOR_Y - this.h;
      this.vy = 0;
    } else if (room && this.vy >= 0) {
      for (const p of room.platforms || []) {
        if (this.x + this.w <= p.x || this.x >= p.x + p.w) continue;
        if (prevBottom <= p.y + 1 && this.y + this.h >= p.y) {
          this.y = p.y - this.h;
          this.vy = 0;
          break;
        }
      }
    }

    this.fuse -= dt;
    if (this.fuse <= 0) this.explode(player);
  }

  explode(player) {
    this.explodeAnim = BLAST_ANIM;
    const gm = GameManager.getInstance();
    const room = gm.currentRoom;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;

    // 範圍傷害：敵人/Boss + 玩家（敵我皆傷，Dash/無敵幀可閃）
    if (room) {
      for (const e of room.enemies) {
        if (e.active && circleHitsRect(cx, cy, BLAST_RADIUS, e.hitbox)) {
          e.takeDamage(BLAST_DAMAGE);
        }
      }
    }
    if (player?.active && circleHitsRect(cx, cy, BLAST_RADIUS, player.hitbox)) {
      player.takeDamage(1);
    }

    this.tryOpenSecret(gm, room, cx, cy);
    EventBus.emit("bombExploded", { x: cx, y: cy });
  }

  // 爆風碰到「相鄰隱藏房方向的門位」→ 雙向建門
  tryOpenSecret(gm, room, cx, cy) {
    const floor = gm.currentFloor;
    if (!floor || !room?.gridPos) return;
    for (const [dir, d] of Object.entries(DIRS)) {
      if (room.doors[dir]) continue; // 已有門（含已炸開）
      const nb = floor.roomAt(room.gridPos.x + d.dx, room.gridPos.y + d.dy);
      if (!nb || nb.type !== ROOM_TYPES.SECRET) continue;
      if (!circleHitsRect(cx, cy, BLAST_RADIUS, Door.rectFor(dir))) continue;
      const door = room.addDoor(dir);
      if (room.isCleared || room.startsCleared) door.open(); // 戰鬥中炸開則清怪後才開
      nb.addDoor(d.opp); // 回程門（進房 enter() 時開）
      nb.isRevealed = true;
      EventBus.emit("secretRoomOpened", { room: nb, from: room, dir });
    }
  }

  draw(ctx) {
    if (!this.active) return;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    ctx.save();
    if (this.explodeAnim > 0) {
      // 爆風：外橘內白雙圈，隨動畫擴張淡出
      const t = 1 - this.explodeAnim / BLAST_ANIM;
      const r = BLAST_RADIUS * (0.45 + 0.55 * t);
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = "#ff9d42";
      ctx.lineWidth = 8 * (1 - t) + 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,240,200,0.85)";
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.45 * (1 - t * 0.6), 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 本體：黑圓 + 引信；最後 0.5s 紅閃加速
      const blink = this.fuse < 30 ? Math.floor(this.fuse / 4) % 2 === 0
                                   : Math.floor(this.fuse / 10) % 2 === 0;
      ctx.fillStyle = "#101014";
      ctx.beginPath();
      ctx.arc(cx, cy + 2, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = blink ? "#ff5e3a" : "#c8102e";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 6);
      ctx.quadraticCurveTo(cx + 5, cy - 12, cx + 8, cy - 10);
      ctx.stroke();
      if (blink) { // 引信火花
        ctx.fillStyle = "#ffd75e";
        ctx.beginPath();
        ctx.arc(cx + 8, cy - 10, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
