import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import spacy
import re
import time # Import the time module
import uvicorn
from typing import List, Dict, Any, Optional
from openai import OpenAI, AsyncOpenAI
from dotenv import load_dotenv
import json
from sentence_transformers import SentenceTransformer
import asyncio # Import asyncio
from pathlib import Path  # Added for prompt debugging persistence

# --- Environment and API Key Setup ---
load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    print("⚠️ WARNING: OPENAI_API_KEY not found in .env file. LLM refinement will be disabled.")
    client = None
    async_client = None
else:
    client = OpenAI(api_key=openai_api_key)
    async_client = AsyncOpenAI(api_key=openai_api_key)

# --- Pydantic Models for API data validation ---
class ExtractionRequest(BaseModel):
    text: str
    
class BatchExtractionRequest(BaseModel):
    texts: List[str]
    
class Entity(BaseModel):
    type: str
    value: str
    confidence: Optional[float] = None
    properties: Optional[Dict[str, Any]] = None
    # Optional fields for the refined model
    start: Optional[int] = None
    end: Optional[int] = None
    spacy_label: Optional[str] = None
    context: Optional[str] = None

class Relationship(BaseModel):
    source: str
    target: str
    type: str
    confidence: Optional[float] = None
    explanation: Optional[str] = None

class GraphResponse(BaseModel):
    entities: List[Entity]
    relationships: List[Relationship]
    refinement_info: str
    embedding: Optional[List[float]] = None

class RefinedExtractionResponse(BaseModel):
    raw_entities: List[Entity]
    refined_entities: List[Entity]
    refinement_info: str

class EmbeddingRequest(BaseModel):
    texts: List[str]

class OntologyUpdateRequest(BaseModel):
    entity_types: List[str] = []
    relationship_types: List[str] = []
    property_types: List[str] = []
    entity_descriptions: Dict[str, str] | None = None
    relationship_descriptions: Dict[str, str] | None = None
    # New compact ontology format
    compact_ontology: Dict[str, Any] | None = None

# --- Global State ---
VALID_ONTOLOGY_TYPES: List[str] = []
VALID_RELATIONSHIP_TYPES: List[str] = []
PROPERTY_ENTITY_TYPES: List[str] = []

# -------------------------------------------
# Global ontology schema context (populated via /ontologies)
ENTITY_DESCRIPTIONS: Dict[str, str] = {}
RELATIONSHIP_DESCRIPTIONS: Dict[str, str] = {}

# --- Entity Extractor Class (adapted from the original script) ---
class SpacyEntityExtractor:
    def __init__(self, model_name: str = "en_core_web_lg"):
        try:
            self.nlp = spacy.load(model_name)
        except OSError:
            # Automatic download if model not found - requires internet on first run
            print(f"Model '{model_name}' not found. Downloading...")
            spacy.cli.download(model_name)
            self.nlp = spacy.load(model_name)
        
        ruler = self.nlp.add_pipe("entity_ruler", before="ner")
        patterns = [
            {"label": "STOCK_SYMBOL", "pattern": [{"TEXT": {"REGEX": r"^\([A-Z]+:[A-Z]{1,5}\)$"}}]},
            {"label": "CURRENCY", "pattern": [{"TEXT": {"REGEX": r"^\$[\d,]+(?:\.\d{2})?$"}}]},
            {"label": "FINANCIAL_ORG", "pattern": [{"LOWER": "goldman"}, {"LOWER": "sachs"}]},
            {"label": "FINANCIAL_ORG", "pattern": [{"LOWER": "jpmorgan"}]},
            {"label": "JOB_TITLE", "pattern": [{"LOWER": "cfa"}]},
        ]
        ruler.add_patterns(patterns)
    
    def extract_entities(self, text: str) -> List[Dict[str, Any]]:
        doc = self.nlp(text)
        entities = [
            {
                "type": self._map_entity_label(ent.label_),
                "value": ent.text.strip(),
                "confidence": 0.85, # Simplified confidence for the service
                "start": ent.start_char,
                "end": ent.end_char,
                "spacy_label": ent.label_,
                "context": doc[max(0, ent.start - 5):min(len(doc), ent.end + 5)].text
            } for ent in doc.ents
        ]
        # For simplicity, regex and deduplication are omitted in this service version
        # but can be easily re-added here.
        return entities
    
    def _map_entity_label(self, spacy_label: str) -> str:
        mapping = { "PERSON": "PERSON_NAME", "ORG": "COMPANY_NAME", "GPE": "LOCATION", "MONEY": "MONETARY_AMOUNT" }
        return mapping.get(spacy_label, spacy_label)

