#!/usr/bin/env node
/**
 * 将 gym_reservations_duration_check 改为允许 duration ∈ {60, 120, 180}。
 * 若 ADD CONSTRAINT 报错「violated by some row」，本脚本会先规整 duration 再加重约束。
 *
 * 用法（在 server 目录）：
 *   node scripts/migrate-gym-reservations-duration-check.js
 */
import 'dotenv/config';
import { getDatabase } from '../database/db.js';

async function main() {
  const db = await getDatabase();
  try {
    await db.run(`
      ALTER TABLE gym_reservations
      DROP CONSTRAINT IF EXISTS gym_reservations_duration_check
    `);
    await db.run(`
      UPDATE gym_reservations
      SET duration = duration * 60
      WHERE duration IN (1, 2, 3, 4, 5, 6)
    `);
    await db.run(`
      UPDATE gym_reservations
      SET duration = LEAST(180, GREATEST(60, (ROUND(duration::numeric / 60) * 60)::integer))
      WHERE duration NOT IN (60, 120, 180)
    `);
    await db.run(`
      ALTER TABLE gym_reservations
      ADD CONSTRAINT gym_reservations_duration_check
        CHECK (duration IN (60, 120, 180))
    `);
    console.log('✓ gym_reservations_duration_check 已更新为允许 60、120、180 分钟');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await db.close();
  }
}

main();
