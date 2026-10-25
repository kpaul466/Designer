import fs from 'fs';
import { execSync } from 'child_process';

let commitHash = 'unknown';
try {
  commitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
  commitHash = 'latest';
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = pkg.version || '2.4.0';

const versionData = {
  version,
  commit: commitHash,
  buildTimestamp: Date.now(),
  buildDate: new Date().toISOString(),
  releaseUrl: 'https://github.com/kpaul466/Designer/releases/latest',
  downloadUrl: 'https://kpaul466.github.io/Designer/download.html',
};

fs.writeFileSync('public/version.json', JSON.stringify(versionData, null, 2));
console.log(`Generated public/version.json for v${version} (commit: ${commitHash})`);