# --- ASYNC LLM Graph Extraction Logic ---
async def extract_graph_with_llm_async(text: str) -> Dict[str, Any]:
    if not async_client:
        raise HTTPException(status_code=503, detail="OpenAI async client not configured.")
    
    if not VALID_ONTOLOGY_TYPES:
        raise HTTPException(status_code=400, detail="Ontology not initialized. Please call the /ontologies endpoint first.")

    # Core entity types are all types that are NOT property-like types.
    core_entity_types = [t for t in VALID_ONTOLOGY_TYPES if t not in PROPERTY_ENTITY_TYPES]

    # Build compact ontology format for the prompt
    compact_ontology = {
        "e": core_entity_types,
        "r": []  # We'll populate this from VALID_RELATIONSHIP_TYPES if available
    }
    
    # If we have relationship patterns, convert them to compact format
    if hasattr(globals(), 'RELATIONSHIP_PATTERNS') and 'RELATIONSHIP_PATTERNS' in globals():
        for pattern in globals()['RELATIONSHIP_PATTERNS']:
            if '-' in pattern and '->' in pattern:
                parts = pattern.split('-')
                if len(parts) >= 2:
                    source = parts[0]
                    rest = '-'.join(parts[1:])
                    if '->' in rest:
                        rel_type, target = rest.split('->', 1)
                        compact_ontology["r"].append([source, rel_type, target])

    prompt = f"""
    You are an expert financial analyst creating a knowledge graph from a text. Your goal is to extract entities and relationships to build a graph. Your final output must be a single JSON object with "entities" and "relationships" keys.

    **Ontology format:**
    - "e" is the list of entity types.
    - "r" is the list of relationships, each as [source_entity, relationship_type, target_entity].

    **Ontology:**
    {json.dumps(compact_ontology, indent=2)}

    **Instructions:**
    1. Analyze the provided text carefully
    2. Extract entities that match the ontology types
    3. Identify relationships between entities using the provided patterns
    4. Return a JSON object with "entities" and "relationships" arrays
    5. Each entity should have: value, type, properties
    6. Each relationship should have: source, target, type

    **Output Format:**
    {{
      "entities": [
        {{
          "value": "entity name",
          "type": "entity type",
          "properties": {{}}
        }}
      ],
      "relationships": [
        {{
          "source": "source entity value",
          "target": "target entity value", 
          "type": "relationship type"
        }}
      ]
    }}

    **Text to Analyze:**
    ---
    {text}
    ---
    """
    
    # --- DEBUG: Persist prompt to disk (optional) ---
    try:
        debug_dir = Path(os.getenv("PROMPT_DEBUG_DIR", "/tmp/llm-prompts"))
        debug_dir.mkdir(parents=True, exist_ok=True)
        ts = int(time.time() * 1000)
        debug_file = debug_dir / f"prompt-{ts}.txt"
        debug_file.write_text(prompt)
    except Exception as e:
        # Non-fatal: if we cannot write the prompt we just continue
        print(f"⚠️  Failed to write LLM prompt for debugging: {e}")

    try:
        llm_start_time = time.time()

        response = await async_client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            response_format={"type": "json_object"}
        )
        
        llm_end_time = time.time()
        print(f"      [LLM Trace] Async OpenAI API call took: {llm_end_time - llm_start_time:.2f} seconds")

        response_str = response.choices[0].message.content
        if response_str:
            graph_data = json.loads(response_str)

            if isinstance(graph_data, dict):
                entities = graph_data.get("entities", [])
                relationships = graph_data.get("relationships", [])

                for entity in entities:
                    if isinstance(entity, dict) and "confidence" not in entity:
                        entity["confidence"] = 0.9
                for rel in relationships:
                    if isinstance(rel, dict) and "confidence" not in rel:
                        rel["confidence"] = 0.9
                
                return {"entities": entities, "relationships": relationships, "refinement_info": "LLM extraction successful"}
        
        return {"entities": [], "relationships": [], "refinement_info": "LLM parsing failed"}

    except Exception as e:
        print(f"      [LLM Trace] Error during async extraction for a document: {e}")
        return {"entities": [], "relationships": [], "refinement_info": f"LLM graph extraction error: {str(e)}"}

