import twilio from 'twilio';

/** 运行时读取，避免 dotenv 晚于 sms 模块加载时误判；并忽略 .env.example 占位符 */
function twilioEnv() {
  const raw = {
    accountSid: process.env.TWILIO_ACCOUNT_SID?.trim(),
    authToken: process.env.TWILIO_AUTH_TOKEN?.trim(),
    phoneNumber: process.env.TWILIO_PHONE_NUMBER?.trim(),
    verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID?.trim(),
  };
  const isPlaceholder = (v) =>
    !v ||
    /your-twilio|changeme|placeholder|example\.com/i.test(v) ||
    v === 'your-secret-key-here-change-in-production';
  return {
    accountSid: isPlaceholder(raw.accountSid) ? '' : raw.accountSid,
    authToken: isPlaceholder(raw.authToken) ? '' : raw.authToken,
    phoneNumber: isPlaceholder(raw.phoneNumber) ? '' : raw.phoneNumber,
    verifyServiceSid: isPlaceholder(raw.verifyServiceSid) ? '' : raw.verifyServiceSid,
  };
}

let twilioClient = null;
let twilioClientCacheKey = '';

/** 未接真实短信时使用；与 auth 路由中校验一致 */
export const MOCK_VERIFICATION_CODE = '123456';

/**
 * 是否使用固定验证码（不发真实短信、校验走 123456 + 白名单）。
 * - SMS_USE_FIXED_CODE=true|false 显式开关
 * - 未设置时：非 production 默认为 mock，production 默认走真实 Twilio（若已配置）
 * - production 且 SMS_USE_FIXED_CODE=true 时须同时设置 SMS_FIXED_CODE_ALLOWED_IN_PRODUCTION=true，否则不启用 mock（防误配）
 */
export function isFixedCodeSmsMode() {
  const explicit = process.env.SMS_USE_FIXED_CODE;
  let enabled;
  if (explicit === 'true') enabled = true;
  else if (explicit === 'false') enabled = false;
  else enabled = process.env.NODE_ENV !== 'production';

  if (!enabled) return false;
  if (process.env.NODE_ENV === 'production' && explicit === 'true') {
    if (process.env.SMS_FIXED_CODE_ALLOWED_IN_PRODUCTION !== 'true') {
      console.warn(
        '[SMS] production 下 SMS_USE_FIXED_CODE=true 需配合 SMS_FIXED_CODE_ALLOWED_IN_PRODUCTION=true，否则不启用固定验证码'
      );
      return false;
    }
  }
  return true;
}

/**
 * Account SID + Auth Token + Verify Service SID → 使用 Twilio Verify（发码/校验由 Twilio 托管，不写本地 verification_codes）
 */
export function isTwilioVerifyConfigured() {
  const e = twilioEnv();
  return !!(e.accountSid && e.authToken && e.verifyServiceSid);
}

/**
 * Twilio 三项齐全才视为已配置「传统」短信发送（Messages API + 自建验证码表）。
 * 若已配置 Verify，登录应走 Verify，不需要发件号码。
 */
export function isSmsProviderConfigured() {
  const e = twilioEnv();
  return !!(e.accountSid && e.authToken && e.phoneNumber);
}

/**
 * 生产环境是否具备任一可用的短信登录能力：Verify 优先，否则 Messages+自建码。
 */
export function isLoginSmsDeliveryConfigured() {
  return isTwilioVerifyConfigured() || isSmsProviderConfigured();
}

/**
 * 发码/校验是否走 dummy（MOCK_VERIFICATION_CODE），不调用真实短信。
 * - SMS_USE_DUMMY=true：强制 dummy（适合 Railway 等生产环境暂不接短信）
 * - SMS_USE_DUMMY=false：仅按下面规则
 * - 显式固定码模式（isFixedCodeSmsMode），或
 * - 未配置任一可用渠道（Verify / Messages）——无法发真短信，只能 dummy
 */
export function shouldUseDummyVerification() {
  if (process.env.SMS_USE_DUMMY === 'true') return true;
  if (process.env.SMS_USE_DUMMY === 'false') return false;
  return isFixedCodeSmsMode() || !isLoginSmsDeliveryConfigured();
}

/**
 * 生产或显式要求时：未配置短信则必须失败，不得假装已发送。
 */
function mustSendRealSms() {
  return (
    process.env.NODE_ENV === 'production' || process.env.SMS_REQUIRE_PROVIDER === 'true'
  );
}

/**
 * Initialize Twilio client（凭证随当前 process.env）
 */
function getTwilioClient() {
  const { accountSid, authToken } = twilioEnv();
  const key = `${accountSid}:${authToken}`;
  if (!accountSid || !authToken) {
    twilioClient = null;
    twilioClientCacheKey = '';
    return null;
  }
  if (!twilioClient || twilioClientCacheKey !== key) {
    twilioClient = twilio(accountSid, authToken);
    twilioClientCacheKey = key;
  }
  return twilioClient;
}

/**
 * Generate a random 6-digit verification code
 * @returns {string} 6-digit code
 */
export function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Twilio Verify：发起短信验证码（受邀用户白名单已在路由层校验）
 * @returns {Promise<{ success: boolean; message?: string; sid?: string }>}
 */
