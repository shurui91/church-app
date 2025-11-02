#!/usr/bin/env node

/**
 * Generate a random JWT secret
 * Usage: node scripts/generate-jwt-secret.js
 */

import crypto from 'crypto';

const secret = crypto.randomBytes(32).toString('base64');
console.log('\n🔑 Generated JWT Secret:');
console.log(secret);
console.log('\n📋 Copy this and set it as JWT_SECRET environment variable in Railway');
console.log('');

