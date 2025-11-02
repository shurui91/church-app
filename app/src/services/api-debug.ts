/**
 * Debug utility to check API configuration
 * Remove this file after debugging
 */

// Log current API configuration
console.log('=== API Configuration Debug ===');
console.log('EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL);
console.log('API_BASE_URL:', process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000');
console.log('All EXPO_PUBLIC_* vars:', Object.keys(process.env).filter(key => key.startsWith('EXPO_PUBLIC_')));
console.log('=============================');

