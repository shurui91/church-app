import { getDatabase } from '../database/db.js';

async function checkAttendanceTable() {
  const db = await getDatabase();
  
  try {
    console.log('检查 attendance 表结构...');
    
    // 检查表是否存在
    const tableExists = await db.get(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'attendance'
      )
    `, []);
    
    if (!tableExists || !tableExists.exists) {
      console.log('❌ attendance 表不存在');
      return;
    }
    
    console.log('✅ attendance 表存在');
    
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
    
    console.log('\nid 字段信息:');
    console.log(JSON.stringify(idColumn, null, 2));
    
    // 检查所有字段
    const allColumns = await db.all(`
      SELECT 
        column_name,
        data_type,
        column_default,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'attendance'
      ORDER BY ordinal_position
    `, []);
    
    console.log('\n所有字段:');
    allColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'NULL'})`);
    });
    
    // 检查序列是否存在
    const sequence = await db.get(`
      SELECT 
        sequence_name,
        last_value
      FROM information_schema.sequences
      WHERE sequence_name LIKE 'attendance_id%'
    `, []);
    
    console.log('\n序列信息:');
    console.log(JSON.stringify(sequence, null, 2));
    
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await db.close();
  }
}

checkAttendanceTable().then(() => {
  console.log('\n检查完成');
  process.exit(0);
}).catch(error => {
  console.error('执行失败:', error);
  process.exit(1);
});

