import os
import uuid
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
    ontology: Optional[str] = None  # New field for ontology scoping
    database: Optional[str] = None  # New field for database specification
    
class BatchExtractionRequest(BaseModel):
    texts: List[str]
    ontology: Optional[str] = None  # New field for ontology scoping
    database: Optional[str] = None  # New field for database specification
    
class Entity(BaseModel):
    id: str  # Unique identifier for the entity
    type: str
    value: str
    confidence: Optional[float] = None
    properties: Optional[Dict[str, Any]] = None
    # Optional fields for the refined model
    start: Optional[int] = None
    end: Optional[int] = None
    spacy_label: Optional[str] = None
    context: Optional[str] = None
    # Graph data associated with this entity
    graph_data: Optional[Dict[str, Any]] = None

class Relationship(BaseModel):
    id: str  # Unique identifier for the relationship
    source: str
    target: str
    type: str
    confidence: Optional[float] = None
    explanation: Optional[str] = None
    # Graph data associated with this relationship
    graph_data: Optional[Dict[str, Any]] = None

class GraphResponse(BaseModel):
    request_id: str  # Unique identifier for the entire request
    entities: List[Entity]
    relationships: List[Relationship]
    refinement_info: str
    embedding: Optional[List[float]] = None
    ontology_used: Optional[str] = None  # New field to indicate which ontology was used
    database_used: Optional[str] = None  # New field to indicate which database was used
    # Graph metadata
    graph_metadata: Optional[Dict[str, Any]] = None

class RefinedExtractionResponse(BaseModel):
    request_id: str  # Unique identifier for the entire request
    raw_entities: List[Entity]
    refined_entities: List[Entity]
    refinement_info: str
    ontology_used: Optional[str] = None  # New field to indicate which ontology was used
    database_used: Optional[str] = None  # New field to indicate which database was used
    # Graph metadata
    graph_metadata: Optional[Dict[str, Any]] = None

class EmbeddingRequest(BaseModel):
    texts: List[str]

class OntologyUpdateRequest(BaseModel):
    entity_types: List[str] = []
    relationship_types: List[str] = []
    property_types: List[str] = []
    entity_descriptions: Optional[Dict[str, str]] = None
    relationship_descriptions: Optional[Dict[str, str]] = None
    # New compact ontology format
    compact_ontology: Optional[Dict[str, Any]] = None
    ontology: Optional[str] = None  # New field to name the ontology

# --- Global State ---
VALID_ONTOLOGY_TYPES: List[str] = []
VALID_RELATIONSHIP_TYPES: List[str] = []
PROPERTY_ENTITY_TYPES: List[str] = []

# -------------------------------------------
# Global ontology schema context (populated via /ontologies)
ENTITY_DESCRIPTIONS: Dict[str, str] = {}
RELATIONSHIP_DESCRIPTIONS: Dict[str, str] = {}

# New: Multiple ontology support
ONTOLOGIES: Dict[str, Dict[str, Any]] = {}  # Store multiple ontologies by name
DEFAULT_ONTOLOGY_NAME = "default"  # Default ontology name

def get_database_name(database_param: Optional[str] = None) -> Optional[str]:
    """
    Get the database name from parameter or environment variable.
    
    Args:
        database_param: Database name from request parameter
        
    Returns:
        Database name string or None if not set
    """
    if database_param:
        return database_param
    env_db = os.getenv("NEO4J_DATABASE")
    if env_db:
        return env_db
    return None

# Helper functions for generating unique identifiers and graph data
def generate_entity_id(entity_type: str, value: str) -> str:
    """
    Generate a unique identifier for an entity based on its type and value.
    
    Args:
        entity_type: Type of the entity
        value: Value of the entity
        
    Returns:
        Unique identifier string
    """
    # Create a deterministic ID based on type and value
    base_id = f"{entity_type}_{value}".replace(" ", "_").replace("-", "_").lower()
    # Add a UUID to ensure uniqueness
    unique_suffix = str(uuid.uuid4())[:8]
    return f"{base_id}_{unique_suffix}"

def generate_relationship_id(source: str, target: str, rel_type: str) -> str:
    """
    Generate a unique identifier for a relationship.
    
    Args:
        source: Source entity
        target: Target entity
        rel_type: Type of relationship
        
    Returns:
        Unique identifier string
    """
    base_id = f"{source}_{rel_type}_{target}".replace(" ", "_").replace("-", "_").lower()
    unique_suffix = str(uuid.uuid4())[:8]
    return f"rel_{base_id}_{unique_suffix}"

