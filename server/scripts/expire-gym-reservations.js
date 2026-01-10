import { GymReservation } from '../database/models/GymReservation.js';

async function run() {
  try {
    console.log('[expire-gym-reservations] Running expiration job...');
    await GymReservation.cancelPendingExpired();
    console.log('[expire-gym-reservations] Done');
  } catch (error) {
    console.error('[expire-gym-reservations] Error:', error);
    process.exit(1);
  }
}

run();

