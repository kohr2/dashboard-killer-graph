#!/bin/bash

# Suppress Node.js experimental warnings and deprecated warnings
export NODE_NO_WARNINGS=1

# Run the email ingestion script with the provided arguments
npx ts-node scripts/demo/ingest-email.ts "$@" 