# --- LLM Graph Extraction Logic ---
def extract_graph_with_llm(text: str) -> Dict[str, Any]:
    if not client:
        raise HTTPException(status_code=503, detail="OpenAI client not configured.")
    
    if not VALID_ONTOLOGY_TYPES:
        raise HTTPException(status_code=400, detail="Ontology not initialized. Please call the /ontologies endpoint first.")

    # Core entity types are all types that are NOT property-like types.
    core_entity_types = [t for t in VALID_ONTOLOGY_TYPES if t not in PROPERTY_ENTITY_TYPES]

    # Build compact ontology format for the prompt
    compact_ontology = {
        "e": core_entity_types,
        "r": []  # We'll populate this from VALID_RELATIONSHIP_TYPES if available
    }
    
    # If we have relationship patterns, convert them to compact format
    if hasattr(globals(), 'RELATIONSHIP_PATTERNS') and 'RELATIONSHIP_PATTERNS' in globals():
        for pattern in globals()['RELATIONSHIP_PATTERNS']:
            if '-' in pattern and '->' in pattern:
                parts = pattern.split('-')
                if len(parts) >= 2:
                    source = parts[0]
                    rest = '-'.join(parts[1:])
                    if '->' in rest:
                        rel_type, target = rest.split('->', 1)
                        compact_ontology["r"].append([source, rel_type, target])

    prompt = f"""
    You are an expert financial analyst creating a knowledge graph from a text. Your goal is to extract entities and relationships to build a graph. Your final output must be a single JSON object with "entities" and "relationships" keys.

    **Ontology format:**
    - "e" is the list of entity types.
    - "r" is the list of relationships, each as [source_entity, relationship_type, target_entity].

    **Ontology:**
    {json.dumps(compact_ontology, indent=2)}

    **Instructions:**
    1. Analyze the provided text carefully
    2. Extract entities that match the ontology types
    3. Identify relationships between entities using the provided patterns
    4. Return a JSON object with "entities" and "relationships" arrays
    5. Each entity should have: value, type, properties
    6. Each relationship should have: source, target, type

    **Output Format:**
    {{
      "entities": [
        {{
          "value": "entity name",
          "type": "entity type",
          "properties": {{}}
        }}
      ],
      "relationships": [
        {{
          "source": "source entity value",
          "target": "target entity value", 
          "type": "relationship type"
        }}
      ]
    }}

    **Text to Analyze:**
    ---
    {text}
    ---
    """
    
    try:
        print("      [LLM Trace] Starting LLM graph extraction...")
        llm_start_time = time.time()

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            response_format={"type": "json_object"}
        )
        
        llm_end_time = time.time()
        print(f"      [LLM Trace] OpenAI API call took: {llm_end_time - llm_start_time:.2f} seconds")

        response_str = response.choices[0].message.content
        if response_str:
            parsing_start_time = time.time()
            graph_data = json.loads(response_str)
            parsing_end_time = time.time()
            print(f"      [LLM Trace] JSON parsing took: {parsing_end_time - parsing_start_time:.4f} seconds")

            # Validate and fix the structure if needed
            if isinstance(graph_data, dict):
                entities = graph_data.get("entities", [])
                relationships = graph_data.get("relationships", [])

                # Add default confidence if missing
                for entity in entities:
                    if isinstance(entity, dict) and "confidence" not in entity:
                        entity["confidence"] = 0.9
                for rel in relationships:
                    if isinstance(rel, dict) and "confidence" not in rel:
                        rel["confidence"] = 0.9
                
                return {"entities": entities, "relationships": relationships}
        
        # Return a default empty structure if parsing fails
        return {"entities": [], "relationships": []}

    except Exception as e:
        print(f"      [LLM Trace] Error during extraction: {e}")
        raise HTTPException(status_code=500, detail=f"LLM graph extraction error: {str(e)}")

