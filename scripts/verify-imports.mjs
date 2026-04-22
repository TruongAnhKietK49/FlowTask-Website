import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();
const allowedExtensions = ['.js', '.jsx', '.mjs', '.cjs', '.json'];
const filesToScan = [];
const missingImports = [];

const importPatterns = [
  /import\s+(?:[^'"]+from\s+)?['"]([^'"]+)['"]/g,
  /export\s+[^'"]*from\s+['"]([^'"]+)['"]/g,
  /require\(\s*['"]([^'"]+)['"]\s*\)/g,
];

const walkDirectory = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist'].includes(entry.name)) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      walkDirectory(fullPath);
      continue;
    }

    if (allowedExtensions.includes(path.extname(entry.name))) {
      filesToScan.push(fullPath);
    }
  }
};

const resolveImport = (sourceFile, specifier) => {
  if (!specifier.startsWith('.')) {
    return true;
  }

  const basePath = path.resolve(path.dirname(sourceFile), specifier);
  const candidates = [
    basePath,
    ...allowedExtensions.map((extension) => `${basePath}${extension}`),
    ...allowedExtensions.map((extension) => path.join(basePath, `index${extension}`)),
  ];

  return candidates.some((candidate) => fs.existsSync(candidate));
};

walkDirectory(workspaceRoot);

for (const filePath of filesToScan) {
  const content = fs.readFileSync(filePath, 'utf8');

  for (const pattern of importPatterns) {
    for (const match of content.matchAll(pattern)) {
      const specifier = match[1];

      if (!resolveImport(filePath, specifier)) {
        missingImports.push({
          filePath,
          specifier,
        });
      }
    }
  }
}

if (missingImports.length) {
  console.error('Missing relative imports detected:');
  for (const item of missingImports) {
    console.error(`- ${path.relative(workspaceRoot, item.filePath)} -> ${item.specifier}`);
  }
  process.exit(1);
}

console.log(`Import verification passed for ${filesToScan.length} files.`);