export async function startTwilioVerification(toPhoneNumber) {
  if (shouldUseDummyVerification()) {
    console.log(`[Verify] dummy mode: skip API; verify with ${MOCK_VERIFICATION_CODE}`);
    return {
      success: true,
      message: '验证码已发送（开发模式）',
    };
  }

  const client = getTwilioClient();
  const { verifyServiceSid } = twilioEnv();

  if (!isTwilioVerifyConfigured()) {
    if (mustSendRealSms()) {
      console.error(
        '[Verify] 缺少 TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_VERIFY_SERVICE_SID'
      );
      return {
        success: false,
        message: '短信验证服务未配置，无法发送验证码',
      };
    }
    console.warn('[Verify] Twilio Verify 未配置，开发环境跳过真实发送');
    console.log(`[DEV][Verify] would send verification to ${toPhoneNumber}`);
    return {
      success: true,
      message: '验证码已发送（开发模式）',
    };
  }

  if (!client) {
    return {
      success: false,
      message: '短信验证服务配置错误',
    };
  }

  try {
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({
        to: toPhoneNumber,
        channel: 'sms',
      });

    console.log(`[Verify] Started verification for ${toPhoneNumber}, status=${verification.status}`);
    return {
      success: true,
      message: '验证码已发送',
      sid: verification.sid,
    };
  } catch (error) {
    console.error('[Verify] verifications.create failed:', error);
    return {
      success: false,
      message: '发送验证码失败，请稍后重试',
      error: error.message,
    };
  }
}

/**
 * Twilio Verify：校验用户输入的验证码。
 * 与官方示例一致：
 *   client.verify.v2.services(serviceSid).verificationChecks.create({ to, code })
 * @see https://www.twilio.com/docs/verify/api/check
 * @returns {Promise<{ valid: boolean; message?: string; status?: string }>}
 */
export async function verifyTwilioCode(toPhoneNumber, code) {
  const client = getTwilioClient();
  const { verifyServiceSid } = twilioEnv();

  if (!isTwilioVerifyConfigured()) {
    return {
      valid: false,
      message: '短信验证服务未配置',
    };
  }

  if (!client) {
    return {
      valid: false,
      message: '短信验证服务配置错误',
    };
  }

  try {
    // 等价于: .verificationChecks.create({ to, code }).then(verification_check => ...)
    const verificationCheck = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({
        to: toPhoneNumber,
        code: String(code).trim(),
      });

    console.log(`[Verify] verificationChecks status=${verificationCheck.status}`);

    if (verificationCheck.status === 'approved') {
      return { valid: true, message: '验证成功', status: verificationCheck.status };
    }

    return {
      valid: false,
      message: '验证码错误或已过期',
      status: verificationCheck.status,
    };
  } catch (error) {
    console.error('[Verify] verificationChecks.create failed:', error);
    return {
      valid: false,
      message: error.message || '验证失败，请稍后重试',
    };
  }
}

/**
 * Send SMS verification code
 * @param {string} toPhoneNumber - Recipient phone number (E.164 format)
 * @param {string} code - Verification code
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function sendVerificationCode(toPhoneNumber, code) {
  if (shouldUseDummyVerification()) {
    console.log(`[SMS] dummy mode: skip send; use ${MOCK_VERIFICATION_CODE} to verify`);
    return {
      success: true,
      message: '验证码已发送（开发模式）',
    };
  }

  const client = getTwilioClient();
  const { phoneNumber } = twilioEnv();

  if (!isSmsProviderConfigured()) {
    if (mustSendRealSms()) {
      console.error(
        '[SMS] 生产环境或未配置短信：缺少 TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER，拒绝发送'
      );
      return {
        success: false,
        message: '短信服务未配置，无法发送验证码',
      };
    }
    console.warn('Twilio not configured. SMS sending skipped (development mode).');
    console.log(`[DEV] Verification code for ${toPhoneNumber}: ${code}`);
    return {
      success: true,
      message: '验证码已发送（开发模式）',
    };
  }

  if (!client) {
    if (mustSendRealSms()) {
      console.error('[SMS] Twilio 客户端初始化失败');
      return {
        success: false,
        message: '短信服务配置错误，无法发送验证码',
      };
    }
    console.warn('Twilio client unavailable; dev bypass.');
    console.log(`[DEV] Verification code for ${toPhoneNumber}: ${code}`);
    return {
      success: true,
      message: '验证码已发送（开发模式）',
    };
  }

  try {
    const message = await client.messages.create({
      body: `您的验证码是：${code}，5分钟内有效。请勿泄露给他人。`,
      from: phoneNumber ?? '',
      to: toPhoneNumber,
    });

    console.log(`SMS sent to ${toPhoneNumber}, SID: ${message.sid}`);
    return {
      success: true,
      message: '验证码已发送',
      sid: message.sid,
    };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return {
      success: false,
      message: '发送验证码失败，请稍后重试',
      error: error.message,
    };
  }
}

/**
 * Validate phone number format (basic validation)
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} True if valid format
 */
export function validatePhoneNumber(phoneNumber) {
  // Basic validation: should start with + and contain digits
  // You can make this more specific based on your needs
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber);
}

/**
 * Normalize phone number (ensure it starts with +)
 * @param {string} phoneNumber - Phone number to normalize
 * @returns {string} Normalized phone number
 */
export function normalizePhoneNumber(phoneNumber) {
  // Remove all spaces and dashes
  let normalized = phoneNumber.replace(/[\s\-]/g, '');

  // If doesn't start with +, try to add country code
  // For now, assume if it doesn't start with +, it's a US number
  if (!normalized.startsWith('+')) {
    // If starts with 1, add +
    if (normalized.startsWith('1') && normalized.length === 11) {
      normalized = '+' + normalized;
    } else if (normalized.length === 10) {
      // Assume US number, add +1
      normalized = '+1' + normalized;
    } else {
      // Try to add + as is (might need more specific handling)
      normalized = '+' + normalized;
    }
  }

  return normalized;
}
