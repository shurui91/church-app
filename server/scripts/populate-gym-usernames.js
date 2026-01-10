import { getDatabase } from '../database/db.js';

async function populateGymReservationUserNames() {
  const db = await getDatabase();
  try {
    const updateQuery = `
      UPDATE gym_reservations gr
      SET user_name = (
        SELECT COALESCE(u.namezh, u.name, u.phonenumber)
        FROM users u
        WHERE u.id = gr.user_id
      )
      WHERE gr.user_name IS NULL OR gr.user_name = '';
    `;
    const result = await db.run(updateQuery);
    console.log(`[populate-gym-usernames] Rows updated: ${result.changes}`);
  } catch (error) {
    console.error('[populate-gym-usernames] Failed:', error);
  } finally {
    await db.close();
  }
}

populateGymReservationUserNames()
  .then(() => {
    console.log('[populate-gym-usernames] Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[populate-gym-usernames] Error', error);
    process.exit(1);
  });

