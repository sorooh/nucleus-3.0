import crypto from 'crypto';

// Generate random secrets
const generateSecret = () => crypto.randomBytes(32).toString('hex');

console.log('=== Nucleus 3.0 - مفاتيح الأمان المولدة ===\n');

const secrets = {
  SRH_ROOT_SIGNATURE: generateSecret(),
  CHAT_HMAC_SECRET: generateSecret(),
  JWT_SECRET: generateSecret(),
  SESSION_SECRET: generateSecret()
};

console.log('أضف هذه المفاتيح إلى ملف .env:\n');

Object.entries(secrets).forEach(([key, value]) => {
  console.log(`${key}=${value}`);
});

console.log('\n=== انتهت عملية توليد المفاتيح ===');