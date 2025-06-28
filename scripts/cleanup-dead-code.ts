#!/usr/bin/env ts-node

/**
 * Dead Code Cleanup Script
 * Identifies and removes various types of dead/obsolete code
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { logger } from '../src/shared/utils/logger';

interface DeadCodeItem {
  type: 'COMPILED_JS' | 'DUPLICATE_CONFIG' | 'EMPTY_INDEX' | 'ORPHAN_TEST' | 'UNUSED_EXPORT';
  file: string;
  description: string;
  action: 'DELETE' | 'REVIEW' | 'MERGE';
  size?: number;
}

class DeadCodeCleaner {
  private rootPath: string;
  private deadCodeItems: DeadCodeItem[] = [];
  private deletedFiles: string[] = [];
  private reviewFiles: string[] = [];

  constructor() {
    this.rootPath = process.cwd();
  }

  async analyze(): Promise<void> {
    logger.info('🔍 Analyzing project for dead code...');
    
    await Promise.all([
      this.findCompiledJavaScriptFiles(),
      this.findDuplicateConfigFiles(),
      this.findEmptyIndexFiles(),
      this.findOrphanTests(),
      this.findUnusedExports()
    ]);

    this.generateReport();
  }

  private async findCompiledJavaScriptFiles(): Promise<void> {
    logger.info('  📦 Checking for compiled JavaScript files...');
    
    const jsFiles = await this.findFiles('.js', ['src/', 'scripts/', 'test/']);
    const jsMapFiles = await this.findFiles('.js.map', ['src/', 'scripts/', 'test/']);
    const dtsFiles = await this.findFiles('.d.ts', ['src/', 'scripts/', 'test/']);

    // Check if there's a corresponding .ts file for each .js file
    for (const jsFile of jsFiles) {
      const tsFile = jsFile.replace(/\.js$/, '.ts');
      try {
        await fs.access(tsFile);
        // TypeScript file exists, so JS file is compiled output
        const stats = await fs.stat(jsFile);
        this.deadCodeItems.push({
          type: 'COMPILED_JS',
          file: jsFile,
          description: 'Compiled JavaScript file (should be in dist/)',
          action: 'DELETE',
          size: stats.size
        });
      } catch {
        // No corresponding .ts file, might be legitimate JS
      }
    }

    // Add .js.map and .d.ts files in source directories
    [...jsMapFiles, ...dtsFiles].forEach(file => {
      if (!file.includes('node_modules/') && !file.includes('dist/')) {
        this.deadCodeItems.push({
          type: 'COMPILED_JS',
          file,
          description: 'Compiled artifact in source directory',
          action: 'DELETE'
        });
      }
    });
  }

  private async findDuplicateConfigFiles(): Promise<void> {
    logger.info('  ⚙️ Checking for duplicate configuration files...');
    
    const configs = [
      { root: '.eslintrc.js', config: 'config/.eslintrc.js' },
      { root: 'tsconfig.json', config: 'config/tsconfig.json' },
      { root: 'jest.config.js', config: 'config/jest.config.js' }
    ];

    for (const { root, config } of configs) {
      try {
        await fs.access(root);
        await fs.access(config);
        
        // Both files exist - check if they're different
        const rootContent = await fs.readFile(root, 'utf-8');
        const configContent = await fs.readFile(config, 'utf-8');
        
        if (rootContent === configContent) {
          this.deadCodeItems.push({
            type: 'DUPLICATE_CONFIG',
            file: config,
            description: `Duplicate of ${root}`,
            action: 'DELETE'
          });
        } else {
          this.deadCodeItems.push({
            type: 'DUPLICATE_CONFIG',
            file: config,
            description: `Different from ${root} - needs review`,
            action: 'REVIEW'
          });
        }
      } catch {
        // One or both files don't exist
      }
    }
  }

  private async findEmptyIndexFiles(): Promise<void> {
    logger.info('  📄 Checking for empty or minimal index files...');
    
    const indexFiles = await this.findFiles('index.ts', ['src/']);
    
    for (const file of indexFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n').filter(line => 
          line.trim() && 
          !line.trim().startsWith('//') && 
          !line.trim().startsWith('/*') &&
          !line.trim().startsWith('*')
        );

        if (lines.length === 0) {
          this.deadCodeItems.push({
            type: 'EMPTY_INDEX',
            file,
            description: 'Completely empty index file',
            action: 'DELETE'
          });
        } else if (lines.length === 1 && lines[0].includes('export {}')) {
          this.deadCodeItems.push({
            type: 'EMPTY_INDEX',
            file,
            description: 'Index file with only empty export',
            action: 'REVIEW'
          });
        }
      } catch (error) {
        logger.warn(`Could not read ${file}: ${error}`);
      }
    }
  }

  private async findOrphanTests(): Promise<void> {
    logger.info('  🧪 Checking for orphan test files...');
    
    const testFiles = await this.findFiles('.test.ts', ['test/', 'src/']);
    
    for (const testFile of testFiles) {
      // Extract the source file path from test file
      let sourceFile = testFile
        .replace('.test.ts', '.ts')
        .replace('/test/', '/src/')
        .replace('test/unit/', 'src/')
        .replace('test/integration/', 'src/');

      try {
        await fs.access(sourceFile);
      } catch {
        // Try alternative paths
        const alternativePaths = [
          sourceFile.replace('/src/', '/'),
          sourceFile.replace('src/', ''),
          testFile.replace('.test.ts', '.ts').replace(/test\/.*\//, 'src/')
        ];

        let found = false;
        for (const altPath of alternativePaths) {
          try {
            await fs.access(altPath);
            found = true;
            break;
          } catch {
            // Continue trying
          }
        }

        if (!found) {
          this.deadCodeItems.push({
            type: 'ORPHAN_TEST',
            file: testFile,
            description: 'Test file without corresponding source file',
            action: 'REVIEW'
          });
        }
      }
    }
  }

  private async findUnusedExports(): Promise<void> {
    logger.info('  🔗 Checking for unused exports (basic analysis)...');
    
    // This is a simplified analysis - a full analysis would require AST parsing
    const tsFiles = await this.findFiles('.ts', ['src/']);
    const exportPattern = /export\s+(?:class|interface|function|const|let|var|enum|type)\s+(\w+)/g;
    const importPattern = /import\s+.*?from\s+['"`]([^'"`]+)['"`]/g;

    const exports = new Map<string, string[]>();
    const imports = new Set<string>();

    // Collect all exports
    for (const file of tsFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const fileExports: string[] = [];
        let match;
        
        while ((match = exportPattern.exec(content)) !== null) {
          fileExports.push(match[1]);
        }
        
        if (fileExports.length > 0) {
          exports.set(file, fileExports);
        }

        // Collect imports
        while ((match = importPattern.exec(content)) !== null) {
          imports.add(match[1]);
        }
      } catch (error) {
        logger.warn(`Could not analyze ${file}: ${error}`);
      }
    }

    // Simple heuristic: if a file has exports but no imports reference it
    for (const [file, fileExports] of exports) {
      const relativePath = file.replace(this.rootPath + '/', '');
      const isReferenced = Array.from(imports).some(imp => 
        imp.includes(relativePath.replace('.ts', '')) ||
        imp.includes(relativePath.replace('/index.ts', ''))
      );

      if (!isReferenced && !file.includes('/index.ts')) {
        this.deadCodeItems.push({
          type: 'UNUSED_EXPORT',
          file,
          description: `Exports ${fileExports.join(', ')} but not imported anywhere`,
          action: 'REVIEW'
        });
      }
    }
  }

  private async findFiles(extension: string, directories: string[]): Promise<string[]> {
    const files: string[] = [];
    
    for (const dir of directories) {
      try {
        await this.walkDirectory(join(this.rootPath, dir), extension, files);
      } catch {
        // Directory doesn't exist
      }
    }
    
    return files;
  }

  private async walkDirectory(dir: string, extension: string, files: string[]): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await this.walkDirectory(fullPath, extension, files);
        } else if (entry.isFile() && entry.name.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore directories we can't read
    }
  }

  private generateReport(): void {
    logger.info('\n📊 Dead Code Analysis Report');
    logger.info('=====================================');

    const byType = this.deadCodeItems.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(byType).forEach(([type, count]) => {
      logger.info(`${type}: ${count} items`);
    });

    logger.info(`\nTotal items found: ${this.deadCodeItems.length}`);
    
    const totalSize = this.deadCodeItems
      .filter(item => item.size)
      .reduce((sum, item) => sum + (item.size || 0), 0);
    
    if (totalSize > 0) {
      logger.info(`Total size: ${(totalSize / 1024).toFixed(2)} KB`);
    }
  }

  async cleanup(): Promise<void> {
    logger.info('\n🧹 Starting cleanup...');
    
    const itemsToDelete = this.deadCodeItems.filter(item => item.action === 'DELETE');
    const itemsToReview = this.deadCodeItems.filter(item => item.action === 'REVIEW');

    // Delete safe items
    for (const item of itemsToDelete) {
      try {
        await fs.unlink(item.file);
        this.deletedFiles.push(item.file.replace(this.rootPath + '/', ''));
        logger.info(`🗑️ Deleted: ${item.file.replace(this.rootPath + '/', '')}`);
      } catch (error) {
        logger.warn(`Could not delete ${item.file}: ${error}`);
      }
    }

    // Log items that need review
    if (itemsToReview.length > 0) {
      logger.info('\n👀 Items requiring manual review:');
      itemsToReview.forEach(item => {
        logger.info(`  📋 ${item.file.replace(this.rootPath + '/', '')}: ${item.description}`);
        this.reviewFiles.push(item.file.replace(this.rootPath + '/', ''));
      });
    }

    logger.info(`\n✅ Cleanup complete: ${this.deletedFiles.length} files deleted, ${this.reviewFiles.length} files need review`);
  }

  getReport(): { deleted: string[]; review: string[]; analysis: DeadCodeItem[] } {
    return {
      deleted: this.deletedFiles,
      review: this.reviewFiles,
      analysis: this.deadCodeItems
    };
  }
}

async function main() {
  const cleaner = new DeadCodeCleaner();
  
  try {
    await cleaner.analyze();
    await cleaner.cleanup();
    
    const report = cleaner.getReport();
    
    // Save report
    await fs.writeFile(
      'dead-code-cleanup-report.json',
      JSON.stringify(report, null, 2)
    );
    
    logger.info('📄 Report saved to dead-code-cleanup-report.json');
    
  } catch (error) {
    logger.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { DeadCodeCleaner }; 