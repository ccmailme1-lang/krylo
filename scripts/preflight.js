const fs = require('fs');
const path = require('path');

const required = [
  'three',
  'react-spring',
  'framer-motion',
  'ethers',
  'turf',
  'd3',
  'crypto-js',
  'exif-reader',
  'xstate',
];

const missing = [];

required.forEach(pkg => {
  try {
    require.resolve(pkg, { paths: [path.resolve(__dirname, '../node_modules')] });
  } catch (e) {
    missing.push(pkg);
  }
});

if (missing.length > 0) {
  console.error('\n🚫 KRYLO PRE-FLIGHT FAILED');
  console.error('Missing dependencies:', missing.join(', '));
  console.error('Run: yarn add ' + missing.join(' '));
  process.exit(1);
}

const envPath = path.resolve(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  console.error('\n🚫 KRYLO PRE-FLIGHT FAILED: Missing .env file.');
  process.exit(1);
}

const env = fs.readFileSync(envPath, 'utf8');
if (!env.includes('KRYLO_PUBLIC_KEY')) {
  console.error('\n🚫 KRYLO PRE-FLIGHT FAILED: KRYLO_PUBLIC_KEY required.');
  process.exit(1);
}

console.log('✅ KRYLO PRE-FLIGHT PASSED — Environment Ready.');
