from fastapi import FastAPI
from pydantic import BaseModel
import spacy
import re
from typing import List, Dict, Any

# --- Pydantic Models for API data validation ---
class ExtractionRequest(BaseModel):
    text: str
    
class Entity(BaseModel):
    type: str
    value: str
    confidence: float
    start: int
    end: int
    spacy_label: str
    context: str

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

# --- FastAPI Application ---
app = FastAPI(
    title="NLP Entity Extraction Service",
    description="A microservice to extract financial and common entities from text using spaCy.",
    version="1.0.0"
)

# Load the model once at startup and reuse it across requests
extractor = SpacyEntityExtractor()

@app.on_event("startup")
async def startup_event():
    print("✅ NLP Service loaded and ready.")

@app.post("/extract-entities", response_model=List[Entity])
async def extract_entities_endpoint(request: ExtractionRequest):
    """
    Extracts named entities from the provided text.
    - **text**: The input string to process.
    """
    entities = extractor.extract_entities(request.text)
    return entities

@app.get("/health")
def health_check():
    return {"status": "ok"} 