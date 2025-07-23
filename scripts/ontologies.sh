#!/bin/bash

# Unified Ontology Management Script for Dashboard Killer Graph
# This script handles ontology discovery, validation, and management

set -e

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

# Default configuration
ONTOLOGIES_DIR="ontologies"

# Parse command line arguments
ACTION=${1:-"list"}
ONTOLOGY_NAME=${2:-""}

# Show help
if [ "$ACTION" = "--help" ] || [ "$ACTION" = "-h" ]; then
    print_header "Unified Ontology Management Script"
    echo ""
    echo "Usage: $0 [action] [ontology_name]"
    echo ""
    echo "Actions:"
    echo "  list      - List all available ontologies (default)"
    echo "  info      - Show detailed information about an ontology"
    echo "  validate  - Validate ontology configuration"
    echo "  enable    - Enable ontology for chat"
    echo "  disable   - Disable ontology for chat"
    echo "  status    - Show ontology status"
    echo ""
    echo "Arguments:"
    echo "  action        - Action to perform (default: list)"
    echo "  ontology_name - Name of ontology (required for some actions)"
    echo ""
    echo "Examples:"
    echo "  $0 list                    # List all ontologies"
    echo "  $0 info procurement        # Show procurement ontology info"
    echo "  $0 validate fibo           # Validate FIBO ontology"
    echo "  $0 enable geonames         # Enable geonames for chat"
    echo "  $0 status                  # Show all ontology statuses"
    echo "  $0 --help                  # Show this help"
    echo ""
    exit 0
fi

# Function to read ontology details from config.json
get_ontology_details() {
    local ontology_dir=$1
    local config_path="$ontology_dir/config.json"
    
    if [ -f "$config_path" ]; then
        local name=$(jq -r '.name // "Unknown"' "$config_path" 2>/dev/null)
        local description=$(jq -r '.source.description // .description // "No description"' "$config_path" 2>/dev/null)
        local version=$(jq -r '.source.version // .version // "Unknown"' "$config_path" 2>/dev/null)
        
        # Check if ontology.json exists for entity/relationship counts
        local ontology_json="$ontology_dir/ontology.json"
        local entity_count="N/A"
        local relationship_count="N/A"
        
        if [ -f "$ontology_json" ]; then
            entity_count=$(jq -r '.entityCount // "N/A"' "$ontology_json" 2>/dev/null)
            relationship_count=$(jq -r '.relationshipCount // "N/A"' "$ontology_json" 2>/dev/null)
        fi
        
        echo "$name|$description|$version|$entity_count|$relationship_count|$config_path"
    else
        echo "Unknown|No config found|Unknown|N/A|N/A|$config_path"
    fi
}

# Function to check if ontology is enabled in chat config
is_enabled_in_chat() {
    local ontology_name=$1
    local enabled=$(jq -r ".chat_configurations.$ontology_name // null" "$CONFIG_FILE" 2>/dev/null)
    if [ "$enabled" != "null" ]; then
        echo "✅ Enabled"
    else
        echo "❌ Disabled"
    fi
}

