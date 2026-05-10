#!/usr/bin/env node
/**
 * 将 2026 年「剩余区间」内、洛杉矶时区下的每个周六上午 9:00–12:00、
 * 每个周日下午 18:00–21:00 写入体育馆预约（各一条 reservation，跨度 180 分钟）。
 *
 * 主预约人：何侃（user_id）；共同预约人：游志明（helper_user_id）。可在环境变量改名。
 *
 * 说明：
 * - 不接 HTTP API：`POST /api/gym/reservations` 仅允许时长 60/120 分钟，且限制每人同一天只能约一条，
 *   本脚本直接使用 GymReservation.create 写入与实际占用一致的时间段。
 * - 跳过 gym_blackout_dates（闭馆日）。
 * - 若两人任一方在该日已有非 cancelled 预约，或时段与现有预约重叠，则跳过并打日志。
 * - **默认只做 dry-run**；传入 `--apply` 才会 INSERT。
 * - 数据库若存在旧版 `gym_reservations_duration_check`（只允许 60/120），需要先允许 180：
 *   `npm run gym:migrate-duration`，或重启服务让 `initDatabase()` 同步约束。
 *
 * 用法：**必须在包含 `scripts/`、`database/` 的 server 目录下执行**（或使用下面「根目录」那行）。
 * dotenv 从「当前工作目录」加载 `.env`，推荐在 server 目录下跑：
 *   cd server
 *   node scripts/bulk-book-gym-2026-weekends-two-users.js
 *   node scripts/bulk-book-gym-2026-weekends-two-users.js --apply
 *   GYM_BOOK_FROM=2026-05-10 GYM_BOOK_TO=2026-12-31 node scripts/bulk-book-gym-2026-weekends-two-users.js
 *
 * 若当前在仓库根目录 `church-in-cerritos`：
 *   GYM_BOOK_FROM=2026-05-10 GYM_BOOK_TO=2026-12-31 node server/scripts/bulk-book-gym-2026-weekends-two-users.js
 *
 * npm（在 server 目录）：
 *   npm run gym:bulk-weekends
 *   npm run gym:bulk-weekends -- --apply --from=2026-05-10 --to=2026-12-31
 *
 *   GYM_BOOK_PRIMARY_NAMES=何侃 GYM_BOOK_HELPER_NAMES=游志明 node scripts/bulk-book-gym-2026-weekends-two-users.js
 */

import 'dotenv/config';
import { GymReservation } from '../database/models/GymReservation.js';
import { GymBlackout } from '../database/models/GymBlackout.js';
import { User } from '../database/models/User.js';

const TZ = 'America/Los_Angeles';

const DEFAULT_BOOK_FROM = process.env.GYM_BOOK_FROM ?? '2026-05-10';
const DEFAULT_BOOK_TO = process.env.GYM_BOOK_TO ?? '2026-12-31';

const PRIMARY_NAMES_ENV = (
  process.env.GYM_BOOK_PRIMARY_NAMES ?? '何侃'
).split(/[,|;]/).map((s) => s.trim()).filter(Boolean);
const HELPER_NAMES_ENV = (
  process.env.GYM_BOOK_HELPER_NAMES ?? '游志明'
).split(/[,|;]/).map((s) => s.trim()).filter(Boolean);

function parseArgs(argv) {
  const apply = argv.includes('--apply');
  const fromArg = argv.find((a) => a.startsWith('--from='))?.split('=')[1]?.trim();
  const toArg = argv.find((a) => a.startsWith('--to='))?.split('=')[1]?.trim();
  const fromDate = fromArg || DEFAULT_BOOK_FROM;
  const toDate = toArg || DEFAULT_BOOK_TO;
  return { apply, fromDate, toDate };
}

function weekdayShortLA(isoYmd) {
  const utcNoon = new Date(`${isoYmd}T12:00:00.000Z`);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: TZ,
  }).format(utcNoon);
}

function formatTime(totalMinutes) {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** @returns {Iterable<string>} ISO date strings YYYY-MM-DD inclusive */
function* eachCalendarDate(fromIso, toIso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromIso) || !/^\d{4}-\d{2}-\d{2}$/.test(toIso)) {
    throw new Error(`无效日期格式: from=${fromIso}, to=${toIso}`);
  }
  if (fromIso > toIso) {
    throw new Error(`from 不能晚于 to: ${fromIso} > ${toIso}`);
  }
  let cursor = new Date(`${fromIso}T12:00:00.000Z`);
  const end = new Date(`${toIso}T12:00:00.000Z`);
  const pad = (n) => String(n).padStart(2, '0');
  while (cursor.getTime() <= end.getTime()) {
    const y = cursor.getUTCFullYear();
    const m = pad(cursor.getUTCMonth() + 1);
    const d = pad(cursor.getUTCDate());
    yield `${y}-${m}-${d}`;
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate() + 1));
  }
}

function matchDisplayNameFields(user, nameSet) {
  const variants = [
    user.nameZh,
    user.nameTw,
    user.name,
    user.nameEn,
    user.phoneNumber,
  ].filter(Boolean).map((s) => String(s).trim());
  for (const n of nameSet) {
    if (variants.includes(n)) return true;
  }
  return false;
}

