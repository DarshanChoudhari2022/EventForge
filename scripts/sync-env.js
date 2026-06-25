import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const rootEnvPath = path.join(rootDir, '.env');

const targetDirs = [
  path.join(rootDir, 'apps', 'web'),
  path.join(rootDir, 'apps', 'api'),
  path.join(rootDir, 'apps', 'workers')
];

if (!fs.existsSync(rootEnvPath)) {
  console.error('❌ Root .env file not found. Copy .env.example to .env first.');
  process.exit(1);
}

targetDirs.forEach((dir) => {
  if (fs.existsSync(dir)) {
    const targetEnvPath = path.join(dir, '.env');
    fs.copyFileSync(rootEnvPath, targetEnvPath);
    console.log(`✅ Copied .env to ${path.relative(rootDir, targetEnvPath)}`);
  }
});
