#!/usr/bin/env node

import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.join(projectRoot, 'dist');
const allowedExtensions = new Set(['.css', '.html', '.ico', '.js', '.json', '.png', '.svg', '.webmanifest']);
const blockedDirectories = new Set(['.git', '.github', '.openai', 'coverage', 'data', 'deploy', 'docs', 'node_modules', 'tests', 'vendor']);
const blockedFileName = /^(?:\.env(?:\..*)?|credentials(?:\..*)?|secrets(?:\..*)?)$|(?:private[-_.]?)?(?:key|pem|p12|pfx|crt|cer)|(?:github-config|token|secret).*\.php$/i;

function isSafePublicFile(relativePath) {
  const segments = relativePath.split(/[\\/]+/);
  if (segments.some((segment) => segment.startsWith('.') || blockedDirectories.has(segment.toLowerCase()))) return false;
  const fileName = segments.at(-1) || '';
  return !blockedFileName.test(fileName)
    && !fileName.endsWith('.map')
    && allowedExtensions.has(path.extname(fileName).toLowerCase());
}

async function copyFilteredTree(sourceRelative, destinationRelative = sourceRelative) {
  const sourceRoot = path.join(projectRoot, sourceRelative);
  const destinationRoot = path.join(outputRoot, destinationRelative);

  async function visit(sourceDirectory, destinationDirectory, prefix) {
    for (const entry of await readdir(sourceDirectory, { withFileTypes: true })) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.name.startsWith('.') || blockedDirectories.has(entry.name.toLowerCase())) continue;
      const sourcePath = path.join(sourceDirectory, entry.name);
      const destinationPath = path.join(destinationDirectory, entry.name);
      if (entry.isDirectory()) await visit(sourcePath, destinationPath, relativePath);
      else if (entry.isFile() && isSafePublicFile(relativePath)) {
        await mkdir(destinationDirectory, { recursive: true });
        await cp(sourcePath, destinationPath);
      }
    }
  }

  await visit(sourceRoot, destinationRoot, '');
}

async function copyRequiredFile(relativePath) {
  if (!isSafePublicFile(relativePath)) throw new Error(`Refusing to package a non-public frontend file: ${relativePath}`);
  const sourcePath = path.join(projectRoot, relativePath);
  if (!(await stat(sourcePath)).isFile()) throw new Error(`Expected a frontend file: ${relativePath}`);
  const destinationPath = path.join(outputRoot, relativePath);
  await mkdir(path.dirname(destinationPath), { recursive: true });
  await cp(sourcePath, destinationPath);
}

async function listFiles(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(fullPath, relativePath));
    else if (entry.isFile()) files.push(relativePath);
  }
  return files;
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

for (const file of ['index.html', '404.html', 'index.css', 'index.js', 'site-info.js']) await copyRequiredFile(file);
for (const tree of ['assets', 'components', 'pages']) await copyFilteredTree(tree);

for (const file of [
  'lib/Web-Framework/site-info.js',
  'lib/Web-Framework/site-runtime.js',
  'lib/Web-Framework/components/full-footer.js',
  'lib/Web-Framework/components/full-header.js',
  'lib/Web-Framework/components/full-page-toolbar.js',
  'lib/Web-Framework/components/mini-header.js',
  'lib/Web-Framework/styles/common.css',
]) await copyRequiredFile(file);

const packagedFiles = await listFiles(outputRoot);
const forbidden = packagedFiles.filter((file) => !isSafePublicFile(file));
if (forbidden.length) throw new Error(`Static output contains forbidden files: ${forbidden.slice(0, 10).join(', ')}`);
for (const required of ['index.html', 'site-info.js', 'components/app-search.js', 'pages/search.html']) {
  if (!packagedFiles.includes(required)) throw new Error(`Static output is missing ${required}`);
}

console.log(`Packaged ${packagedFiles.length} public frontend files into dist/`);
