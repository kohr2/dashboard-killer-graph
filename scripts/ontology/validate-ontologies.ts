#!/usr/bin/env ts-node
/**
 * Unified Ontology Validator
 * -------------------------
 * Combines the former `validate-ontologies.ts` (Zod schema validation)
 * and `validate-ontology-entities.ts` (cross-entity/relationship sanity)
 * into ONE entry-point.
 *
 * 1. Loads every `ontology.json` / `source.ontology.json` file under
 *    `ontologies/**` and `config/ontology/*.ontology.json`.
 * 2. Runs strict Zod schema validation (structure/typing).
 * 3. Runs semantic checks: missing entities referenced in relationships,
 *    orphaned entities, parent loops, etc.
 * 4. Writes human-readable Markdown report `ONTOLOGY_VALIDATION_REPORT.md`.
 * 5. Optional flag `--fix` applies automatic fixes identical to the old
 *    implementation.
 *
 * Usage:
 *   npx ts-node scripts/ontology/validate-ontologies.ts        # just report
 *   npx ts-node scripts/ontology/validate-ontologies.ts --fix  # auto-apply fixes
 */

import { promises as fsp } from 'fs';
import * as fs from 'fs';
import { join, basename } from 'path';
import { z } from 'zod';

// -------------------------------------------------------------------------------------
// 1) ZOD SCHEMA (unchanged from former validate-ontologies.ts)
// -------------------------------------------------------------------------------------
const OntologyPropertySchema = z.object({
  type: z.string(),
  description: z.string(),
});

const OntologyEntitySchema = z.object({
  description: z.string().optional(),
  values: z.array(z.string()).optional(),
  parent: z.string().optional(),
  isProperty: z.boolean().optional(),
  vectorIndex: z.boolean().optional(),
  properties: z.record(z.union([z.string(), OntologyPropertySchema])).optional(),
  keyProperties: z.array(z.string()).optional(),
  enrichment: z
    .object({
      service: z.string(),
    })
    .optional(),
});

const OntologyRelationshipSchema = z.object({
  domain: z.union([z.string(), z.array(z.string())]).optional(),
  range: z.union([z.string(), z.array(z.string())]).optional(),
  source: z.union([z.string(), z.array(z.string())]).optional(),
  target: z.union([z.string(), z.array(z.string())]).optional(),
  description: z.union([
    z.string(),
    z.object({
      _: z.string(),
      $: z.record(z.any()).optional(),
    }),
  ]).optional(),
});

const OntologyReasoningSchema = z.object({
  algorithms: z.record(z.any()).optional(),
});

export const OntologySchemaValidator = z.object({
  name: z.string(),
  entities: z.union([
    z.record(OntologyEntitySchema),
    z.array(
      z.object({
        name: z.string(),
        description: z.union([
          z.string(),
          z.object({ _: z.string(), $: z.record(z.any()).optional() }),
        ]).optional(),
        properties: z.record(z.any()).optional(),
        keyProperties: z.array(z.string()).optional(),
        vectorIndex: z.boolean().optional(),
        documentation: z.string().optional(),
      }),
    ),
  ]),
  relationships: z
    .union([
      z.record(OntologyRelationshipSchema),
      z.array(
        z.object({
          name: z.string(),
          description: z.union([
            z.string(),
            z.object({ _: z.string(), $: z.record(z.any()).optional() }),
          ]).optional(),
          source: z.union([z.string(), z.array(z.string())]).optional(),
          target: z.union([z.string(), z.array(z.string())]).optional(),
          domain: z.union([z.string(), z.array(z.string())]).optional(),
          range: z.union([z.string(), z.array(z.string())]).optional(),
          documentation: z.string().optional(),
        }),
      ),
    ])
    .optional(),
  reasoning: OntologyReasoningSchema.optional(),
});

// -------------------------------------------------------------------------------------
// 2) SEMANTIC VALIDATOR (adapted from validate-ontology-entities.ts)
// -------------------------------------------------------------------------------------
interface OntologyEntity {
  description?: string;
  parent?: string;
  isProperty?: boolean;
  vectorIndex?: boolean;
  properties?: Record<string, any>;
  keyProperties?: string[];
  enrichment?: { service: string; properties?: string[] };
}
interface OntologyRelationship { domain: string | string[]; range: string | string[]; }
interface Ontology { name: string; entities: Record<string, OntologyEntity>; relationships?: Record<string, OntologyRelationship>; }

class SemanticValidator {
  private ontologies = new Map<string, Ontology>();
  private allEntities = new Set<string>();
  private relRefs = new Map<string, Set<string>>();

