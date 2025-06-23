#!/bin/bash

# 🚀 Deal Tracker App - Structure Migration Script
# This script helps migrate from the current structure to the improved Clean Architecture

set -e

echo "🚀 Starting Deal Tracker App Migration..."
echo ""

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if git is initialized
if [ ! -d ".git" ]; then
    print_error "Git repository not found. Please initialize git first."
    exit 1
fi

# Step 1: Backup current structure
print_step "Creating backup of current structure..."
git checkout -b backup-original-structure 2>/dev/null || true
git add .
git commit -m "Backup original structure before migration" || true
git checkout main
print_success "Backup created on 'backup-original-structure' branch"

# Step 2: Create new directory structure
print_step "Creating new directory structure..."

# Create main directories
mkdir -p src/{domain,application,infrastructure,interface,shared}

# Domain directories
mkdir -p src/domain/{entities,value-objects,repositories,services,events}

# Application directories
mkdir -p src/application/{use-cases,agents,dto,ports}
mkdir -p src/application/use-cases/{deal,communication,insights}

# Infrastructure directories
mkdir -p src/infrastructure/{database,external-apis,ontology,nlp,messaging,caching}
mkdir -p src/infrastructure/database/{neo4j,migrations}
mkdir -p src/infrastructure/external-apis/{microsoft-graph,salesforce,openai}
mkdir -p src/infrastructure/ontology/schemas

# Interface directories
mkdir -p src/interface/{web,ui,cli}
mkdir -p src/interface/web/{controllers,middleware,routes}
mkdir -p src/interface/ui/{components,hooks,store,pages}
mkdir -p src/interface/ui/components/{common,deal,insights,agent}

# Shared directories
mkdir -p src/shared/{utils,constants,types,config,container}

# Test directories
mkdir -p test/{unit,integration,e2e,fixtures,mocks,utils}
mkdir -p test/unit/{domain,application,infrastructure}
mkdir -p test/integration/{database,api,external-services}

print_success "Directory structure created"

# Step 3: Move existing files
print_step "Moving existing files to new structure..."

# Move test files if they exist
if [ -f "test/ontology/crm-ontology.test.ts" ]; then
    mv test/ontology/crm-ontology.test.ts test/unit/domain/
    print_success "Moved CRM ontology tests"
fi

if [ -f "test/graph/neo4j-connection.test.ts" ]; then
    mv test/graph/neo4j-connection.test.ts test/unit/infrastructure/database/
    print_success "Moved Neo4j connection tests"
fi

# Clean up old test directories if empty
rmdir test/ontology 2>/dev/null || true
rmdir test/graph 2>/dev/null || true

print_success "Existing files moved"

# Step 4: Create essential files
print_step "Creating essential domain files..."

# Create .gitkeep files for empty directories
find src -type d -empty -exec touch {}/.gitkeep \;
find test -type d -empty -exec touch {}/.gitkeep \;

# Create basic index files
cat > src/domain/index.ts << 'EOF'
// Domain Layer Exports
export * from './entities';
export * from './value-objects';
export * from './repositories';
export * from './services';
export * from './events';
EOF

cat > src/application/index.ts << 'EOF'
// Application Layer Exports
export * from './use-cases';
export * from './agents';
export * from './dto';
export * from './ports';
EOF

cat > src/infrastructure/index.ts << 'EOF'
// Infrastructure Layer Exports
export * from './database';
export * from './external-apis';
export * from './ontology';
export * from './nlp';
export * from './messaging';
export * from './caching';
EOF

cat > src/interface/index.ts << 'EOF'
// Interface Layer Exports
export * from './web';
export * from './ui';
export * from './cli';
EOF

cat > src/shared/index.ts << 'EOF'
// Shared Utilities Exports
export * from './utils';
export * from './constants';
export * from './types';
export * from './config';
export * from './container';
EOF

print_success "Index files created"

# Step 5: Update package.json scripts
print_step "Updating package.json scripts..."

# Check if jq is available for JSON manipulation
if command -v jq > /dev/null; then
    # Use jq to add new scripts
    tmp=$(mktemp)
    jq '.scripts += {
        "test:unit": "jest test/unit",
        "test:integration": "jest test/integration", 
        "test:e2e": "jest test/e2e",
        "test:domain": "jest test/unit/domain",
        "test:application": "jest test/unit/application",
        "test:infrastructure": "jest test/unit/infrastructure",
        "build:domain": "tsc --build src/domain",
        "lint:domain": "eslint src/domain --ext .ts",
        "clean": "rm -rf dist && rm -rf src/**/*.js"
    }' package.json > "$tmp" && mv "$tmp" package.json
    print_success "Updated package.json scripts with jq"
else
    print_warning "jq not found. Please manually add the new scripts to package.json"
    echo "Add these scripts to your package.json:"
    echo '  "test:unit": "jest test/unit",'
    echo '  "test:integration": "jest test/integration",'
    echo '  "test:e2e": "jest test/e2e",'
    echo '  "test:domain": "jest test/unit/domain",'
    echo '  "test:application": "jest test/unit/application",'
    echo '  "test:infrastructure": "jest test/unit/infrastructure",'
    echo '  "build:domain": "tsc --build src/domain",'
    echo '  "lint:domain": "eslint src/domain --ext .ts",'
    echo '  "clean": "rm -rf dist && rm -rf src/**/*.js"'
fi

# Step 6: Create Jest configs for different test types
print_step "Creating Jest configurations..."