function resolveUser(users, nameSet, label) {
  const hit = users.find((u) => u.id != null && matchDisplayNameFields(u, nameSet));
  if (!hit) {
    const sample = users
      .filter((u) => u.nameZh || u.nameTw)
      .slice(0, 20)
      .map((u) => `${u.id}:${u.nameZh || u.nameTw || u.phoneNumber}`)
      .join(', ');
    throw new Error(
      `找不到用户「${label}」。候选名列表：${nameSet.join('/')}。\n数据库中部分 nameZh/nameTw（前20）：${sample || '（无）'}`
    );
  }
  return hit;
}

async function planSlot(primary, helper, date, label, startTime, durationMinutes, notesSuffix) {
  const startTotalMinutes = (() => {
    const [h, m] = startTime.split(':').map(Number);
    return h * 60 + m;
  })();
  const endTotalMinutes = startTotalMinutes + durationMinutes;
  const endTime = formatTime(endTotalMinutes);

  if (await GymBlackout.isBlackoutDate(date)) {
    return { status: 'skip', date, reason: '闭馆日' };
  }

  if (await GymReservation.hasReservationOnDate(primary.id, date)) {
    return { status: 'skip', date, reason: `主预约人 ${PRIMARY_NAMES_ENV[0]} 在该日已有预约` };
  }
  if (await GymReservation.hasReservationOnDate(helper.id, date)) {
    return { status: 'skip', date, reason: `共同预约人 ${HELPER_NAMES_ENV[0]} 在该日已有预约` };
  }

  const free = await GymReservation.isSlotAvailable(date, startTime, endTime);
  if (!free) {
    return { status: 'skip', date, reason: '时段已被占用' };
  }

  const preferredLanguage = primary.preferredLanguage;
  const userName =
    (preferredLanguage === 'zh-Hant' ? primary.nameTw : primary.nameZh) ||
    primary.name ||
    primary.nameEn ||
    primary.phoneNumber ||
    `用户 ${primary.id}`;

  const notes = `bulk-2026 周末占位（${notesSuffix}）`;

  return {
    status: 'ok',
    date,
    label,
    startTime,
    endTime,
    durationMinutes,
    userName,
    notes,
    createPayload: {
      userId: primary.id,
      coUserId: helper.id,
      date,
      startTime,
      endTime,
      duration: durationMinutes,
      notes,
      userName,
    },
  };
}

async function main() {
  const { apply, fromDate, toDate } = parseArgs(process.argv.slice(2));

  const users = await User.findAll();
  const primaryUser = resolveUser(users, PRIMARY_NAMES_ENV, '主预约人');
  const helperUser = resolveUser(users, HELPER_NAMES_ENV, '共同预约人');
  if (Number(primaryUser.id) === Number(helperUser.id)) {
    console.error('主预约人与共同预约人不能为同一用户 id。');
    process.exit(1);
  }

  console.log(
    `[配置] TZ=${TZ} | 区间 ${fromDate} .. ${toDate} | dry-run=${!apply} | apply=${apply}\n` +
      `       主: id=${primaryUser.id} (${primaryUser.nameZh || primaryUser.phoneNumber})\n` +
      `       辅: id=${helperUser.id} (${helperUser.nameZh || helperUser.phoneNumber})\n`
  );

  const toInsert = [];

  let satCount = 0;
  let sunCount = 0;

  for (const iso of eachCalendarDate(fromDate, toDate)) {
    const wd = weekdayShortLA(iso);
    if (wd === 'Sat') {
      satCount += 1;
      const planned = await planSlot(
        primaryUser,
        helperUser,
        iso,
        '周六上午 9–12',
        '09:00',
        180,
        `${iso} Sat 09:00-12:00`
      );
      toInsert.push(planned);
    } else if (wd === 'Sun') {
      sunCount += 1;
      const planned = await planSlot(
        primaryUser,
        helperUser,
        iso,
        '周日晚上 18–21',
        '18:00',
        180,
        `${iso} Sun 18:00-21:00`
      );
      toInsert.push(planned);
    }
  }

  const okPlans = toInsert.filter((p) => p.status === 'ok');
  const skipPlans = toInsert.filter((p) => p.status === 'skip');

  console.log(
    `[统计] 区间内周六计数≈${satCount}（按 LA 日历）周日计数≈${sunCount}\n` +
      `       计划检查条数=${toInsert.length}, 将写入=${okPlans.length}, 将跳过=${skipPlans.length}`
  );

  skipPlans.slice(0, 30).forEach((p) => {
    if (p.status === 'skip') {
      console.log(`  skip ${p.date}: ${p.reason}`);
    }
  });
  if (skipPlans.length > 30) {
    console.log(`  ... 另有 ${skipPlans.length - 30} 条 skip 未逐项打印`);
  }

  okPlans.forEach((p) => {
    if (p.status === 'ok') {
      console.log(`  INSERT 预定: ${p.date} ${p.startTime}-${p.endTime} ${p.label}`);
    }
  });

  if (!apply) {
    console.log('\n[完成] Dry-run 结束。若要真正写入数据库，请加参数: --apply');
    process.exit(0);
    return;
  }

  console.log('\n正在写入 GymReservation …');
  let inserted = 0;
  let failed = 0;
  for (const row of okPlans) {
    if (row.status !== 'ok') continue;
    try {
      await GymReservation.create(row.createPayload);
      inserted += 1;
      console.log(`  ✔ ${row.date} ${row.startTime}-${row.endTime}`);
    } catch (e) {
      failed += 1;
      console.error(`  ✖ ${row.date} ${row.startTime}: ${e.message || e}`);
    }
  }
  console.log(`\n写入完成：成功 ${inserted}，失败 ${failed}`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