def generate_request_id() -> str:
    """
    Generate a unique identifier for a request.
    
    Returns:
        Unique identifier string
    """
    return f"req_{str(uuid.uuid4())}"

def create_entity_graph_data(entity: Dict[str, Any], ontology_config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create graph data for an entity based on ontology configuration.
    
    Args:
        entity: Entity dictionary
        ontology_config: Ontology configuration
        
    Returns:
        Graph data dictionary
    """
    entity_type = entity.get("type", "")
    entity_value = entity.get("value", "")
    
    # Get entity description from ontology
    entity_descriptions = ontology_config.get("entity_descriptions", {})
    description = entity_descriptions.get(entity_type, f"Entity of type {entity_type}")
    
    graph_data = {
        "node_type": entity_type,
        "node_value": entity_value,
        "description": description,
        "confidence": entity.get("confidence", 0.0),
        "properties": entity.get("properties", {}),
        "extraction_method": "nlp_service",
        "timestamp": time.time(),
        "ontology_source": ontology_config.get("ontology_name", "default")
    }
    
    # Add additional properties if available
    if entity.get("start") is not None:
        graph_data["text_position"] = {
            "start": entity["start"],
            "end": entity["end"]
        }
    
    if entity.get("context"):
        graph_data["context"] = entity["context"]
    
    # Store the entity in global storage
    entity_id = entity.get("id", "")
    if entity_id:
        EXTRACTED_OBJECTS[entity_id] = {
            "type": "entity",
            "entity_type": entity_type,
            "value": entity_value,
            "graph_data": graph_data,
            "extraction_timestamp": time.time()
        }
    
    return graph_data

def create_relationship_graph_data(relationship: Dict[str, Any], ontology_config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create graph data for a relationship based on ontology configuration.
    
    Args:
        relationship: Relationship dictionary
        ontology_config: Ontology configuration
        
    Returns:
        Graph data dictionary
    """
    rel_type = relationship.get("type", "")
    
    # Get relationship description from ontology
    relationship_descriptions = ontology_config.get("relationship_descriptions", {})
    description = relationship_descriptions.get(rel_type, f"Relationship of type {rel_type}")
    
    graph_data = {
        "edge_type": rel_type,
        "source": relationship.get("source", ""),
        "target": relationship.get("target", ""),
        "description": description,
        "confidence": relationship.get("confidence", 0.0),
        "explanation": relationship.get("explanation", ""),
        "extraction_method": "nlp_service",
        "timestamp": time.time(),
        "ontology_source": ontology_config.get("ontology_name", "default")
    }
    
    # Store the relationship in global storage
    rel_id = relationship.get("id", "")
    if rel_id:
        EXTRACTED_OBJECTS[rel_id] = {
            "type": "relationship",
            "relationship_type": rel_type,
            "source": relationship.get("source", ""),
            "target": relationship.get("target", ""),
            "graph_data": graph_data,
            "extraction_timestamp": time.time()
        }
    
    return graph_data

# Helper functions for ontology management
def get_ontology_by_name(ontology: Optional[str] = None) -> Dict[str, Any]:
    """
    Get ontology configuration by name. Falls back to default if not found.
    
    Args:
        ontology: Name of the ontology to retrieve
        
    Returns:
        Ontology configuration dictionary
    """
    if not ontology:
        ontology = DEFAULT_ONTOLOGY_NAME
    
    # Return the specific ontology if it exists
    if ontology in ONTOLOGIES:
        return ONTOLOGIES[ontology]
    
    # Fall back to default ontology
    if DEFAULT_ONTOLOGY_NAME in ONTOLOGIES:
        print(f"⚠️  Ontology '{ontology}' not found, using default ontology")
        return ONTOLOGIES[DEFAULT_ONTOLOGY_NAME]
    
    # Fall back to global state (legacy support)
    print(f"⚠️  No ontologies configured, using global state")
    return {
        "entity_types": VALID_ONTOLOGY_TYPES,
        "relationship_types": VALID_RELATIONSHIP_TYPES,
        "property_types": PROPERTY_ENTITY_TYPES,
        "entity_descriptions": ENTITY_DESCRIPTIONS,
        "relationship_descriptions": RELATIONSHIP_DESCRIPTIONS
    }

def get_available_ontologies() -> List[str]:
    """
    Get list of available ontology names.
    
    Returns:
        List of ontology names
    """
    return list(ONTOLOGIES.keys())

def validate_ontology_name(ontology: str) -> bool:
    """
    Check if an ontology name is valid.
    
    Args:
        ontology: Name to validate
        
    Returns:
        True if valid, False otherwise
    """
    return ontology in ONTOLOGIES or ontology == DEFAULT_ONTOLOGY_NAME

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
            {"label": "StockSymbol", "pattern": [{"TEXT": {"REGEX": r"^\([A-Z]+:[A-Z]{1,5}\)$"}}]},
            {"label": "Currency", "pattern": [{"TEXT": {"REGEX": r"^\$[\d,]+(?:\.\d{2})?$"}}]},
            {"label": "FinancialOrg", "pattern": [{"LOWER": "goldman"}, {"LOWER": "sachs"}]},
            {"label": "FinancialOrg", "pattern": [{"LOWER": "jpmorgan"}]},
            {"label": "JobTitle", "pattern": [{"LOWER": "cfa"}]},
        ]
        ruler.add_patterns(patterns)
    
    def extract_entities(self, text: str) -> List[Dict[str, Any]]:
        doc = self.nlp(text)
        entities = []
        for ent in doc.ents:
            entity_type = self._map_entity_label(ent.label_)
            entity_value = ent.text.strip()
            entity_id = generate_entity_id(entity_type, entity_value)
            
            entity = {
                "id": entity_id,
                "type": entity_type,
                "value": entity_value,
                "confidence": 0.85, # Simplified confidence for the service
                "start": ent.start_char,
                "end": ent.end_char,
                "spacy_label": ent.label_,
                "context": doc[max(0, ent.start - 5):min(len(doc), ent.end + 5)].text
            }
            entities.append(entity)
        
        # For simplicity, regex and deduplication are omitted in this service version
        # but can be easily re-added here.
        return entities
    
    def _map_entity_label(self, spacy_label: str) -> str:
        mapping = { 
            "PERSON": "PersonName", 
            "ORG": "Company", 
            "GPE": "Location", 
            "MONEY": "MonetaryAmount",
            "StockSymbol": "StockSymbol",
            "Currency": "Currency", 
            "FinancialOrg": "FinancialOrg",
            "JobTitle": "JobTitle"
        }
        return mapping.get(spacy_label, spacy_label)

