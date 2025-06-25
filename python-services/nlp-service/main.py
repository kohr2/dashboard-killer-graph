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
    
class Entity(BaseModel):
    type: str
    value: str
    confidence: Optional[float] = None
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
def extract_graph_with_llm(text: str, spacy_entities: List[Dict]) -> Dict[str, Any]:
    if not client:
        raise HTTPException(status_code=503, detail="OpenAI client not configured.")

    entities_json_str = json.dumps(spacy_entities, indent=2)

    prompt = f"""
    You are a financial analyst creating a knowledge graph from an email.
    Your task is to perform two steps:
    1.  **Clean Entities**: Review the provided list of entities and remove any that are clearly incorrect (e.g., greetings like "Hi Team", generic terms like "the deal"). Each entity in the output list MUST be a JSON object containing `type`, `value`, and a `confidence` score (e.g., 0.9).
    2.  **Extract Relationships**: Identify meaningful relationships between the cleaned entities. The relationship type should be a standard verb phrase in uppercase snake_case (e.g., WORKS_FOR, ACQUIRED, INVESTED_IN). Each relationship MUST be a JSON object with `source`, `target`, `type`, `explanation`, and a `confidence` score (e.g., 0.9).

    Return a valid JSON object with two keys:
    -   `"cleaned_entities"`: A list of JSON objects, where each object is an entity.
    -   `"relationships"`: A list of relationships. The source and target must be values from the cleaned entities list.

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
        
        response_str = response.choices[0].message.content
        if response_str:
            graph_data = json.loads(response_str)
            # Validate and fix the structure if needed
            if isinstance(graph_data, dict):
                entities = graph_data.get("cleaned_entities", [])
                relationships = graph_data.get("relationships", [])

                # Add default confidence if missing
                for entity in entities:
                    if isinstance(entity, dict) and "confidence" not in entity:
                        entity["confidence"] = 0.9
                for rel in relationships:
                    if isinstance(rel, dict) and "confidence" not in rel:
                        rel["confidence"] = 0.9
                
                return {"cleaned_entities": entities, "relationships": relationships}
        
        # Return a default empty structure if parsing fails
        return {"cleaned_entities": [], "relationships": []}

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
    
    return {
        "raw_entities": raw_entities,
        "refined_entities": refined_entities,
        "refinement_info": f"Refined {len(raw_entities)} raw entities down to {len(refined_entities)}."
    }

@app.post("/extract-graph", response_model=GraphResponse, summary="Extract Entities and Relationships with LLM")
async def extract_graph_endpoint(request: ExtractionRequest):
    """
    Extracts entities, refines them, and extracts relationships between them to build a graph.
    - **text**: The input string to process.
    """
    # Step 1: Raw extraction with spaCy
    raw_entities = extractor.extract_entities(request.text)

    # Step 2: Generate embedding for the full text
    embedding = None
    if embedding_model:
        embedding = embedding_model.encode(request.text).tolist()

    # Step 3: Use LLM to refine entities and extract relationships
    try:
        graph_data = extract_graph_with_llm(request.text, raw_entities)
        
        return {
            "entities": graph_data.get("cleaned_entities", []),
            "relationships": graph_data.get("relationships", []),
            "refinement_info": f"Refined {len(raw_entities)} entities and found {len(graph_data.get('relationships', []))} relationships.",
            "embedding": embedding
        }
    except HTTPException as e:
        # Re-raise HTTPException to let FastAPI handle the response
        raise e
    except Exception as e:
        # Catch any other unexpected errors during graph extraction
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during graph extraction: {str(e)}")

@app.get("/health")
def health_check():
    return {"status": "ok"} 