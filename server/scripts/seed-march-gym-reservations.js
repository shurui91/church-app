#!/usr/bin/env node
/**
 * 体育馆示例预约种子：从 gender === male 的用户中随机选主预约人 / 共同预约人。
 *
 * 默认生成 3 月 + 4 月 数据（每月最多 MAX_CREATIONS_PER_MONTH 条）。
 *
 * 用法（在 server 目录下）：
 *   node scripts/seed-march-gym-reservations.js
 *   node scripts/seed-march-gym-reservations.js --month=4
 *   node scripts/seed-march-gym-reservations.js --months=3,4
 *   SEED_GYM_MONTHS=3,4 node scripts/seed-march-gym-reservations.js
 */
import { GymReservation } from '../database/models/GymReservation.js';
import { User } from '../database/models/User.js';

const TARGET_YEAR = new Date().getFullYear();
/** 默认：3 月 + 4 月 */
const DEFAULT_MONTHS = [3, 4];
const MAX_CREATIONS_PER_MONTH = 12;
const DAY_POOL = [3, 5, 8, 11, 13, 16, 19, 22, 25, 28];
const DURATION_OPTIONS = [60, 120];
const OPENING_HOUR = 8;
const CLOSING_HOUR = 22;

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pad = (value) => String(value).padStart(2, '0');

const parseMonthsArg = () => {
  const args = process.argv.slice(2);
  const monthsArg = args.find((arg) => arg.startsWith('--months='));
  if (monthsArg) {
    const list = monthsArg
      .split('=')[1]
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n) && n >= 1 && n <= 12);
    if (list.length) {
      return list;
    }
    console.warn('无效的 --months 参数，使用默认值');
  }
  const monthArg = args.find((arg) => arg.startsWith('--month='));
  if (monthArg) {
    const monthValue = parseInt(monthArg.split('=')[1], 10);
    if (!Number.isNaN(monthValue) && monthValue >= 1 && monthValue <= 12) {
      return [monthValue];
    }
    console.warn('无效的 --month 参数，使用默认值');
  }
  const envMonths = process.env.SEED_GYM_MONTHS;
  if (envMonths) {
    const list = envMonths
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n) && n >= 1 && n <= 12);
    if (list.length) {
      return list;
    }
    console.warn('SEED_GYM_MONTHS 无效，使用默认值');
  }
  const envMonth = process.env.SEED_GYM_MONTH;
  if (envMonth) {
    const monthValue = parseInt(envMonth, 10);
    if (!Number.isNaN(monthValue) && monthValue >= 1 && monthValue <= 12) {
      return [monthValue];
    }
    console.warn('SEED_GYM_MONTH 无效，使用默认值');
  }
  return DEFAULT_MONTHS;
};

const TARGET_MONTHS = parseMonthsArg();

const formatTime = (hour, minute = 0) => `${pad(hour)}:${pad(minute)}`;

const isSlotAvailableForUsers = async (date, startTime, endTime, primaryId, helperId) => {
  const primaryHas = await GymReservation.hasReservationOnDate(primaryId, date);
  if (primaryHas) return false;
  const helperHas = await GymReservation.hasReservationOnDate(helperId, date);
  if (helperHas) return false;
  return GymReservation.isSlotAvailable(date, startTime, endTime);
};

async function main() {
  const users = await User.findAll();
  /** 主预约人、共同预约人必须为 male */
  const eligibleUsers = users.filter((user) => user.id && user.gender === 'male');
  if (eligibleUsers.length < 2) {
    console.error(
      '至少需要 2 位 gender 为 male 的用户才能生成种子预约（当前 male 用户数：' +
        eligibleUsers.length +
        '）。'
    );
    process.exit(1);
  }

  const allInserted = [];

  for (const targetMonth of TARGET_MONTHS) {
    const formatDate = (day) => `${TARGET_YEAR}-${pad(targetMonth)}-${pad(day)}`;
    const insertedReservations = [];
    let attempts = 0;

    while (
      insertedReservations.length < MAX_CREATIONS_PER_MONTH &&
      attempts < MAX_CREATIONS_PER_MONTH * 20
    ) {
      attempts += 1;
      const primary = pickRandom(eligibleUsers);
      let helper = pickRandom(eligibleUsers);
      if (helper.id === primary.id) {
        const others = eligibleUsers.filter((user) => user.id !== primary.id);
        if (!others.length) continue;
        helper = pickRandom(others);
      }

      const day = pickRandom(DAY_POOL);
      const date = formatDate(day);
      const duration = pickRandom(DURATION_OPTIONS);
      const maxStartHour = CLOSING_HOUR - duration / 60;
      const startHour = Math.floor(Math.random() * (maxStartHour - OPENING_HOUR + 1)) + OPENING_HOUR;
      const startTime = formatTime(startHour);
      const endTime = formatTime(startHour + duration / 60);

      const slotAvailable = await isSlotAvailableForUsers(date, startTime, endTime, primary.id, helper.id);
      if (!slotAvailable) {
        continue;
      }

      const preferredLanguage = primary.preferredLanguage;
      const userName =
        (preferredLanguage === 'zh-Hant' ? primary.nameTw : primary.nameZh) ||
        primary.name ||
        primary.nameEn ||
        primary.phoneNumber ||
        `用户 ${primary.id}`;

      try {
        const reservation = await GymReservation.create({
          userId: primary.id,
          coUserId: helper.id,
          date,
          startTime,
          endTime,
          duration,
          notes: `种子数据（${targetMonth}月）`,
          userName,
        });
        insertedReservations.push(reservation);
        console.log(
          `✔ [${targetMonth}月] 创建 ${date} ${startTime}-${endTime}，主预约人 ${userName}，共同预约人 ${helper.name || helper.nameZh || helper.phoneNumber}`
        );
      } catch (error) {
        console.warn('创建预约失败，跳过：', error?.message || error);
      }
    }

    console.log(`--- ${targetMonth} 月：插入 ${insertedReservations.length} 条 ---`);
    allInserted.push(...insertedReservations);
  }

  if (!allInserted.length) {
    console.log('未插入任何样本预约；请确保当前数据库中无冲突，且存在至少两位 male 用户');
  } else {
    console.log(`完成，共插入 ${allInserted.length} 条（月份：${TARGET_MONTHS.join('、')}）`);
  }
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('种子脚本执行失败：', error);
    process.exit(1);
  });
}