# --- ASYNC LLM Graph Extraction Logic ---
async def extract_graph_with_llm_async(text: str, ontology: Optional[str] = None, database: Optional[str] = None) -> Dict[str, Any]:
    if not async_client:
        raise HTTPException(status_code=503, detail="OpenAI async client not configured.")
    
    # Get ontology configuration
    ontology_config = get_ontology_by_name(ontology)
    entity_types = ontology_config.get("entity_types", [])
    
    if not entity_types:
        raise HTTPException(status_code=400, detail="Ontology not initialized. Please call the /ontologies endpoint first.")

    # Core entity types are all types that are NOT property-like types.
    property_types = ontology_config.get("property_types", [])
    core_entity_types = [t for t in entity_types if t not in property_types]

    # Build compact ontology format for the prompt
    compact_ontology = {
        "e": core_entity_types,
        "r": []  # We'll populate this from relationship types if available
    }
    
    # Get relationship types and build compact ontology relationships
    relationship_types = ontology_config.get("relationship_types", [])
    
    # Get compact ontology from the configuration if available
    compact_ontology_config = ontology_config.get("compact_ontology", {})
    if compact_ontology_config and "r" in compact_ontology_config:
        compact_ontology["r"] = compact_ontology_config["r"]
    else:
        # Fallback: create simple relationship patterns from relationship types
        # This is a simplified approach - the backend should provide proper patterns
        for rel_type in relationship_types:
            # Create generic patterns for common relationship types
            if "Value" in rel_type or "Amount" in rel_type:
                compact_ontology["r"].append(["Awarder", rel_type, "MonetaryValue"])
                compact_ontology["r"].append(["Tenderer", rel_type, "MonetaryValue"])
            elif "Winner" in rel_type:
                compact_ontology["r"].append(["AwardDecision", rel_type, "Winner"])
            elif "Award" in rel_type:
                compact_ontology["r"].append(["Awarder", rel_type, "Tenderer"])
                compact_ontology["r"].append(["Awarder", rel_type, "Winner"])

    prompt = f"""
You are an expert knowledge graph builder. Your task is to extract entities and relationships from the following text, using the provided ontology as a guide.

**Ontology:**
{json.dumps(compact_ontology, indent=2)}

**CRITICAL INSTRUCTIONS FOR ENTITY EXTRACTION:**
1. **ALWAYS extract the ACTUAL TEXT from the document** that represents each entity. NEVER use the entity type name as the entity value.
2. **Entity Value Rules:**
   - For companies: Extract the actual company name (e.g., "ABC Corp", "Microsoft", "Goldman Sachs")
   - For people: Extract the actual person name (e.g., "John Smith", "CEO Tim Cook")
   - For monetary values: Extract the actual amount (e.g., "$170,000 CAD", "50 million USD")
   - For procurement objects: Extract what is being procured (e.g., "raw materials", "transport services", "steel and aluminum")
   - For contracts: Extract the actual contract reference or description (e.g., "PROCUREMENT-816467", "purchase order for materials")
   - For locations: Extract the actual location name (e.g., "New York", "London office")
3. **Entity Type Matching:**
   - Match each extracted text to the most appropriate ontology type
   - If an entity doesn't match any ontology type exactly, create a descriptive label and append "Inferred" to it
   - NEVER use the entity type name as the entity value
4. **Examples of CORRECT extraction:**
   - Text: "Contract awarded to ABC Corp for raw materials"
   - Correct: {{"value": "ABC Corp", "type": "Business"}}, {{"value": "raw materials", "type": "ProcurementObject"}}
   - WRONG: {{"value": "Business", "type": "Business"}}, {{"value": "ProcurementObject", "type": "ProcurementObject"}}

**Relationship Extraction:**
5. Extract all relationships that match the ontology's relationship types and patterns.
6. If you find a relationship between two entities that does not match any ontology pattern, you may invent a relationship type, but you MUST use ALL_CAPS with underscores only between words, and append the suffix "Inferred" to its type (e.g., SUPERVISES_INFERRED, ASSOCIATED_WITH_INFERRED).

**Output Format (JSON):**
{{
  "entities": [
    {{
      "value": "actual text from document",
      "type": "entity type from ontology",
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

Please respond with a valid JSON object following this exact format.

**Text to Analyze:**
---
{text}
---
"""
    
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
                
                return {
                    "entities": entities, 
                    "relationships": relationships, 
                    "refinement_info": f"LLM extraction successful using ontology: {ontology or 'default'}"
                }
        
        return {"entities": [], "relationships": [], "refinement_info": "LLM parsing failed"}

    except Exception as e:
        print(f"      [LLM Trace] Error during async extraction for a document: {e}")
        return {"entities": [], "relationships": [], "refinement_info": f"LLM graph extraction error: {str(e)}"}

