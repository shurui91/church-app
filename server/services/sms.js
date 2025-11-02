import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient = null;

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
 * Send SMS verification code
 * @param {string} toPhoneNumber - Recipient phone number (E.164 format)
 * @param {string} code - Verification code
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function sendVerificationCode(toPhoneNumber, code) {
  const client = getTwilioClient();

  if (!client) {
    console.warn('Twilio not configured. SMS sending skipped (development mode).');
    // In development, log the code instead of sending
    console.log(`[DEV] Verification code for ${toPhoneNumber}: ${code}`);
    return {
      success: true,
      message: '验证码已发送（开发模式）',
    };
  }

  if (!phoneNumber) {
    return {
      success: false,
      message: '短信服务未配置',
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
