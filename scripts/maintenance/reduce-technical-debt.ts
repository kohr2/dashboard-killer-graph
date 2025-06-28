#!/usr/bin/env ts-node

import { promises as fs } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

interface TechnicalDebtItem {
  file: string;
  line: number;
  type: 'TODO' | 'FIXME' | 'HACK' | 'ANY_TYPE' | 'CONSOLE' | 'MISSING_TEST';
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'TYPE_SAFETY' | 'ARCHITECTURE' | 'LOGGING' | 'TESTING' | 'IMPLEMENTATION';
  estimatedHours: number;
}

interface DebtReport {
  totalItems: number;
  byCategory: { [key: string]: number };
  byPriority: { [key: string]: number };
  estimatedTotalHours: number;
  items: TechnicalDebtItem[];
}

class TechnicalDebtAnalyzer {
  private rootPath: string;
  private debtItems: TechnicalDebtItem[] = [];

  constructor(rootPath: string = process.cwd()) {
    this.rootPath = rootPath;
  }

  async analyzeProject(): Promise<DebtReport> {
    console.log('🔍 Analyzing technical debt...');
    
    this.debtItems = [];
    
    await this.analyzeTodoComments();
    await this.analyzeAnyTypes();
    await this.analyzeConsoleStatements();
    
    return this.generateReport();
  }

  private async analyzeTodoComments(): Promise<void> {
    const todoPatterns = [
      { pattern: /TODO:?\s*(.+)/gi, type: 'TODO' as const },
      { pattern: /FIXME:?\s*(.+)/gi, type: 'FIXME' as const },
      { pattern: /HACK:?\s*(.+)/gi, type: 'HACK' as const }
    ];

    const files = await this.findTypeScriptFiles();
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        todoPatterns.forEach(({ pattern, type }) => {
          const match = pattern.exec(line);
          if (match) {
            this.debtItems.push({
              file: file.replace(this.rootPath + '/', ''),
              line: index + 1,
              type,
              description: match[1]?.trim() || 'No description',
              priority: type === 'FIXME' ? 'HIGH' : type === 'HACK' ? 'MEDIUM' : 'LOW',
              category: 'IMPLEMENTATION',
              estimatedHours: type === 'FIXME' ? 4 : type === 'HACK' ? 2 : 1
            });
          }
        });
      });
    }
  }

  private async analyzeAnyTypes(): Promise<void> {
    const files = await this.findTypeScriptFiles();
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        const isTestFile = file.includes('.test.') || file.includes('.spec.');
        
        const anyMatches = [
          /:\s*any\s*[;\)\]\,]/g,
          /:\s*any\[\]/g,
          /as\s+any/g
        ];
        
        anyMatches.forEach(pattern => {
          if (pattern.test(line) && !line.includes('// TODO')) {
            this.debtItems.push({
              file: file.replace(this.rootPath + '/', ''),
              line: index + 1,
              type: 'ANY_TYPE',
              description: `Type safety: Replace 'any' with proper type`,
              priority: isTestFile ? 'LOW' : 'MEDIUM',
              category: 'TYPE_SAFETY',
              estimatedHours: 0.5
            });
          }
        });
      });
    }
  }

  private async analyzeConsoleStatements(): Promise<void> {
    const files = await this.findTypeScriptFiles();
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        const consolePattern = /console\.(log|warn|error|info|debug)/g;
        if (consolePattern.test(line) && !file.includes('test/') && !file.includes('scripts/')) {
          this.debtItems.push({
            file: file.replace(this.rootPath + '/', ''),
            line: index + 1,
            type: 'CONSOLE',
            description: 'Replace console statement with proper logger',
            priority: 'LOW',
            category: 'LOGGING',
            estimatedHours: 0.25
          });
        }
      });
    }
  }

  private async findTypeScriptFiles(): Promise<string[]> {
    const files: string[] = [];
    
    const walk = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = join(dir, entry.name);
          
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await walk(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.ts')) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Ignore directories we can't read
      }
    };
    
    await walk(this.rootPath);
    return files;
  }

  private generateReport(): DebtReport {
    const byCategory: { [key: string]: number } = {};
    const byPriority: { [key: string]: number } = {};
    let estimatedTotalHours = 0;
    
    this.debtItems.forEach(item => {
      byCategory[item.category] = (byCategory[item.category] || 0) + 1;
      byPriority[item.priority] = (byPriority[item.priority] || 0) + 1;
      estimatedTotalHours += item.estimatedHours;
    });
    
    return {
      totalItems: this.debtItems.length,
      byCategory,
      byPriority,
      estimatedTotalHours,
      items: this.debtItems.sort((a, b) => {
        const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
    };
  }

  async generateActionPlan(): Promise<void> {
    const report = await this.analyzeProject();
    
    console.log('\n📊 RAPPORT DE DETTE TECHNIQUE\n');
    console.log('='.repeat(50));
    console.log(`📈 Total d'éléments: ${report.totalItems}`);
    console.log(`⏱️  Temps estimé: ${report.estimatedTotalHours.toFixed(1)} heures`);
    console.log(`💰 Coût estimé: ${(report.estimatedTotalHours * 80).toFixed(0)}€ (80€/h)`);
    
    console.log('\n📋 PAR CATÉGORIE:');
    Object.entries(report.byCategory).forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`);
    });
    
    console.log('\n🎯 PAR PRIORITÉ:');
    Object.entries(report.byPriority).forEach(([priority, count]) => {
      const emoji = priority === 'HIGH' ? '🔥' : priority === 'MEDIUM' ? '⚠️' : '📝';
      console.log(`  ${emoji} ${priority}: ${count}`);
    });
    
    console.log('\n🔥 TOP 10 PRIORITÉS HAUTES:');
    report.items
      .filter(item => item.priority === 'HIGH')
      .slice(0, 10)
      .forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.file}:${item.line} - ${item.description}`);
      });
    
    console.log('\n📋 PLAN D\'ACTION RECOMMANDÉ:\n');
    
    console.log('🎯 PHASE 1 - SÉCURITÉ & ARCHITECTURE (1-2 semaines)');
    console.log('  • Corriger les violations d\'architecture');
    console.log('  • Remplacer les FIXME critiques');
    console.log('  • Ajouter les tests manquants pour les services critiques');
    
    console.log('\n⚡ PHASE 2 - TYPE SAFETY (2-3 semaines)');
    console.log('  • Remplacer les types "any" dans les services principaux');
    console.log('  • Créer des interfaces TypeScript manquantes');
    console.log('  • Ajouter la validation de types runtime');
    
    console.log('\n🔧 PHASE 3 - INFRASTRUCTURE (1 semaine)');
    console.log('  • Implémenter un système de logging structuré');
    console.log('  • Remplacer tous les console.* par le logger');
    console.log('  • Ajouter le monitoring des erreurs');
    
    console.log('\n📝 PHASE 4 - IMPLÉMENTATION (2-4 semaines)');
    console.log('  • Compléter les TODO par ordre de priorité');
    console.log('  • Finaliser les fonctionnalités partiellement implémentées');
    console.log('  • Ajouter les tests unitaires manquants');
    
    // Sauvegarder le rapport
    const reportPath = join(this.rootPath, 'technical-debt-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Rapport détaillé sauvegardé: ${reportPath}`);
  }
}

