#!/usr/bin/env node
/**
 * 羽毛球队：洛杉矶时区内，每周三 19:00–21:00、每周六 15:00–17:00 写入体育馆预约（各一条，时长 120 分钟）。
 *
 * 主预约人：王晋南；次要预约人：仰磊。可用环境变量覆盖姓名匹配。
 *
 * 日期默认：从「今天」（洛杉矶日历）起到 2026-12-31；可用 --from/--to 或 GYM_BOOK_* 覆盖。
 *
 * 说明：
 * - 直接使用 GymReservation.create，与 HTTP API 允许的 120 分钟时长一致。
 * - 跳过闭馆日；若两人任一方该日已有预约或时段重叠则 skip。
 * - **默认 dry-run**，加 `--apply` 才 INSERT。
 *
 * 用法（在 server 目录）：
 *   node scripts/bulk-book-gym-badminton-wed-sat-2026.js
 *   node scripts/bulk-book-gym-badminton-wed-sat-2026.js --apply
 *   node scripts/bulk-book-gym-badminton-wed-sat-2026.js --from=2026-05-10 --to=2026-12-31 --apply
 *
 * npm run gym:bulk-badminton
 * npm run gym:bulk-badminton -- --apply
 */

import 'dotenv/config';
import { GymReservation } from '../database/models/GymReservation.js';
import { GymBlackout } from '../database/models/GymBlackout.js';
import { User } from '../database/models/User.js';

const TZ = 'America/Los_Angeles';

function todayIsoLosAngeles() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find((x) => x.type === 'year')?.value;
  const mo = parts.find((x) => x.type === 'month')?.value;
  const d = parts.find((x) => x.type === 'day')?.value;
  if (!y || !mo || !d) {
    throw new Error('无法解析洛杉矶当日日期');
  }
  return `${y}-${mo}-${d}`;
}

const DEFAULT_BOOK_FROM = process.env.GYM_BOOK_FROM ?? process.env.BADMINTON_BOOK_FROM ?? todayIsoLosAngeles();
const DEFAULT_BOOK_TO = process.env.GYM_BOOK_TO ?? process.env.BADMINTON_BOOK_TO ?? '2026-12-31';

const PRIMARY_NAMES_ENV = (
  process.env.BADMINTON_PRIMARY_NAMES ??
  process.env.GYM_BOOK_PRIMARY_NAMES ??
  '王晋南'
)
  .split(/[,|;]/)
  .map((s) => s.trim())
  .filter(Boolean);
const HELPER_NAMES_ENV = (
  process.env.BADMINTON_HELPER_NAMES ??
  process.env.GYM_BOOK_HELPER_NAMES ??
  '仰磊'
)
  .split(/[,|;]/)
  .map((s) => s.trim())
  .filter(Boolean);

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
  ]
    .filter(Boolean)
    .map((s) => String(s).trim());
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

  const notes = `羽毛球队固定时段（${notesSuffix}）`;

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
  const helperUser = resolveUser(users, HELPER_NAMES_ENV, '次要预约人');
  if (Number(primaryUser.id) === Number(helperUser.id)) {
    console.error('主预约人与次要预约人不能为同一用户 id。');
    process.exit(1);
  }

  console.log(
    `[羽毛球队] TZ=${TZ} | 区间 ${fromDate} .. ${toDate} | dry-run=${!apply}\n` +
      `           周三 19:00–21:00、周六 15:00–17:00（各 120 分钟）\n` +
      `           主: id=${primaryUser.id} (${primaryUser.nameZh || primaryUser.phoneNumber})\n` +
      `           辅: id=${helperUser.id} (${helperUser.nameZh || helperUser.phoneNumber})\n`
  );

  const toInsert = [];

  let wedCount = 0;
  let satCount = 0;

  for (const iso of eachCalendarDate(fromDate, toDate)) {
    const wd = weekdayShortLA(iso);
    if (wd === 'Wed') {
      wedCount += 1;
      toInsert.push(
        await planSlot(
          primaryUser,
          helperUser,
          iso,
          '周三晚 19–21（羽毛球）',
          '19:00',
          120,
          `${iso} Wed 19:00-21:00`
        )
      );
    } else if (wd === 'Sat') {
      satCount += 1;
      toInsert.push(
        await planSlot(
          primaryUser,
          helperUser,
          iso,
          '周六下午 15–17（羽毛球）',
          '15:00',
          120,
          `${iso} Sat 15:00-17:00`
        )
      );
    }
  }

  const okPlans = toInsert.filter((p) => p.status === 'ok');
  const skipPlans = toInsert.filter((p) => p.status === 'skip');

  console.log(
    `[统计] 区间内周三计数≈${wedCount} 周六计数≈${satCount}（洛杉矶星期）\n` +
      `       计划条数=${toInsert.length}, 将写入=${okPlans.length}, 将跳过=${skipPlans.length}`
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
    console.log('\n[完成] Dry-run。加 --apply 写入数据库。');
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
