-- 检查 attendance 表结构
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'attendance'
ORDER BY ordinal_position;

-- 检查 id 字段是否是 SERIAL
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'attendance' 
AND column_name = 'id';

-- 如果 id 字段不是 SERIAL，需要修复
-- 首先检查是否有序列
SELECT sequence_name 
FROM information_schema.sequences 
WHERE sequence_name LIKE 'attendance_id%';

-- 如果 id 字段不是 SERIAL，执行以下 SQL 来修复：
-- 注意：这需要先备份数据，因为会修改表结构

-- 1. 创建序列（如果不存在）
CREATE SEQUENCE IF NOT EXISTS attendance_id_seq;

-- 2. 设置 id 字段的默认值为序列的下一个值
ALTER TABLE attendance 
ALTER COLUMN id SET DEFAULT nextval('attendance_id_seq');

-- 3. 设置序列的当前值为表中最大的 id 值（如果表中有数据）
SELECT setval('attendance_id_seq', COALESCE((SELECT MAX(id) FROM attendance), 1), false);

-- 4. 确保 id 字段是主键
ALTER TABLE attendance 
ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);

