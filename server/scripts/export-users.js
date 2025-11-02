#!/usr/bin/env node

/**
 * Export users from local database to Railway
 * This script outputs commands that can be run in Railway Shell
 */

import { User } from '../database/models/User.js';
import { initDatabase } from '../database/init.js';

async function exportUsers() {
  try {
    await initDatabase();
    
    const users = await User.findAll();
    
    if (users.length === 0) {
      console.log('No users found in database.');
      return;
    }
    
    console.log('\n📋 Users in local database:\n');
    console.log('Run these commands in Railway Shell to add users:\n');
    console.log('cd server');
    console.log('');
    
    users.forEach((user) => {
      const phoneNumber = user.phoneNumber || 'N/A';
      const role = user.role || 'member';
      const nameZh = user.nameZh ? `"${user.nameZh}"` : '';
      const nameEn = user.nameEn ? `"${user.nameEn}"` : '';
      
      // Note: add-user.js doesn't support nameZh/nameEn yet
      console.log(`node scripts/add-user.js "${phoneNumber}" ${role}`);
    });
    
    console.log('\n✅ Total users:', users.length);
    console.log('\n💡 After adding users, verify with:');
    console.log('node scripts/list-users.js\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Error exporting users:', error);
    process.exit(1);
  }
}

exportUsers();