# --- LLM Graph Extraction Logic ---
def extract_graph_with_llm(text: str, ontology: Optional[str] = None, database: Optional[str] = None) -> Dict[str, Any]:
    if not client:
        raise HTTPException(status_code=503, detail="OpenAI client not configured.")
    
    # Get ontology configuration
    ontology_config = get_ontology_by_name(ontology)
    entity_types = ontology_config.get("entity_types", [])
    
    if not entity_types:
        raise HTTPException(status_code=400, detail="Ontology not initialized. Please call the /ontologies endpoint first.")

    # Core entity types are all types that are NOT property-like types.
    property_types = ontology_config.get("property_types", [])
    core_entity_types = [t for t in entity_types if t not in property_types]

    # Build compact ontology format for the prompt
    compact_ontology = {
        "e": core_entity_types,
        "r": []  # We'll populate this from relationship types if available
    }
    
    # Get relationship types and build compact ontology relationships
    relationship_types = ontology_config.get("relationship_types", [])
    
    # Get compact ontology from the configuration if available
    compact_ontology_config = ontology_config.get("compact_ontology", {})
    if compact_ontology_config and "r" in compact_ontology_config:
        compact_ontology["r"] = compact_ontology_config["r"]
    else:
        # Fallback: create simple relationship patterns from relationship types
        # This is a simplified approach - the backend should provide proper patterns
        for rel_type in relationship_types:
            # Create generic patterns for common relationship types
            if "Value" in rel_type or "Amount" in rel_type:
                compact_ontology["r"].append(["Awarder", rel_type, "MonetaryValue"])
                compact_ontology["r"].append(["Tenderer", rel_type, "MonetaryValue"])
            elif "Winner" in rel_type:
                compact_ontology["r"].append(["AwardDecision", rel_type, "Winner"])
            elif "Award" in rel_type:
                compact_ontology["r"].append(["Awarder", rel_type, "Tenderer"])
                compact_ontology["r"].append(["Awarder", rel_type, "Winner"])

    prompt = f"""
You are an expert knowledge graph builder. Your task is to extract entities and relationships from the following text, using the provided ontology as a guide.

**Ontology:**
{json.dumps(compact_ontology, indent=2)}

**CRITICAL INSTRUCTIONS FOR ENTITY EXTRACTION:**
1. **ALWAYS extract the ACTUAL TEXT from the document** that represents each entity. NEVER use the entity type name as the entity value.
2. **Entity Value Rules:**
   - For companies: Extract the actual company name (e.g., "ABC Corp", "Microsoft", "Goldman Sachs")
   - For people: Extract the actual person name (e.g., "John Smith", "CEO Tim Cook")
   - For monetary values: Extract the actual amount (e.g., "$170,000 CAD", "50 million USD")
   - For procurement objects: Extract what is being procured (e.g., "raw materials", "transport services", "steel and aluminum")
   - For contracts: Extract the actual contract reference or description (e.g., "PROCUREMENT-816467", "purchase order for materials")
   - For locations: Extract the actual location name (e.g., "New York", "London office")
3. **Entity Type Matching:**
   - Match each extracted text to the most appropriate ontology type
   - If an entity doesn't match any ontology type exactly, create a descriptive label and append "Inferred" to it
   - NEVER use the entity type name as the entity value
4. **Examples of CORRECT extraction:**
   - Text: "Contract awarded to ABC Corp for raw materials"
   - Correct: {{"value": "ABC Corp", "type": "Business"}}, {{"value": "raw materials", "type": "ProcurementObject"}}
   - WRONG: {{"value": "Business", "type": "Business"}}, {{"value": "ProcurementObject", "type": "ProcurementObject"}}

**Relationship Extraction:**
5. Extract all relationships that match the ontology's relationship types and patterns.
6. If you find a relationship between two entities that does not match any ontology pattern, you may invent a relationship type, but you MUST use ALL_CAPS with underscores only between words, and append the suffix "Inferred" to its type (e.g., SUPERVISES_INFERRED, ASSOCIATED_WITH_INFERRED).

**Output Format (JSON):**
{{
  "entities": [
    {{
      "value": "actual text from document",
      "type": "entity type from ontology",
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

Please respond with a valid JSON object following this exact format.

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

                # Patch: Support both 'type' and 'types' fields for entities
                for entity in entities:
                    if isinstance(entity, dict):
                        if "types" in entity and isinstance(entity["types"], list) and entity["types"]:
                            entity["type"] = entity["types"][0]  # Use the first type for compatibility
                        elif "type" not in entity and "types" not in entity:
                            entity["type"] = "Unknown"
                        if "confidence" not in entity:
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
    # Log prompt debug directory (if any)
    debug_dir = os.getenv("PROMPT_DEBUG_DIR", "/tmp/llm-prompts")
    print(f"🗂️  Prompt debug directory set to: {debug_dir}")

@app.post("/extract-entities", response_model=List[Entity], summary="Raw spaCy Extraction")
async def extract_entities_endpoint(request: ExtractionRequest):
    """
    Extracts named entities using spaCy (raw output).
    - **text**: The input string to process.
    - **ontology**: Optional ontology name to scope the extraction.
    """
    entities = extractor.extract_entities(request.text)
    
    # Get ontology configuration for graph data
    ontology_config = get_ontology_by_name(request.ontology)
    
    # Add graph data to each entity
    for entity in entities:
        entity["graph_data"] = create_entity_graph_data(entity, ontology_config)
    
    return entities
    
@app.post("/refine-entities", response_model=RefinedExtractionResponse, summary="Extract and Refine with LLM")
async def refine_entities_endpoint(request: ExtractionRequest):
    """
    Extracts entities with spaCy and then refines the list using a Large Language Model.
    - **text**: The input string to process.
    - **ontology**: Optional ontology name to scope the extraction.
    """
    request_id = generate_request_id()
    
    # Step 1: Raw extraction with spaCy
    raw_entities = extractor.extract_entities(request.text)
    
    # Step 2: Refine with LLM
    refined_entities = refine_entities_with_llm(request.text, raw_entities)
    
    # Get ontology configuration for graph data
    ontology_config = get_ontology_by_name(request.ontology)
    
    # Add graph data to entities
    for entity in raw_entities:
        entity["graph_data"] = create_entity_graph_data(entity, ontology_config)
    
    for entity in refined_entities:
        if "id" not in entity:
            entity["id"] = generate_entity_id(entity.get("type", ""), entity.get("value", ""))
        entity["graph_data"] = create_entity_graph_data(entity, ontology_config)
    
    # Create graph metadata
    graph_metadata = {
        "request_id": request_id,
        "text_length": len(request.text),
        "raw_entity_count": len(raw_entities),
        "refined_entity_count": len(refined_entities),
        "ontology_used": request.ontology or "default",
        "extraction_timestamp": time.time()
    }
    
    return RefinedExtractionResponse(
        request_id=request_id,
        raw_entities=[Entity(**e) for e in raw_entities],
        refined_entities=[Entity(**e) for e in refined_entities],
        refinement_info="Entities refined by LLM.",
        ontology_used=request.ontology,
        graph_metadata=graph_metadata
    )

@app.post("/extract-graph", response_model=GraphResponse, summary="Extract Entities and Relationships with LLM")
async def extract_graph_endpoint(request: ExtractionRequest):
    """
    Extracts a knowledge graph (entities and relationships) from text using an LLM,
    constrained by a predefined ontology.

    - **text**: The input string to process.
    - **ontology**: Optional ontology name to scope the extraction.
    """
    request_id = generate_request_id()
    
    # Get database name from request or environment
    database_name = get_database_name(request.database)
    
    graph_data = extract_graph_with_llm(request.text, request.ontology, database_name)
    
    # Get ontology configuration for graph data
    ontology_config = get_ontology_by_name(request.ontology)
    
    # Process entities: add IDs and graph data
    entities = graph_data.get("entities", [])
    for entity in entities:
        # Patch: Ensure 'type' is present for Entity model
        if "type" not in entity:
            if "types" in entity and isinstance(entity["types"], list) and entity["types"]:
                entity["type"] = entity["types"][0]
            else:
                entity["type"] = "Unknown"
        if "id" not in entity:
            entity["id"] = generate_entity_id(entity.get("type", ""), entity.get("value", ""))
        entity["graph_data"] = create_entity_graph_data(entity, ontology_config)
    
    # Process relationships: add IDs and graph data
    relationships = graph_data.get("relationships", [])
    for rel in relationships:
        if "id" not in rel:
            rel["id"] = generate_relationship_id(
                rel.get("source", ""), 
                rel.get("target", ""), 
                rel.get("type", "")
            )
        rel["graph_data"] = create_relationship_graph_data(rel, ontology_config)
    
    # Generate a single embedding for the whole text
    embedding = None
    if embedding_model:
        embedding = embedding_model.encode(request.text).tolist()
    
    # Create graph metadata
    graph_metadata = {
        "request_id": request_id,
        "text_length": len(request.text),
        "entity_count": len(entities),
        "relationship_count": len(relationships),
        "ontology_used": request.ontology or "default",
        "database_used": database_name,
        "extraction_timestamp": time.time(),
        "has_embedding": embedding is not None
    }

    return GraphResponse(
        request_id=request_id,
        entities=[Entity(**e) for e in entities],
        relationships=[Relationship(**r) for r in relationships],
        refinement_info=graph_data.get("refinement_info", "Graph generated directly by LLM based on dynamic ontology."),
        embedding=embedding,
        ontology_used=request.ontology,
        database_used=database_name,
        graph_metadata=graph_metadata
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
    - **ontology**: Optional name for the ontology (defaults to 'default').
    """
    global VALID_ONTOLOGY_TYPES, VALID_RELATIONSHIP_TYPES, PROPERTY_ENTITY_TYPES
    global ENTITY_DESCRIPTIONS, RELATIONSHIP_DESCRIPTIONS

    # Determine ontology name
    ontology = request.ontology or DEFAULT_ONTOLOGY_NAME
    
    # Initialize ontology if it doesn't exist
    if ontology not in ONTOLOGIES:
        ONTOLOGIES[ontology] = {}

    # Handle compact ontology format
    if request.compact_ontology:
        compact = request.compact_ontology
        entity_types = compact.get('e', [])
        relationship_types = []
        property_types = []
        entity_descriptions = {}
        relationship_descriptions = {}
        
        # Convert compact relationships to relationship types
        relationships = compact.get('r', [])
        for rel in relationships:
            if len(rel) == 3:
                relationship_types.append(rel[1])  # rel[1] is the relationship type
        
        # Store in the specific ontology
        ONTOLOGIES[ontology] = {
            "entity_types": entity_types,
            "relationship_types": relationship_types,
            "property_types": property_types,
            "entity_descriptions": entity_descriptions,
            "relationship_descriptions": relationship_descriptions,
            "compact_ontology": compact
        }
        
        # Also update global state for backward compatibility
        VALID_ONTOLOGY_TYPES = entity_types
        VALID_RELATIONSHIP_TYPES = relationship_types
        PROPERTY_ENTITY_TYPES = property_types
        ENTITY_DESCRIPTIONS = entity_descriptions
        RELATIONSHIP_DESCRIPTIONS = relationship_descriptions
        
        print(
            f"✅ Compact ontology '{ontology}' updated: {len(entity_types)} entities, "
            f"{len(relationship_types)} relationships"
        )

        # --- DEBUG: Persist compact ontology to disk (optional) ---
        if os.getenv("ENABLE_PROMPT_DEBUG", "0") == "1":
            try:
                debug_dir = Path(os.getenv("PROMPT_DEBUG_DIR", "/tmp/llm-prompts"))
                debug_dir.mkdir(parents=True, exist_ok=True)
                ts = int(time.time() * 1000)
                ont_file = debug_dir / f"compact-ontology-{ontology}-{ts}.json"
                ont_file.write_text(json.dumps(compact, indent=2))
                print(f"📝 Compact ontology persisted to {ont_file}")
            except Exception as e:
                print(f"⚠️  Failed to write compact ontology for debugging: {e}")
    else:
        # Handle legacy full ontology format
        entity_types = request.entity_types
        relationship_types = request.relationship_types
        property_types = request.property_types
        entity_descriptions = request.entity_descriptions or {}
        relationship_descriptions = request.relationship_descriptions or {}
        
        # Store in the specific ontology
        ONTOLOGIES[ontology] = {
            "entity_types": entity_types,
            "relationship_types": relationship_types,
            "property_types": property_types,
            "entity_descriptions": entity_descriptions,
            "relationship_descriptions": relationship_descriptions
        }
        
        # Also update global state for backward compatibility
        VALID_ONTOLOGY_TYPES = entity_types
        VALID_RELATIONSHIP_TYPES = relationship_types
        PROPERTY_ENTITY_TYPES = property_types
        ENTITY_DESCRIPTIONS = entity_descriptions
        RELATIONSHIP_DESCRIPTIONS = relationship_descriptions
        
        print(
            f"✅ Full ontology '{ontology}' updated: {len(entity_types)} entities, "
            f"{len(property_types)} property types, "
            f"{len(relationship_types)} relationships, "
            f"{len(entity_descriptions)} descriptions"
        )

