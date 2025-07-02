import { promises as fs } from 'fs';
import path from 'path';

/**
 * Check Ontology File Sizes
 *
 * Fails (exit code 1) if any file under `ontologies/` exceeds the MAX_SIZE_KB.
 * Intended to run as a pre-commit hook to prevent large binary/data files from
 * bloating the repo.
 *
 * Configure the max size via env var MAX_SIZE_KB (default 500 KB).
 */

const MAX_SIZE_KB = Number(process.env.MAX_SIZE_KB) || 500;
const ROOT = path.resolve(__dirname, '../../ontologies');
const EXCLUDE_DIRS = new Set(['generated', 'dist', 'build', 'seed']);

async function walk(dir: string, files: string[] = []): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue; // skip hidden
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      await walk(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  try {
    const exists = await fs
      .stat(ROOT)
      .then(st => st.isDirectory())
      .catch(() => false);
    if (!exists) return; // no ontologies dir – nothing to do

    const files = await walk(ROOT);
    const oversized: { path: string; sizeKB: number }[] = [];

    for (const file of files) {
      const { size } = await fs.stat(file);
      const sizeKB = size / 1024;
      if (sizeKB > MAX_SIZE_KB) {
        oversized.push({ path: path.relative(process.cwd(), file), sizeKB });
      }
    }

    if (oversized.length) {
      console.error(`\n❌ Found ${oversized.length} oversized file(s) in ontologies (>${MAX_SIZE_KB} KB):`);
      oversized.forEach(f => console.error(`  • ${f.path} – ${f.sizeKB.toFixed(1)} KB`));
      console.error('\n👉  Reduce size or move the file outside `ontologies/` (e.g., seed/, docs/, or use LFS).');
      process.exit(1);
    }

    console.log('✅ Ontology size check passed.');
  } catch (err) {
    console.error('❌ Error during ontology size check:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main();
} 