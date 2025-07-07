# Knowledge Graph Dashboard – Documentation Hub

A single, concise entry-point to the full documentation set. For an overview of the project itself (installation, architecture, etc.) see the repository-root **[README.md](../README.md)**.

---

## 📦 Quick Start (Developer)
```bash
# 1. Start Neo4j (background)
docker-compose -f docker-compose.neo4j.yml up -d

# 2. Install Node dependencies
npm install

# 3. Run the API (hot-reload)
npm run dev

# 4. OPTIONAL – Run Chat UI (in a separate terminal)
cd chat-ui && npm run dev
```

Need the full step-by-step? Follow the **Quick Start** section in the root README.

---

## 🛠️ Frequently-Used Scripts

| Task | Command |
| ---- | ------- |
| Generate/refresh all ontologies | `npm run ontologies:generate` |
| Build **one** ontology | `npx ts-node scripts/ontology/build-ontology.ts --ontology-name <name>` |
| Initialise database schema | `npm run demo:initialize-schema` |
| Run email-ingestion pipeline | `npm run pipeline:email` |
| Launch MCP server (Claude Desktop) | `npm run dev:mcp` |
| Run ontology-reasoning demo | `ts-node -r tsconfig-paths/register scripts/demo/reasoning-demo.ts` |
| Execute full test-suite | `npm test` |

---

## 🧠 Key Concepts (1-min Overview)

• **Ontology agnostic** – the platform ingests multiple domain ontologies (CRM, Procurement, Finance, FIBO…).  
• **Plugin architecture** – each ontology is packaged as an extension, discovered at runtime.  
• **Knowledge graph** – Neo4j stores entities; optional vector indexes enable semantic search.  
• **LLM assistance** – OpenAI (or another LLM) is used for entity extraction and importance ranking when available; the system degrades gracefully to heuristic mode.

---

## 🔍 Where to Go Next

| Topic | File |
| ----- | ---- |
| Full documentation index | [`DOCUMENTATION_INDEX.md`](./DOCUMENTATION_INDEX.md) |
| Architecture diagrams & deep-dives | `docs/architecture/` |
| TDD & contribution guidelines | `docs/development/tdd-approach.md` |
| Advanced ontology builder usage | `docs/development/ontology-scripts.md` |
| Troubleshooting common issues | Root README ➜ *Troubleshooting* section |

---

## 📝 Maintenance Guidelines

1. **Keep this page short.** Link to detailed docs rather than duplicating content.  
2. **Update commands** whenever `package.json` scripts change.  
3. **Cross-check features** – if documentation references a script or file, confirm it exists in the repo (grep is your friend!).  
4. Follow the *Test-Driven Development* rules in `.cursorrules` for all new features.

_Last updated: July 7 2025_ 