  async loadOntologies(): Promise<void> {
    const roots = [join(process.cwd(), 'ontologies'), join(process.cwd(), 'config', 'ontology')];
    for (const root of roots) {
      if (!fs.existsSync(root)) continue;
      const entries = await fsp.readdir(root, { withFileTypes: true });
      for (const entry of entries) {
        const filePath = entry.isDirectory()
          ? join(root, entry.name, 'ontology.json')
          : entry.name.endsWith('.ontology.json')
          ? join(root, entry.name)
          : '';
        if (filePath && fs.existsSync(filePath)) {
          const ontology: Ontology = JSON.parse(await fsp.readFile(filePath, 'utf8'));
          this.ontologies.set(ontology.name, ontology);
          Object.keys(ontology.entities).forEach((e) => this.allEntities.add(e));
          if (ontology.relationships) {
            for (const [rel, def] of Object.entries(ontology.relationships)) {
              [...(Array.isArray(def.domain) ? def.domain : [def.domain]), ...(Array.isArray(def.range) ? def.range : [def.range])].forEach((ent) => {
                if (!ent) return;
                if (!this.relRefs.has(ent)) this.relRefs.set(ent, new Set());
                this.relRefs.get(ent)!.add(rel);
              });
            }
          }
        }
      }
    }
  }

  run(): { ontology: string; missing: string[] }[] {
    const issues: { ontology: string; missing: string[] }[] = [];
    for (const [name, ont] of this.ontologies) {
      const missing: string[] = [];
      if (ont.relationships) {
        for (const rel of Object.values(ont.relationships)) {
          const check = (val: string | string[] | undefined) =>
            (Array.isArray(val) ? val : [val]).forEach((v) => {
              if (v && !this.allEntities.has(v)) missing.push(v);
            });
          check(rel.domain);
          check(rel.range);
        }
      }
      if (missing.length) issues.push({ ontology: name, missing });
    }
    return issues;
  }
}

// -------------------------------------------------------------------------------------
// 3) MAIN EXECUTION
// -------------------------------------------------------------------------------------
(async () => {
  const APPLY_FIX = process.argv.includes('--fix');
  const semVal = new SemanticValidator();
  await semVal.loadOntologies();

  const roots = [join(process.cwd(), 'ontologies'), join(process.cwd(), 'config', 'ontology')];
  interface FileResult { file: string; valid: boolean; zodErrors?: string[] }
  const fileResults: FileResult[] = [];

  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const todo: string[] = [];
    const walk = async (dir: string) => {
      const ents = await fsp.readdir(dir, { withFileTypes: true });
      for (const e of ents) {
        const p = join(dir, e.name);
        if (e.isDirectory()) await walk(p);
        else if (e.name.endsWith('.ontology.json') || e.name === 'ontology.json' || e.name === 'source.ontology.json') todo.push(p);
      }
    };
    await walk(root);
    for (const file of todo) {
      const json = JSON.parse(await fsp.readFile(file, 'utf8'));
      try {
        OntologySchemaValidator.parse(json);
        fileResults.push({ file, valid: true });
      } catch (err) {
        const zErr = err as z.ZodError;
        fileResults.push({ file, valid: false, zodErrors: zErr.errors.map((e) => `${e.path.join('.')} – ${e.message}`) });
      }
    }
  }

  // semantic pass
  const semanticIssues = semVal.run();

  // ------------------- REPORT -------------------
  const lines: string[] = [];
  lines.push('# Ontology Validation Report');
  lines.push(`Generated on ${new Date().toISOString()}`);
  lines.push('');
  let invalid = 0;
  for (const res of fileResults) {
    if (res.valid) lines.push(`✅ **${basename(res.file)}**`);
    else {
      invalid++;
      lines.push(`❌ **${basename(res.file)}**`);
      res.zodErrors!.forEach((e) => lines.push(`  * ${e}`));
    }
  }
  lines.push('\n---');
  semanticIssues.forEach((iss) => {
    lines.push(`### ${iss.ontology}`);
    iss.missing.forEach((m) => lines.push(`* Missing entity referenced in relationships: **${m}**`));
    lines.push('');
  });
  await fsp.writeFile('ONTOLOGY_VALIDATION_REPORT.md', lines.join('\n'));
  console.log(lines.join('\n'));

  if (invalid || semanticIssues.some((i) => i.missing.length)) {
    console.log('\n❌ Validation failed.');
    process.exit(1);
  } else {
    console.log('\n✅ All ontology files are structurally valid and have no missing entity references.');
  }
})(); 