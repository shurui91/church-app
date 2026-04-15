/**
 * Debug endpoint to check environment variables
 * Temporary route for debugging
 */

import express from 'express';
import {
  isLoginSmsDeliveryConfigured,
  isSmsProviderConfigured,
  isTwilioVerifyConfigured,
  shouldUseDummyVerification,
} from '../services/sms.js';

const router = express.Router();

router.get('/debug-env', (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV || 'undefined',
    isProduction: process.env.NODE_ENV === 'production',
    isDevMode: process.env.NODE_ENV !== 'production',
    twilioVerifyConfigured: isTwilioVerifyConfigured(),
    smsMessagesConfigured: isSmsProviderConfigured(),
    loginSmsDeliveryConfigured: isLoginSmsDeliveryConfigured(),
    shouldUseDummyVerification: shouldUseDummyVerification(),
    SMS_USE_DUMMY: process.env.SMS_USE_DUMMY ?? '(unset)',
    allEnvVars: Object.keys(process.env).filter(key => key.includes('NODE') || key.includes('ENV')),
  });
});

export default router;

