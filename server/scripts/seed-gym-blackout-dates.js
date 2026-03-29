#!/usr/bin/env node
/**
 * 先删除指定日期上的全部 gym 预约，再写入 gym_blackout_dates，
 * 使该日所有时段在 API 中显示为「不开放」（不可用，且非「已约」）。
 *
 * 用法（在 server 目录下）：
 *   node scripts/seed-gym-blackout-dates.js
 *   node scripts/seed-gym-blackout-dates.js --year=2026
 *   node scripts/seed-gym-blackout-dates.js --dates=2026-04-11,2026-04-12
 *   node scripts/seed-gym-blackout-dates.js --dry-run
 *   node scripts/seed-gym-blackout-dates.js --blackout-only   # 只写闭馆日，不删预约
 *
 * 需要 DATABASE_URL 等环境变量（与主服务相同，可用 .env）。
 */
import 'dotenv/config';
import { GymBlackout } from '../database/models/GymBlackout.js';
import { GymReservation } from '../database/models/GymReservation.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const blackoutOnly = args.includes('--blackout-only');
  let year = 2026;
  const yearArg = args.find((a) => a.startsWith('--year='));
  if (yearArg) {
    const y = parseInt(yearArg.split('=')[1], 10);
    if (!Number.isNaN(y)) year = y;
  }
  let dates = [`${year}-04-11`, `${year}-04-12`];
  const datesArg = args.find((a) => a.startsWith('--dates='));
  if (datesArg) {
    dates = datesArg
      .split('=')[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return { dryRun, blackoutOnly, dates };
}

async function main() {
  const { dryRun, blackoutOnly, dates } = parseArgs();
  const valid = dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  if (valid.length === 0) {
    console.error('未提供有效日期（YYYY-MM-DD）。');
    process.exit(1);
  }
  if (dryRun) {
    if (!blackoutOnly) {
      console.log('[dry-run] 将删除这些日期的全部体育馆预约:', valid.join(', '));
    }
    console.log('[dry-run] 将写入闭馆日:', valid.join(', '));
    return;
  }
  if (!blackoutOnly) {
    const removed = await GymReservation.deleteAllForDates(valid);
    console.log(`已删除预约行数: ${removed}（日期: ${valid.join(', ')}）`);
  }
  await GymBlackout.upsertDates(valid);
  console.log('已写入闭馆日:', valid.join(', '));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
