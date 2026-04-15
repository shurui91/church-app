/**
 * 必须在其它本地模块之前 import，避免 sms 等模块在 dotenv 之前就读取到空的 process.env。
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
