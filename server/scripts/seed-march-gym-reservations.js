#!/usr/bin/env node
import { GymReservation } from '../database/models/GymReservation.js';
import { User } from '../database/models/User.js';

const TARGET_YEAR = new Date().getFullYear();
const DEFAULT_MONTH = 3; // March (1-indexed)
const MAX_CREATIONS = 12;
const DAY_POOL = [3, 5, 8, 11, 13, 16, 19, 22, 25, 28];
const DURATION_OPTIONS = [60, 120];
const OPENING_HOUR = 7;
const CLOSING_HOUR = 22;

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pad = (value) => String(value).padStart(2, '0');

const parseMonthArg = () => {
  const args = process.argv.slice(2);
  const monthArg = args.find((arg) => arg.startsWith('--month='));
  if (monthArg) {
    const monthValue = parseInt(monthArg.split('=')[1], 10);
    if (!Number.isNaN(monthValue) && monthValue >= 1 && monthValue <= 12) {
      return monthValue;
    }
    console.warn('无效的 --month 参数，使用默认值');
  }
  const envMonth = process.env.SEED_GYM_MONTH;
  if (envMonth) {
    const monthValue = parseInt(envMonth, 10);
    if (!Number.isNaN(monthValue) && monthValue >= 1 && monthValue <= 12) {
      return monthValue;
    }
    console.warn('SEED_GYM_MONTH 无效，使用默认值');
  }
  return DEFAULT_MONTH;
};

const TARGET_MONTH = parseMonthArg();

const formatDate = (day) => `${TARGET_YEAR}-${pad(TARGET_MONTH)}-${pad(day)}`;
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
  if (users.length < 2) {
    console.error('Need at least two users to seed reservations.');
    process.exit(1);
  }

  const eligibleUsers = users.filter((user) => !!user.id);
  const insertedReservations = [];
  let attempts = 0;

  while (insertedReservations.length < MAX_CREATIONS && attempts < MAX_CREATIONS * 20) {
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
        notes: '种子数据（3月）',
        userName,
      });
      insertedReservations.push(reservation);
      console.log(`✔ 创建 ${date} ${startTime}-${endTime}，主预约人 ${userName}，共同预约人 ${helper.name || helper.nameZh || helper.phoneNumber}`);
    } catch (error) {
      console.warn('创建预约失败，跳过：', error?.message || error);
    }
  }

  if (!insertedReservations.length) {
    console.log('未插入任何样本预约；请确保当前数据库中无冲突');
  } else {
    console.log(`完成，插入 ${insertedReservations.length} 条 3 月预约`);
  }
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('种子脚本执行失败：', error);
    process.exit(1);
  });
}
