import { Attendance } from '../database/models/Attendance.js';

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
    createdBy: 1,
    district: 'A',
    notes: 'Initial submission',
  };

  try {
    const first = await Attendance.createOrUpdate(
      basePayload.date,
      basePayload.meetingType,
      basePayload.scope,
      basePayload.scopeValue,
      basePayload.adultCount,
      basePayload.youthChildCount,
      basePayload.createdBy,
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
      basePayload.createdBy,
      basePayload.district,
      'Updated after conflict',
      first.id
    );

    console.log('✅ Second submit (conflict) result:', updated);

    if (first.id !== updated.id) {
      console.warn('⚠️ ID changed after conflict upsert (unexpected).');
    }

    const duplicated = await Attendance.findByUser(basePayload.createdBy, null, 0);
    console.log('📋 Current records for user:', duplicated.filter((r) => r.date === basePayload.date && r.scopeValue === basePayload.scopeValue));

    await Attendance.delete(updated.id, basePayload.createdBy, true);
    console.log('🧹 Cleaned up test record');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exitCode = 1;
  }
}

runTest();
