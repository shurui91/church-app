import { getDatabase } from '../database/db.js';

async function fixAttendanceId() {
  const db = await getDatabase();
  
  try {
    console.log('检查 attendance 表的 id 字段...');
    
    // 检查 id 字段的定义
    const idColumn = await db.get(`
      SELECT 
        column_name,
        data_type,
        column_default,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'attendance' 
      AND column_name = 'id'
    `, []);
    
    console.log('id 字段信息:', JSON.stringify(idColumn, null, 2));
    
    if (!idColumn) {
      console.log('❌ id 字段不存在');
      return;
    }
    
    // 检查是否有默认值（SERIAL 应该有默认值）
    if (!idColumn.column_default || !idColumn.column_default.includes('nextval')) {
      console.log('⚠️  id 字段没有自增序列，正在修复...');
      
      // 创建序列
      try {
        await db.run(`CREATE SEQUENCE IF NOT EXISTS attendance_id_seq`, []);
        console.log('✅ 序列创建成功');
      } catch (err) {
        console.log('序列可能已存在:', err.message);
      }
      
      // 设置默认值
      await db.run(`ALTER TABLE attendance ALTER COLUMN id SET DEFAULT nextval('attendance_id_seq')`, []);
      console.log('✅ 设置 id 字段默认值成功');
      
      // 设置序列的当前值
      const maxId = await db.get(`SELECT MAX(id) as max_id FROM attendance`, []);
      const currentMax = maxId?.max_id || 0;
      await db.run(`SELECT setval('attendance_id_seq', $1, false)`, [Math.max(currentMax, 1)]);
      console.log(`✅ 设置序列当前值为 ${Math.max(currentMax, 1)}`);
      
      console.log('✅ id 字段修复完成');
    } else {
      console.log('✅ id 字段已经有自增序列');
    }
    
    // 再次检查
    const updatedColumn = await db.get(`
      SELECT 
        column_name,
        data_type,
        column_default,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'attendance' 
      AND column_name = 'id'
    `, []);
    
    console.log('\n修复后的 id 字段信息:', JSON.stringify(updatedColumn, null, 2));
    
  } catch (error) {
    console.error('❌ 错误:', error);
    throw error;
  } finally {
    await db.close();
  }
}

fixAttendanceId().then(() => {
  console.log('\n✅ 修复完成');
  process.exit(0);
}).catch(error => {
  console.error('❌ 执行失败:', error);
  process.exit(1);
});