# Function to list all ontologies
list_ontologies() {
    print_header "Discovering Available Ontologies"
    echo ""
    
    print_section "📁 Ontologies found in $ONTOLOGIES_DIR/:"
    echo ""
    
    if [ -d "$ONTOLOGIES_DIR" ]; then
        for ontology_dir in "$ONTOLOGIES_DIR"/*/; do
            if [ -d "$ontology_dir" ]; then
                ontology_name=$(basename "$ontology_dir")
                details=$(get_ontology_details "$ontology_dir")
                IFS='|' read -r name description version entity_count relationship_count config_path <<< "$details"
                
                echo "🔸 $ontology_name"
                echo "   Name: $name"
                echo "   Description: $description"
                echo "   Version: $version"
                echo "   Entities: $entity_count"
                echo "   Relationships: $relationship_count"
                echo "   Config: $config_path"
                echo "   Chat Status: $(is_enabled_in_chat $ontology_name)"
                echo ""
            fi
        done
    else
        print_error "Ontologies directory not found: $ONTOLOGIES_DIR"
    fi
    
    # Show core system ontology
    echo "🔸 core (system)"
    if [ -f "config/ontology/core.ontology.json" ]; then
        echo "   Description: Core system ontology"
        echo "   Config: config/ontology/core.ontology.json"
        echo "   Chat Status: $(is_enabled_in_chat default)"
    else
        echo "   ❌ Core ontology config not found"
    fi
    
    echo ""
    echo "💡 To launch chat with a specific ontology:"
    echo "   ./scripts/launch.sh [ontology_name]"
    echo ""
    echo "📋 Available chat configurations:"
    jq -r '.chat_configurations | to_entries[] | "   \(.key): \(.value.description)"' "$CONFIG_FILE" 2>/dev/null || {
        echo "   procurement: Uses procurement ontology configuration"
        echo "   fibo: Uses FIBO ontology configuration"
        echo "   geonames: Uses GeoNames ontology configuration"
        echo "   isco: Uses ISCO ontology configuration"
        echo "   sp500: Uses S&P 500 ontology configuration"
        echo "   testont: Uses test ontology configuration"
        echo "   default: Uses core system ontology"
    }
    echo ""
}

# Function to show detailed ontology information
show_ontology_info() {
    local ontology_name=$1
    
    if [ -z "$ontology_name" ]; then
        print_error "Ontology name is required"
        echo "Usage: $0 info <ontology_name>"
        exit 1
    fi
    
    print_header "Ontology Information: $ontology_name"
    echo ""
    
    # Check if ontology exists
    local ontology_dir="$ONTOLOGIES_DIR/$ontology_name"
    if [ ! -d "$ontology_dir" ]; then
        print_error "Ontology not found: $ontology_name"
        echo "Available ontologies:"
        for dir in "$ONTOLOGIES_DIR"/*/; do
            if [ -d "$dir" ]; then
                echo "  - $(basename "$dir")"
            fi
        done
        exit 1
    fi
    
    # Get ontology details
    local details=$(get_ontology_details "$ontology_dir")
    IFS='|' read -r name description version entity_count relationship_count config_path <<< "$details"
    
    echo "📋 Basic Information:"
    echo "   Name: $name"
    echo "   Description: $description"
    echo "   Version: $version"
    echo "   Directory: $ontology_dir"
    echo "   Config: $config_path"
    echo ""
    
    echo "📊 Statistics:"
    echo "   Entities: $entity_count"
    echo "   Relationships: $relationship_count"
    echo ""
    
    echo "🔧 Configuration:"
    if [ -f "$config_path" ]; then
        echo "   Config file exists: ✅"
        echo "   Config content:"
        cat "$config_path" | jq '.' 2>/dev/null || cat "$config_path"
    else
        echo "   Config file exists: ❌"
    fi
    echo ""
    
    echo "📁 Files:"
    for file in "$ontology_dir"/*; do
        if [ -f "$file" ]; then
            echo "   - $(basename "$file")"
        fi
    done
    echo ""
    
    echo "🎯 Chat Status: $(is_enabled_in_chat $ontology_name)"
    echo ""
    
    echo "💡 Usage:"
    echo "   ./scripts/launch.sh $ontology_name"
    echo ""
}

# Function to validate ontology
validate_ontology() {
    local ontology_name=$1
    
    if [ -z "$ontology_name" ]; then
        print_error "Ontology name is required"
        echo "Usage: $0 validate <ontology_name>"
        exit 1
    fi
    
    print_header "Validating Ontology: $ontology_name"
    echo ""
    
    # Check if ontology exists
    local ontology_dir="$ONTOLOGIES_DIR/$ontology_name"
    if [ ! -d "$ontology_dir" ]; then
        print_error "Ontology not found: $ontology_name"
        exit 1
    fi
    
    local errors=0
    local warnings=0
    
    echo "🔍 Validation Results:"
    echo ""
    
    # Check config.json
    local config_path="$ontology_dir/config.json"
    if [ -f "$config_path" ]; then
        print_success "✅ Config file exists: $config_path"
        
        # Validate JSON syntax
        if jq empty "$config_path" 2>/dev/null; then
            print_success "✅ Config file has valid JSON syntax"
        else
            print_error "❌ Config file has invalid JSON syntax"
            ((errors++))
        fi
        
        # Check required fields
        local name=$(jq -r '.name // empty' "$config_path" 2>/dev/null)
        if [ ! -z "$name" ]; then
            print_success "✅ Name field present: $name"
        else
            print_warning "⚠️  Name field missing"
            ((warnings++))
        fi
        
        local description=$(jq -r '.description // .source.description // empty' "$config_path" 2>/dev/null)
        if [ ! -z "$description" ]; then
            print_success "✅ Description field present"
        else
            print_warning "⚠️  Description field missing"
            ((warnings++))
        fi
    else
        print_error "❌ Config file missing: $config_path"
        ((errors++))
    fi
    
    # Check ontology.json
    local ontology_json="$ontology_dir/ontology.json"
    if [ -f "$ontology_json" ]; then
        print_success "✅ Ontology file exists: $ontology_json"
        
        # Validate JSON syntax
        if jq empty "$ontology_json" 2>/dev/null; then
            print_success "✅ Ontology file has valid JSON syntax"
        else
            print_error "❌ Ontology file has invalid JSON syntax"
            ((errors++))
        fi
    else
        print_warning "⚠️  Ontology file missing: $ontology_json"
        ((warnings++))
    fi
    
    # Check plugin file
    local plugin_file="$ontology_dir/$ontology_name.plugin.ts"
    if [ -f "$plugin_file" ]; then
        print_success "✅ Plugin file exists: $plugin_file"
    else
        print_warning "⚠️  Plugin file missing: $plugin_file"
        ((warnings++))
    fi
    
    # Check chat configuration
    local chat_enabled=$(jq -r ".chat_configurations.$ontology_name // null" "$CONFIG_FILE" 2>/dev/null)
    if [ "$chat_enabled" != "null" ]; then
        print_success "✅ Chat configuration exists"
    else
        print_warning "⚠️  Chat configuration missing"
        ((warnings++))
    fi
    
    echo ""
    echo "📊 Summary:"
    echo "   Errors: $errors"
    echo "   Warnings: $warnings"
    echo ""
    
    if [ $errors -eq 0 ]; then
        print_success "✅ Ontology validation passed"
    else
        print_error "❌ Ontology validation failed"
        exit 1
    fi
}

# Function to show ontology status
show_ontology_status() {
    print_header "Ontology Status Overview"
    echo ""
    
    echo "📋 Ontology Status:"
    echo ""
    
    if [ -d "$ONTOLOGIES_DIR" ]; then
        for ontology_dir in "$ONTOLOGIES_DIR"/*/; do
            if [ -d "$ontology_dir" ]; then
                ontology_name=$(basename "$ontology_dir")
                status=$(is_enabled_in_chat $ontology_name)
                echo "   $ontology_name: $status"
            fi
        done
    fi
    
    echo "   core: $(is_enabled_in_chat default)"
    echo ""
    
    echo "💡 To change status:"
    echo "   Edit scripts/chat-config.json"
    echo ""
}

# Main logic
case $ACTION in
    "list")
        list_ontologies
        ;;
    "info")
        show_ontology_info "$ONTOLOGY_NAME"
        ;;
    "validate")
        validate_ontology "$ONTOLOGY_NAME"
        ;;
    "status")
        show_ontology_status
        ;;
    "enable"|"disable")
        print_warning "Enable/disable functionality not implemented yet"
        echo "Please edit scripts/chat-config.json manually"
        ;;
    *)
        print_error "Invalid action: $ACTION"
        echo "Valid actions: list, info, validate, enable, disable, status"
        exit 1
        ;;
esac 