@app.post("/batch-extract-graph", response_model=List[GraphResponse], summary="Batch Extract Graphs from Multiple Texts")
async def batch_extract_graph_endpoint(request: BatchExtractionRequest):
    """
    Processes a batch of texts concurrently to extract knowledge graphs.
    This is much more efficient than calling /extract-graph in a loop.
    - **texts**: List of texts to process.
    - **ontology**: Optional ontology name to scope the extraction.
    """
    # Get database name from request or environment
    database_name = get_database_name(request.database)
    
    print(f"--- Received batch request for {len(request.texts)} documents using ontology: {request.ontology or 'default'} and database: {database_name} ---")
    batch_start_time = time.time()

    # Process each text individually to add IDs and graph data
    results = []
    for i, text in enumerate(request.texts):
        try:
            # Extract graph data
            graph_data = extract_graph_with_llm(text, request.ontology, database_name)
            
            # Get ontology configuration for graph data
            ontology_config = get_ontology_by_name(request.ontology)
            
            # Generate request ID
            request_id = generate_request_id()
            
            # Process entities: add IDs and graph data
            entities = graph_data.get("entities", [])
            for entity in entities:
                if "id" not in entity:
                    entity["id"] = generate_entity_id(entity.get("type", ""), entity.get("value", ""))
                entity["graph_data"] = create_entity_graph_data(entity, ontology_config)
            
            # Process relationships: add IDs and graph data
            relationships = graph_data.get("relationships", [])
            for rel in relationships:
                if "id" not in rel:
                    rel["id"] = generate_relationship_id(
                        rel.get("source", ""), 
                        rel.get("target", ""), 
                        rel.get("type", "")
                    )
                rel["graph_data"] = create_relationship_graph_data(rel, ontology_config)
            
            # Generate embedding
            embedding = None
            if embedding_model:
                embedding = embedding_model.encode(text).tolist()
            
            # Create graph metadata
            graph_metadata = {
                "request_id": request_id,
                "text_length": len(text),
                "entity_count": len(entities),
                "relationship_count": len(relationships),
                "ontology_used": request.ontology or "default",
                "database_used": database_name,
                "extraction_timestamp": time.time(),
                "has_embedding": embedding is not None,
                "batch_index": i
            }
            
            # Create GraphResponse
            result = GraphResponse(
                request_id=request_id,
                entities=[Entity(**e) for e in entities],
                relationships=[Relationship(**r) for r in relationships],
                refinement_info=graph_data.get("refinement_info", "Graph generated directly by LLM based on dynamic ontology."),
                embedding=embedding,
                ontology_used=request.ontology,
                database_used=database_name,
                graph_metadata=graph_metadata
            )
            
            results.append(result)
            
        except Exception as e:
            print(f"Error processing text {i}: {e}")
            # Create an error response
            error_result = GraphResponse(
                request_id=generate_request_id(),
                entities=[],
                relationships=[],
                refinement_info=f"Error processing text: {str(e)}",
                embedding=None,
                ontology_used=request.ontology,
                database_used=database_name,
                graph_metadata={
                    "error": str(e),
                    "text_index": i,
                    "extraction_timestamp": time.time()
                }
            )
            results.append(error_result)
    
    batch_end_time = time.time()
    print(f"--- Completed batch processing in {batch_end_time - batch_start_time:.2f} seconds ---")
    
    return results

