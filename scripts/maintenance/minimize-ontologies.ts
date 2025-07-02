import { promises as fs } from 'fs';
import path from 'path';
import zlib from 'zlib';

/**
 * Minimize Ontologies Utility
 *
 * This script performs housekeeping tasks inside the top-level `ontologies/` directory:
 *   1. Removes build / generated artefacts (directories named `generated`, `dist`, `build`).
 *   2. Compresses large fixture files (> 1 MB) in any `seed/` folder using Gzip.
 *
 * Run with:  ts-node scripts/maintenance/minimize-ontologies.ts
 * (or add an npm script: "ontologies:minimize": "ts-node scripts/maintenance/minimize-ontologies.ts")
 */

const ROOT = path.resolve(__dirname, '../../ontologies');
const GENERATED_DIR_NAMES = new Set(['generated', 'dist', 'build']);
const ONE_MEGABYTE = 1 * 1024 * 1024; // 1 MB

async function removeGeneratedDirs(dir: string) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  await Promise.all(
    entries.map(async entry => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (GENERATED_DIR_NAMES.has(entry.name)) {
          console.log(`🗑️  Removing generated directory: ${fullPath}`);
          await fs.rm(fullPath, { recursive: true, force: true });
          return;
        }
        await removeGeneratedDirs(fullPath);
      }
    }),
  );
}

async function compressLargeSeedFiles(dir: string) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await compressLargeSeedFiles(fullPath);
    } else {
      if (fullPath.includes(`${path.sep}seed${path.sep}`) && !fullPath.endsWith('.gz')) {
        const stats = await fs.stat(fullPath);
        if (stats.size > ONE_MEGABYTE) {
          const gzPath = `${fullPath}.gz`;
          console.log(`📦 Compressing large seed file: ${fullPath} → ${gzPath}`);
          const data = await fs.readFile(fullPath);
          const compressed = zlib.gzipSync(data);
          await fs.writeFile(gzPath, compressed);
          await fs.unlink(fullPath);
        }
      }
    }
  }
}

async function main() {
  try {
    const ontologiesExists = await fs
      .stat(ROOT)
      .then(stats => stats.isDirectory())
      .catch(() => false);
    if (!ontologiesExists) {
      console.error('❌ ontologies directory not found.');
      process.exit(1);
    }

    console.log('🔍 Cleaning generated artefacts …');
    await removeGeneratedDirs(ROOT);

    console.log('🔍 Compressing large seed fixtures …');
    await compressLargeSeedFiles(ROOT);

    console.log('✅ Ontology minimization complete.');
  } catch (err) {
    console.error('❌ Error during ontology minimization:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main();
} 