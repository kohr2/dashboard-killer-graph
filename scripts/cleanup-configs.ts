#!/usr/bin/env ts-node

/**
 * Configuration Cleanup Script
 * Removes duplicate and obsolete configuration files
 */

import { promises as fs } from 'fs';
import { logger } from '../src/shared/utils/logger';

class ConfigCleaner {
  private rootPath: string;
  private cleanedFiles: string[] = [];

  constructor() {
    this.rootPath = process.cwd();
  }

  async cleanup(): Promise<void> {
    logger.info('🧹 Cleaning up configuration files...');
    
    await Promise.all([
      this.cleanupDuplicateESLintConfigs(),
      this.cleanupEmptyIndexFiles(),
      this.cleanupTSConfigMaps()
    ]);

    this.generateReport();
  }

  private async cleanupDuplicateESLintConfigs(): Promise<void> {
    logger.info('  ⚙️ Checking ESLint configurations...');
    
    try {
      // Check if both root and config eslint files exist
      const rootEslint = '.eslintrc.js';
      const configEslint = 'config/.eslintrc.js';
      
      const [rootExists, configExists] = await Promise.all([
        this.fileExists(rootEslint),
        this.fileExists(configEslint)
      ]);

      if (rootExists && configExists) {
        // Read both files to compare
        const [rootContent, configContent] = await Promise.all([
          fs.readFile(rootEslint, 'utf-8'),
          fs.readFile(configEslint, 'utf-8')
        ]);

        // The config version is more comprehensive, keep it and remove root
        if (configContent.includes('import/no-restricted-paths')) {
          logger.info(`    🔄 Config version is more comprehensive, keeping config/.eslintrc.js`);
          // Move config to root and remove duplicate
          await fs.copyFile(configEslint, rootEslint);
          await fs.unlink(configEslint);
          this.cleanedFiles.push('config/.eslintrc.js (merged to root)');
        }
      }
    } catch (error) {
      logger.warn(`Could not cleanup ESLint configs: ${error}`);
    }
  }

  private async cleanupEmptyIndexFiles(): Promise<void> {
    logger.info('  📄 Removing empty index files...');
    
    const emptyIndexFiles = [
      'src/ontologies/crm/interface/index.ts',
      'src/ontologies/financial/application/index.ts',
      'src/ontologies/financial/domain/index.ts',
      'src/ontologies/financial/infrastructure/index.ts',
      'src/ontologies/financial/interface/index.ts'
    ];

    for (const file of emptyIndexFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const meaningfulLines = content
          .split('\n')
          .filter(line => 
            line.trim() && 
            !line.trim().startsWith('//') && 
            !line.trim().startsWith('/*') &&
            !line.trim().startsWith('*') &&
            line.trim() !== 'export {};'
          );

        if (meaningfulLines.length === 0) {
          await fs.unlink(file);
          this.cleanedFiles.push(file);
          logger.info(`    🗑️ Removed empty index: ${file}`);
        }
      } catch (error) {
        // File doesn't exist or can't be read
      }
    }
  }

  private async cleanupTSConfigMaps(): Promise<void> {
    logger.info('  🗺️ Removing TypeScript build artifacts...');
    
    const patterns = [
      'src/platform/extension-framework/event-bus.d.ts.map',
      'src/platform/extension-framework/extension-registry.d.ts.map'
    ];

    for (const file of patterns) {
      try {
        await fs.unlink(file);
        this.cleanedFiles.push(file);
        logger.info(`    🗑️ Removed build artifact: ${file}`);
      } catch (error) {
        // File doesn't exist
      }
    }
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  private generateReport(): void {
    logger.info('\n📊 Configuration Cleanup Report');
    logger.info('=====================================');
    
    if (this.cleanedFiles.length === 0) {
      logger.info('✨ No configuration cleanup needed');
    } else {
      logger.info(`🧹 Cleaned ${this.cleanedFiles.length} configuration files:`);
      this.cleanedFiles.forEach(file => {
        logger.info(`  ✅ ${file}`);
      });
    }
  }

  getReport(): { cleaned: string[] } {
    return { cleaned: this.cleanedFiles };
  }
}

async function main() {
  const cleaner = new ConfigCleaner();
  
  try {
    await cleaner.cleanup();
    
    const report = cleaner.getReport();
    
    // Save report
    await fs.writeFile(
      'config-cleanup-report.json',
      JSON.stringify(report, null, 2)
    );
    
    logger.info('📄 Report saved to config-cleanup-report.json');
    
  } catch (error) {
    logger.error('❌ Config cleanup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { ConfigCleaner }; 