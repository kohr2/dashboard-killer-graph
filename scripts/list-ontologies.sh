#!/bin/bash

# List Available Ontologies
# Dynamically discovers ontologies by scanning the ontologies directory

set -e

ONTOLOGIES_DIR="ontologies"
CONFIG_FILE="scripts/chat-config.json"

echo "🔍 Discovering Available Ontologies"
echo "==================================="
echo ""

# Function to read ontology info from config.json
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
        
        echo "📚 $name"
        echo "   Description: $description"
        echo "   Version: $version"
        echo "   Entities: $entity_count"
        echo "   Relationships: $relationship_count"
        echo "   Config: $config_path"
        echo ""
    fi
}

# Function to check if ontology is enabled in chat config
is_enabled_in_chat() {
    local ontology_name=$1
    local enabled=$(jq -r ".chat_configurations.$ontology_name // null" "$CONFIG_FILE" 2>/dev/null)
    if [ "$enabled" != "null" ]; then
        echo "✅ Enabled in chat"
    else
        echo "❌ Not configured for chat"
    fi
}

# Discover ontologies from directory structure
echo "📁 Ontologies found in $ONTOLOGIES_DIR/:"
echo ""

if [ -d "$ONTOLOGIES_DIR" ]; then
    for ontology_dir in "$ONTOLOGIES_DIR"/*/; do
        if [ -d "$ontology_dir" ]; then
            ontology_name=$(basename "$ontology_dir")
            echo "🔸 $ontology_name"
            get_ontology_details "$ontology_dir"
            echo "   Chat Status: $(is_enabled_in_chat $ontology_name)"
            echo ""
        fi
    done
else
    echo "❌ Ontologies directory not found: $ONTOLOGIES_DIR"
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
echo "   ./scripts/launch-chat.sh [ontology_name]"
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