cat > jest.unit.config.js << 'EOF'
module.exports = {
  ...require('./jest.config.js'),
  testMatch: ['**/test/unit/**/*.test.ts'],
  collectCoverageFrom: [
    'src/domain/**/*.ts',
    'src/application/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
};
EOF

cat > jest.integration.config.js << 'EOF'
module.exports = {
  ...require('./jest.config.js'),
  testMatch: ['**/test/integration/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup-integration.ts'],
  testTimeout: 30000
};
EOF

print_success "Jest configurations created"

# Step 7: Create example files
print_step "Creating example implementation files..."

# Create a basic tsconfig for the domain layer
cat > src/domain/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "../../dist/domain",
    "rootDir": "."
  },
  "include": ["./**/*"],
  "exclude": ["**/*.test.ts", "**/__tests__/**"]
}
EOF

# Create example README files
cat > src/domain/README.md << 'EOF'
# Domain Layer

This layer contains the core business logic and entities.

## Structure
- `entities/` - Domain entities (Deal, Contact, etc.)
- `value-objects/` - Immutable value objects
- `repositories/` - Repository interfaces
- `services/` - Domain services
- `events/` - Domain events

## Rules
- No dependencies on other layers
- Pure business logic only
- No external dependencies
EOF

cat > src/application/README.md << 'EOF'
# Application Layer

This layer orchestrates the use cases and coordinates between domain and infrastructure.

## Structure
- `use-cases/` - Business use cases
- `agents/` - Cursor agents
- `dto/` - Data transfer objects
- `ports/` - Interfaces for external dependencies

## Rules
- Depends only on domain layer
- Uses interfaces for external dependencies
- Contains business workflow logic
EOF

print_success "Example files created"

# Step 8: Create migration validation script
print_step "Creating validation script..."

cat > scripts/validate-migration.sh << 'EOF'
#!/bin/bash

echo "🔍 Validating migration..."

# Check if all required directories exist
required_dirs=(
    "src/domain/entities"
    "src/domain/value-objects" 
    "src/domain/repositories"
    "src/application/use-cases"
    "src/infrastructure/database"
    "test/unit/domain"
    "test/integration"
)

for dir in "${required_dirs[@]}"; do
    if [ ! -d "$dir" ]; then
        echo "❌ Missing directory: $dir"
        exit 1
    fi
done

echo "✅ All required directories exist"

# Check if TypeScript compiles
if npm run type-check > /dev/null 2>&1; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
    exit 1
fi

# Check if tests can run
if npm test -- --passWithNoTests > /dev/null 2>&1; then
    echo "✅ Test configuration working"
else
    echo "❌ Test configuration has issues"
    exit 1
fi

echo "🎉 Migration validation successful!"
EOF

chmod +x scripts/validate-migration.sh

print_success "Validation script created"

# Step 9: Update tsconfig.json for path mapping
print_step "Updating TypeScript configuration..."

if [ -f "tsconfig.json" ]; then
    # Backup original tsconfig
    cp tsconfig.json tsconfig.json.backup
    
    # Update tsconfig with path mapping
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "jsx": "react",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@domain/*": ["src/domain/*"],
      "@application/*": ["src/application/*"],
      "@infrastructure/*": ["src/infrastructure/*"],
      "@interface/*": ["src/interface/*"],
      "@shared/*": ["src/shared/*"]
    },
    "types": ["jest", "node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test", "**/*.test.ts", "**/*.test.tsx"]
}
EOF

    print_success "TypeScript configuration updated with path mapping"
else
    print_warning "tsconfig.json not found, skipping path mapping setup"
fi

# Step 10: Create final checklist
print_step "Creating migration checklist..."

cat > MIGRATION_CHECKLIST.md << 'EOF'
# 📋 Migration Checklist

## ✅ Completed by Script
- [x] Created new directory structure
- [x] Moved existing test files
- [x] Created index files
- [x] Updated package.json scripts
- [x] Created Jest configurations
- [x] Created example files
- [x] Updated TypeScript configuration

## 🔄 Manual Steps Required

### Domain Layer
- [ ] Implement value objects (DealStage, Money, Probability)
- [ ] Create entity classes (Deal, Contact, Task, Email)
- [ ] Define repository interfaces
- [ ] Add domain events
- [ ] Write domain unit tests

### Application Layer
- [ ] Implement use cases
- [ ] Create Cursor agents
- [ ] Set up dependency injection
- [ ] Add application service tests

### Infrastructure Layer
- [ ] Implement Neo4j repositories
- [ ] Create external API clients
- [ ] Add ontology management
- [ ] Write integration tests

### Interface Layer
- [ ] Create API controllers
- [ ] Update React components
- [ ] Add CLI commands
- [ ] Write E2E tests

## 🧪 Validation
- [ ] Run `npm run type-check`
- [ ] Run `npm test`
- [ ] Run `./scripts/validate-migration.sh`
- [ ] Check for circular dependencies
- [ ] Verify all imports work correctly

## 📚 Next Steps
1. Follow the MIGRATION_GUIDE.md for detailed implementation
2. Start with the domain layer (entities and value objects)
3. Implement one use case end-to-end
4. Add tests for each layer
5. Gradually migrate existing functionality
EOF

print_success "Migration checklist created"

# Final summary
echo ""
echo "🎉 Migration script completed successfully!"
echo ""
echo "📋 Summary of changes:"
echo "  - Created new directory structure"
echo "  - Moved existing test files"
echo "  - Updated package.json and tsconfig.json"
echo "  - Created example files and documentation"
echo "  - Set up Jest configurations"
echo ""
echo "🔄 Next steps:"
echo "  1. Review MIGRATION_CHECKLIST.md"
echo "  2. Follow MIGRATION_GUIDE.md for detailed implementation"
echo "  3. Run './scripts/validate-migration.sh' to verify setup"
echo "  4. Start implementing domain entities and value objects"
echo ""
echo "🚀 Happy coding!" 