@app.get("/health")
def health_check():
    """Simple health check to confirm the service is running."""
    return {"status": "ok"}

@app.get("/ontologies", summary="Get available ontologies")
async def get_ontologies():
    """
    Get list of available ontologies and their configurations.
    """
    available_ontologies = get_available_ontologies()
    
    ontology_details = {}
    for name in available_ontologies:
        config = ONTOLOGIES[name]
        ontology_details[name] = {
            "entity_types": config.get("entity_types", []),
            "relationship_types": config.get("relationship_types", []),
            "property_types": config.get("property_types", []),
            "entity_count": len(config.get("entity_types", [])),
            "relationship_count": len(config.get("relationship_types", []))
        }
    
    return {
        "available_ontologies": available_ontologies,
        "default_ontology": DEFAULT_ONTOLOGY_NAME,
        "ontology_details": ontology_details
    }

# Global storage for tracking extracted objects (in production, this would be a database)
EXTRACTED_OBJECTS = {}  # Store objects by their IDs

@app.get("/object/{object_id}", summary="Get object data by ID")
async def get_object_by_id(object_id: str):
    """
    Retrieve object data (entity or relationship) by its unique identifier.
    - **object_id**: The unique identifier of the object to retrieve.
    """
    if object_id in EXTRACTED_OBJECTS:
        return {
            "object_id": object_id,
            "object_data": EXTRACTED_OBJECTS[object_id],
            "retrieved_at": time.time()
        }
    else:
        raise HTTPException(status_code=404, detail=f"Object with ID '{object_id}' not found")

