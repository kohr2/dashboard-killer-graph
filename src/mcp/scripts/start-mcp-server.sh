#!/bin/bash

# Aller dans le répertoire du projet
cd "$(dirname "$0")/.."

# Charger le fichier .env s'il existe
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Lancer le serveur MCP stdio
exec npx ts-node -r tsconfig-paths/register src/mcp-server-stdio.ts 