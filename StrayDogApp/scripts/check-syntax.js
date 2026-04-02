const fs = require('fs');
const path = require('path');
const { transformSync } = require('@babel/core');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = ['src', 'App.js'];
const CODE_EXTS = new Set(['.js', '.jsx']);
const EXCLUDE_DIRS = new Set(['node_modules', '.expo', 'android', 'ios', 'assets']);

function walk(targetPath, out) {
  if (!fs.existsSync(targetPath)) return;

  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    const name = path.basename(targetPath);
    if (EXCLUDE_DIRS.has(name)) return;

    for (const child of fs.readdirSync(targetPath)) {
      walk(path.join(targetPath, child), out);
    }
    return;
  }

  const ext = path.extname(targetPath);
  if (CODE_EXTS.has(ext)) {
    out.push(targetPath);
  }
}

function parseFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  transformSync(source, {
    filename: filePath,
    babelrc: false,
    configFile: false,
    code: false,
    ast: false,
    sourceType: 'module',
    parserOpts: {
      plugins: [
        'jsx',
        'classProperties',
        'classPrivateProperties',
        'classPrivateMethods',
        'optionalChaining',
        'nullishCoalescingOperator',
        'objectRestSpread',
        'dynamicImport',
      ],
    },
  });
}

const files = [];
for (const entry of SCAN_DIRS) {
  walk(path.join(PROJECT_ROOT, entry), files);
}

const errors = [];
for (const file of files) {
  try {
    parseFile(file);
  } catch (e) {
    errors.push({ file, message: e && e.message ? e.message : String(e) });
  }
}

if (errors.length) {
  console.error(`Syntax check failed for ${errors.length} file(s):`);
  for (const err of errors) {
    console.error(`- ${path.relative(PROJECT_ROOT, err.file)}: ${err.message}`);
  }
  process.exit(1);
}

console.log(`Syntax check passed for ${files.length} file(s).`);