// Fonctions d'auto-correction
class TechnicalDebtFixer {
  private rootPath: string;

  constructor(rootPath: string = process.cwd()) {
    this.rootPath = rootPath;
  }

  async autoFixConsoleStatements(): Promise<void> {
    console.log('🔧 Auto-fixing console statements...');
    
    const files = await this.findTypeScriptFiles();
    let fixedCount = 0;
    
    for (const file of files) {
      if (file.includes('test/') || file.includes('scripts/')) continue;
      
      const content = await fs.readFile(file, 'utf-8');
      let newContent = content;
      
      // Replace console.log with logger.info
      newContent = newContent.replace(/console\.log\(/g, 'logger.info(');
      newContent = newContent.replace(/console\.warn\(/g, 'logger.warn(');
      newContent = newContent.replace(/console\.error\(/g, 'logger.error(');
      
      // Add logger import if console was replaced and import doesn't exist
      if (newContent !== content && !newContent.includes('import') && !newContent.includes('logger')) {
        newContent = `import { logger } from '@shared/utils/logger';\n\n${newContent}`;
      }
      
      if (newContent !== content) {
        await fs.writeFile(file, newContent);
        fixedCount++;
      }
    }
    
    console.log(`✅ Fixed ${fixedCount} files with console statements`);
  }

  async createLoggerUtility(): Promise<void> {
    console.log('🔧 Creating logger utility...');
    
    const loggerPath = join(this.rootPath, 'src/shared/utils/logger.ts');
    const loggerDir = join(this.rootPath, 'src/shared/utils');
    
    // Create directory if it doesn't exist
    await fs.mkdir(loggerDir, { recursive: true });
    
    const loggerContent = `import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'dashboard-killer-graph' },
  transports: [
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.simple()
    )
  }));
}

export { logger };
`;
    
    await fs.writeFile(loggerPath, loggerContent);
    console.log(`✅ Logger utility created at ${loggerPath}`);
  }

  private async findTypeScriptFiles(): Promise<string[]> {
    const analyzer = new TechnicalDebtAnalyzer(this.rootPath);
    return analyzer['findTypeScriptFiles']();
  }
}

// Main execution
async function main() {
  const command = process.argv[2] || 'analyze';
  const analyzer = new TechnicalDebtAnalyzer();
  
  switch (command) {
    case 'analyze':
    default:
      await analyzer.generateActionPlan();
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { TechnicalDebtAnalyzer, TechnicalDebtFixer }; 