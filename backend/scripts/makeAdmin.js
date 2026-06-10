/**
 * MAKE ADMIN — Promote or create an admin user
 * =============================================
 * The public /auth/register endpoint always creates regular users
 * (role: 'user'). This helper is the only supported way to obtain an
 * admin account, which is required to access the /admin portal.
 *
 * Usage:
 *   node scripts/makeAdmin.js <email> [password] [name]
 *
 * Behaviour:
 *   - If a user with <email> exists  → promotes them to role 'admin'.
 *   - If no such user exists         → creates one as an admin
 *                                       (password + name then required).
 *
 * Examples:
 *   node scripts/makeAdmin.js admin@busgo.com admin123 "Admin User"
 *   node scripts/makeAdmin.js existing.user@example.com
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

async function run() {
  const [, , email, password, name] = process.argv;

  if (!email) {
    console.error('Usage: node scripts/makeAdmin.js <email> [password] [name]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const normalizedEmail = email.toLowerCase().trim();
  let user = await User.findOne({ email: normalizedEmail });

  if (user) {
    user.role = 'admin';
    if (password) {
      user.password = password; // re-hashed by the User pre-save hook
      console.log('  (password reset to the value provided)');
    }
    await user.save();
    console.log(`✓ Promoted existing user to admin: ${user.email}`);
  } else {
    if (!password || !name) {
      console.error('No user found with that email. To create a new admin, pass: <email> <password> <name>');
      await mongoose.disconnect();
      process.exit(1);
    }
    // Password is hashed automatically by the User pre-save hook.
    user = await User.create({ name, email: normalizedEmail, password, role: 'admin' });
    console.log(`✓ Created new admin user: ${user.email}`);
  }

  console.log(`  _id : ${user._id}`);
  console.log(`  role: ${user.role}`);
  console.log('\nLog in with this account, then visit /admin in the app.');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('makeAdmin failed:', err);
  process.exit(1);
});
