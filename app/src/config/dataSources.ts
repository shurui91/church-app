import leeArchiveFallbackJson from '../data/lee_archive_fallback.json';

/**
 * 数据源配置
 * 统一管理应用中使用的外部数据源 URL
 */

/**
 * 李常受文集数据源 URL
 * 请将此处替换为您的 Cloudflare R2 文件 URL
 *
 * Cloudflare R2 URL 格式示例：
 * - 公开访问：https://your-bucket-name.r2.cloudflarestorage.com/lee_archive.json
 * - 自定义域名：https://your-domain.com/lee_archive.json
 * - R2 公共访问端点：https://pub-xxxxx.r2.dev/lee_archive.json
 */
export interface Article {
  id: string;
  title: string;
  reading_date: string;
  last_available_day: string;
  year: string;
  volume: number;
  topic: string;
  chapter: number;
  content: string;
}

export interface LeeArchive {
  meta: {
    version: string;
    last_updated: string;
    total_articles: number;
  };
  articles: Article[];
}

export const LEE_ARCHIVE_URL =
  process.env.EXPO_PUBLIC_LEE_ARCHIVE_URL ||
  'https://pub-6765198a047d48deabd5465ed928164b.r2.dev/lee_archive.json';

const backupArchive = leeArchiveFallbackJson as LeeArchive;
const backupDates = new Set(backupArchive.articles.map((a) => a.reading_date));

export const LEE_ARCHIVE_FALLBACK = backupArchive;

export const getBackupArticle = (date: string) =>
  backupArchive.articles.find((article) => article.reading_date === date);

export const getBackupValidDates = () => new Set(backupDates);
