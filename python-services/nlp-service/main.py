import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import spacy
import re
from typing import List, Dict, Any, Optional
from openai import OpenAI
from dotenv import load_dotenv
import json
from sentence_transformers import SentenceTransformer

# --- Environment and API Key Setup ---
load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    print("⚠️ WARNING: OPENAI_API_KEY not found in .env file. LLM refinement will be disabled.")
    client = None
else:
    client = OpenAI(api_key=openai_api_key)

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
    entity_types: List[str]
    relationship_types: List[str]
    property_types: List[str] = []

# --- Global State ---
VALID_ONTOLOGY_TYPES: List[str] = []
VALID_RELATIONSHIP_TYPES: List[str] = []
PROPERTY_ENTITY_TYPES: List[str] = []

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

# --- LLM Graph Extraction Logic ---
def extract_graph_with_llm(text: str) -> Dict[str, Any]:
    if not client:
        raise HTTPException(status_code=503, detail="OpenAI client not configured.")
    
    if not VALID_ONTOLOGY_TYPES:
        raise HTTPException(status_code=400, detail="Ontology not initialized. Please call the /ontologies endpoint first.")

    # Core entity types are all types that are NOT property-like types.
    core_entity_types = [t for t in VALID_ONTOLOGY_TYPES if t not in PROPERTY_ENTITY_TYPES]

    prompt = f"""
    You are an expert financial analyst creating a knowledge graph from a text.
    Your task is to extract all relevant entities, their properties, and the relationships between them.
    Your final output must be a single JSON object with two keys: "entities" and "relationships".

    **Instructions:**
    1.  **Identify Core Entities**: First, read through the text and identify all primary entities like people, organizations, deals, projects, etc. Use ONLY these types: `({', '.join(core_entity_types)})`.
    2.  **Identify Properties**: Next, find all numerical, date-based, or contact-related values that would correspond to these types: `({', '.join(PROPERTY_ENTITY_TYPES)})`.
    3.  **Associate Properties**: For each property found in step 2, associate it with the most relevant core entity from step 1. For example:
        - A monetary amount like "$50M" is likely the `dealSize` of a `Deal`.
        - An email address like "david.chen@morganstanley.com" is the `email` for the `Person` "David Chen".
    4.  **Construct JSON**: Assemble your findings into a single JSON object. Entities that have associated properties should have a `properties` object.
        - **CRITICAL RULE**: Do not create any entities with the types `({', '.join(PROPERTY_ENTITY_TYPES)})`. They must only exist inside the `properties` of a core entity.
        - Use descriptive camelCase keys (e.g., `dealSize`, `interestRate`, `email`, `deadlineDate`).
        - **Correct Example 1 (Deal)**: `{{"type": "Deal", "value": "Project Anvil", "properties": {{"dealSize": "$50M"}}}}`
        - **Correct Example 2 (Person)**: `{{"type": "Person", "value": "David Chen", "properties": {{"email": "david.chen@morganstanley.com"}}}}`
        - **Incorrect Example**: `[{{ "type": "Person", "value": "David Chen" }}, {{ "type": "Email", "value": "david.chen@morganstanley.com"}}]`

    5.  **Relationship Identification**: You MUST identify relationships only between the Core Entities identified in step 1.
        - Allowed Relationship Types: `({', '.join(VALID_RELATIONSHIP_TYPES)})`
        - The `source` and `target` of a relationship must be the `value` of an extracted entity.

    **Text to Analyze:**
    ---
    {text}
    ---
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            response_format={"type": "json_object"}
        )
        
        response_str = response.choices[0].message.content
        if response_str:
            graph_data = json.loads(response_str)
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
    Receives the latest ontology from the TypeScript backend to ensure the LLM
    uses the correct entity and relationship types for extraction.
    """
    global VALID_ONTOLOGY_TYPES, VALID_RELATIONSHIP_TYPES, PROPERTY_ENTITY_TYPES
    VALID_ONTOLOGY_TYPES = request.entity_types
    VALID_RELATIONSHIP_TYPES = request.relationship_types
    PROPERTY_ENTITY_TYPES = request.property_types
    print(f"✅ Ontology updated with {len(VALID_ONTOLOGY_TYPES)} entity types, {len(PROPERTY_ENTITY_TYPES)} property types, and {len(VALID_RELATIONSHIP_TYPES)} relationship types.")

@app.post("/batch-extract-graph", response_model=List[GraphResponse], summary="Batch Extract Graphs from Multiple Texts")
async def batch_extract_graph_endpoint(request: BatchExtractionRequest):
    """
    Extracts entities, relationships, and embeddings for a batch of texts.
    - **texts**: A list of strings to process.
    """
    results = []
    for text in request.texts:
        # Re-using the existing single-text extraction logic
        raw_entities = extractor.extract_entities(text)
        
        embedding = None
        if embedding_model:
            embedding = embedding_model.encode(text).tolist()
            
        try:
            graph_data = extract_graph_with_llm(text)
            
            results.append({
                "entities": graph_data.get("entities", []),
                "relationships": graph_data.get("relationships", []),
                "refinement_info": f"Refined {len(raw_entities)} entities and found {len(graph_data.get('relationships', []))} relationships.",
                "embedding": embedding
            })
        except Exception as e:
            # If one text fails, we can decide to either skip it or raise an error.
            # Here, we'll log a warning and continue with the batch.
            print(f"Warning: Failed to process a text in batch. Error: {e}")
            # Optionally add a placeholder or error response for the failed item
            results.append({
                "entities": [],
                "relationships": [],
                "refinement_info": f"Failed to process text. Error: {e}",
                "embedding": None
            })
            
    return results

@app.get("/health")
def health_check():
    return {"status": "ok"} 