# --- LLM Refinement Logic ---
def refine_entities_with_llm(text: str, spacy_entities: List[Dict]) -> List[Dict]:
    if not client:
        raise HTTPException(status_code=503, detail="OpenAI client not configured.")

    entities_json_str = json.dumps(spacy_entities, indent=2)

    prompt = f"""
    Review the following JSON list of named entities extracted from an email.
    Your task is to clean this list by removing any obvious errors.
    An error is an entity that is clearly not a real-world person, company, location, or monetary value.
    
    For example, remove items like "Hi Team", "25", or "YoY".
    Keep valid entities like "Vista Equity Partners", "David Chen", or "$40M".
    
    Return a JSON object with a single key "cleaned_entities" which contains the corrected list of entities.

    **Original Text:**
    ---
    {text}
    ---

    **Entities JSON:**
    ---
    {entities_json_str}
    ---
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            response_format={"type": "json_object"}
        )
        
        refined_json_str = response.choices[0].message.content
        if refined_json_str:
            refined_data = json.loads(refined_json_str)
            # Expecting the specific key "cleaned_entities"
            if isinstance(refined_data, dict) and "cleaned_entities" in refined_data:
                return refined_data["cleaned_entities"]
        
        return [] # Return empty list if parsing fails or key is not found

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM refinement error: {str(e)}")

# --- FastAPI Application ---
app = FastAPI(
    title="NLP Entity Extraction Service",
    description="A microservice to extract and refine financial entities from text.",
    version="1.2.0"
)

# Load the models once at startup and reuse them across requests
extractor = SpacyEntityExtractor()
embedding_model = None

@app.on_event("startup")
async def startup_event():
    global embedding_model
    print("✅ NLP Service loading...")
    # This will download the model on the first run if it's not cached
    embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    print("✅ NLP Service loaded and ready.")
    if client:
        print("✅ OpenAI client configured.")

@app.post("/extract-entities", response_model=List[Entity], summary="Raw spaCy Extraction")
async def extract_entities_endpoint(request: ExtractionRequest):
    """
    Extracts named entities using spaCy (raw output).
    - **text**: The input string to process.
    """
    entities = extractor.extract_entities(request.text)
    return entities
    
@app.post("/refine-entities", response_model=RefinedExtractionResponse, summary="Extract and Refine with LLM")
async def refine_entities_endpoint(request: ExtractionRequest):
    """
    Extracts entities with spaCy and then refines the list using a Large Language Model.
    - **text**: The input string to process.
    """
    # Step 1: Raw extraction with spaCy
    raw_entities = extractor.extract_entities(request.text)
    
    # Step 2: Refine with LLM
    refined_entities = refine_entities_with_llm(request.text, raw_entities)
    
    return RefinedExtractionResponse(
        raw_entities=[Entity(**e) for e in raw_entities],
        refined_entities=[Entity(**e) for e in refined_entities],
        refinement_info="Entities refined by LLM."
    )

@app.post("/extract-graph", response_model=GraphResponse, summary="Extract Entities and Relationships with LLM")
async def extract_graph_endpoint(request: ExtractionRequest):
    """
    Extracts a knowledge graph (entities and relationships) from text using an LLM,
    constrained by a predefined ontology.

    - **text**: The input string to process.
    """
    graph_data = extract_graph_with_llm(request.text)
    
    # Generate a single embedding for the whole text
    embedding = None
    if embedding_model:
        embedding = embedding_model.encode(request.text).tolist()

    return GraphResponse(
        entities=[Entity(**e) for e in graph_data.get("entities", [])],
        relationships=[Relationship(**r) for r in graph_data.get("relationships", [])],
        refinement_info="Graph generated directly by LLM based on dynamic ontology.",
        embedding=embedding
    )

@app.post("/embed", summary="Generate sentence embeddings for a list of texts")
async def embed_endpoint(request: EmbeddingRequest):
    """
    Generates sentence embeddings for a list of input texts.
    - **texts**: A list of strings to embed.
    """
    if not embedding_model:
        raise HTTPException(status_code=503, detail="Embedding model not available.")
    
    embeddings = embedding_model.encode(request.texts).tolist()
    return {"embeddings": embeddings}

@app.post("/ontologies", status_code=204, summary="Update the list of valid ontology types")
async def update_ontologies(request: OntologyUpdateRequest):
    """
    Receives the latest ontology from the TypeScript backend including optional
    descriptions so the LLM can leverage richer schema context.
    Supports both full ontology format and compact format.
    """
    global VALID_ONTOLOGY_TYPES, VALID_RELATIONSHIP_TYPES, PROPERTY_ENTITY_TYPES
    global ENTITY_DESCRIPTIONS, RELATIONSHIP_DESCRIPTIONS

    # Handle compact ontology format
    if request.compact_ontology:
        compact = request.compact_ontology
        VALID_ONTOLOGY_TYPES = compact.get('e', [])
        VALID_RELATIONSHIP_TYPES = []
        PROPERTY_ENTITY_TYPES = []
        ENTITY_DESCRIPTIONS = {}
        RELATIONSHIP_DESCRIPTIONS = {}
        
        # Convert compact relationships to relationship types
        relationships = compact.get('r', [])
        for rel in relationships:
            if len(rel) == 3:
                VALID_RELATIONSHIP_TYPES.append(rel[1])  # rel[1] is the relationship type
        
        print(
            f"✅ Compact ontology updated: {len(VALID_ONTOLOGY_TYPES)} entities, "
            f"{len(VALID_RELATIONSHIP_TYPES)} relationships"
        )
    else:
        # Handle legacy full ontology format
        VALID_ONTOLOGY_TYPES = request.entity_types
        VALID_RELATIONSHIP_TYPES = request.relationship_types
        PROPERTY_ENTITY_TYPES = request.property_types
        ENTITY_DESCRIPTIONS = request.entity_descriptions or {}
        RELATIONSHIP_DESCRIPTIONS = request.relationship_descriptions or {}
        print(
            f"✅ Full ontology updated: {len(VALID_ONTOLOGY_TYPES)} entities, "
            f"{len(PROPERTY_ENTITY_TYPES)} property types, "
            f"{len(VALID_RELATIONSHIP_TYPES)} relationships, "
            f"{len(ENTITY_DESCRIPTIONS)} descriptions"
        )

@app.post("/batch-extract-graph", response_model=List[GraphResponse], summary="Batch Extract Graphs from Multiple Texts")
async def batch_extract_graph_endpoint(request: BatchExtractionRequest):
    """
    Processes a batch of texts concurrently to extract knowledge graphs.
    This is much more efficient than calling /extract-graph in a loop.
    """
    print(f"--- Received batch request for {len(request.texts)} documents ---")
    batch_start_time = time.time()

    tasks = [extract_graph_with_llm_async(text) for text in request.texts]
    results = await asyncio.gather(*tasks)
    
    batch_end_time = time.time()
    print(f"--- Completed batch processing in {batch_end_time - batch_start_time:.2f} seconds ---")
    
    return results

@app.get("/health")
def health_check():
    """Simple health check to confirm the service is running."""
    return {"status": "ok"}

if __name__ == "__main__":
    print("🚀 Starting NLP service on http://127.0.0.1:8000")
    uvicorn.run(app, host="127.0.0.1", port=8000) 