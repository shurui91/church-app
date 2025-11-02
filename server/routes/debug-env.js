/**
 * Debug endpoint to check environment variables
 * Temporary route for debugging
 */

import express from 'express';

const router = express.Router();

router.get('/debug-env', (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV || 'undefined',
    isProduction: process.env.NODE_ENV === 'production',
    isDevMode: process.env.NODE_ENV !== 'production',
    allEnvVars: Object.keys(process.env).filter(key => key.includes('NODE') || key.includes('ENV')),
  });
});

export default router;

