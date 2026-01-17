import { Attendance } from '../database/models/Attendance.js';
import { User } from '../database/models/User.js';

/**
 * Utility script to verify the attendance ON CONFLICT behavior.
 * Usage: node server/scripts/test-attendance-unique.js
 */
async function runTest() {
  console.log('🏁 Starting attendance unique constraint test...');

  const basePayload = {
    date: '2026-01-01',
    meetingType: 'homeMeeting',
    scope: 'small_group',
    scopeValue: 'A1',
    adultCount: 10,
    youthChildCount: 5,
    district: 'A',
    notes: 'Initial submission',
  };

  try {
    let user = (await User.findAll()).find((u) => u.role !== 'member');
    if (!user) {
      const created = await User.create('+11234567890', 'admin', null, '测试', 'Test', 'A', '1', 'test@example.com');
      user = created;
    }

    const first = await Attendance.createOrUpdate(
      basePayload.date,
      basePayload.meetingType,
      basePayload.scope,
      basePayload.scopeValue,
      basePayload.adultCount,
      basePayload.youthChildCount,
      user.id,
      basePayload.district,
      basePayload.notes
    );

    console.log('✅ First submit result:', first);

    const updated = await Attendance.createOrUpdate(
      basePayload.date,
      basePayload.meetingType,
      basePayload.scope,
      basePayload.scopeValue,
      basePayload.adultCount + 2,
      basePayload.youthChildCount + 1,
      user.id,
      basePayload.district,
      'Updated after conflict',
      first.id
    );

    console.log('✅ Second submit (conflict) result:', updated);

    if (first.id !== updated.id) {
      console.warn('⚠️ ID changed after conflict upsert (unexpected).');
    }

    const duplicated = await Attendance.findByUser(user.id, null, 0);
    console.log('📋 Current records for user:', duplicated.filter((r) => r.date === basePayload.date && r.scopeValue === basePayload.scopeValue));

    await Attendance.delete(updated.id, user.id, true);
    console.log('🧹 Cleaned up test record');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exitCode = 1;
  }
}

runTest();