@app.get("/objects", summary="List all extracted objects")
async def list_all_objects():
    """
    List all extracted objects with their IDs and basic information.
    """
    objects_list = []
    for obj_id, obj_data in EXTRACTED_OBJECTS.items():
        obj_info = {
            "id": obj_id,
            "type": obj_data.get("type", "unknown"),
            "value": obj_data.get("value", ""),
            "extracted_at": obj_data.get("extraction_timestamp", 0)
        }
        objects_list.append(obj_info)
    
    return {
        "total_objects": len(objects_list),
        "objects": objects_list
    }

@app.get("/search-objects", summary="Search objects by type or value")
async def search_objects(object_type: Optional[str] = None, value: Optional[str] = None, limit: int = 50):
    """
    Search for objects by type or value.
    - **object_type**: Filter by object type (entity or relationship)
    - **value**: Filter by value (partial match)
    - **limit**: Maximum number of results to return
    """
    results = []
    
    for obj_id, obj_data in EXTRACTED_OBJECTS.items():
        # Apply filters
        if object_type and obj_data.get("type") != object_type:
            continue
            
        if value:
            obj_value = obj_data.get("value", "").lower()
            search_value = value.lower()
            if search_value not in obj_value:
                continue
        
        obj_info = {
            "id": obj_id,
            "type": obj_data.get("type", "unknown"),
            "value": obj_data.get("value", ""),
            "entity_type": obj_data.get("entity_type", ""),
            "relationship_type": obj_data.get("relationship_type", ""),
            "extracted_at": obj_data.get("extraction_timestamp", 0),
            "graph_data": obj_data.get("graph_data", {})
        }
        results.append(obj_info)
        
        if len(results) >= limit:
            break
    
    return {
        "total_found": len(results),
        "limit": limit,
        "filters": {
            "object_type": object_type,
            "value": value
        },
        "objects": results
    }

if __name__ == "__main__":
    print("🚀 Starting NLP service on http://127.0.0.1:8000")
    uvicorn.run(app, host="127.0.0.1", port=8000) 