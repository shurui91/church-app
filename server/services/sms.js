import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
/** Twilio Console → Verify → Service SID (以 VA 开头) */
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

let twilioClient = null;

/**
 * Account SID + Auth Token + Verify Service SID → 使用 Twilio Verify（发码/校验由 Twilio 托管，不写本地 verification_codes）
 */
export function isTwilioVerifyConfigured() {
  return !!(accountSid && authToken && verifyServiceSid);
}

/**
 * Twilio 三项齐全才视为已配置「传统」短信发送（Messages API + 自建验证码表）。
 * 若已配置 Verify，登录应走 Verify，不需要发件号码。
 */
export function isSmsProviderConfigured() {
  return !!(accountSid && authToken && phoneNumber);
}

/**
 * 生产环境是否具备任一可用的短信登录能力：Verify 优先，否则 Messages+自建码。
 */
export function isLoginSmsDeliveryConfigured() {
  return isTwilioVerifyConfigured() || isSmsProviderConfigured();
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
 * Initialize Twilio client
 */
function getTwilioClient() {
  if (!twilioClient && accountSid && authToken) {
    twilioClient = twilio(accountSid, authToken);
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
  const client = getTwilioClient();

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
  const client = getTwilioClient();

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
      from: phoneNumber,
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
