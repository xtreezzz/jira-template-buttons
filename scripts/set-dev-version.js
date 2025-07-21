const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '../dist/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

manifest.version = manifest.version + '-dev';
manifest.name = manifest.name + ' (Dev)';

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('Dev version set:', manifest.version);
