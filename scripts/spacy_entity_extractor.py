#!/usr/bin/env python3
"""
spaCy Entity Extractor for Email Ingestion Pipeline
Advanced entity extraction using spaCy NLP models
"""

import spacy
import sys
import json
import re
from typing import List, Dict, Any, Tuple

class SpacyEntityExtractor:
    def __init__(self, model_name: str = "en_core_web_lg"):
        """Initialize spaCy entity extractor with specified model."""
        try:
            self.nlp = spacy.load(model_name)
            print(f"✅ Loaded spaCy model: {model_name}", file=sys.stderr)
        except OSError:
            # Fallback to smaller model if large one isn't available
            self.nlp = spacy.load("en_core_web_sm")
            print(f"⚠️ Fallback to en_core_web_sm model", file=sys.stderr)
        
        # Add custom financial patterns
        self._add_financial_patterns()
    
    def _add_financial_patterns(self):
        """Add custom patterns for financial entities."""
        # Add custom ruler for financial patterns
        ruler = self.nlp.add_pipe("entity_ruler", before="ner")
        
        patterns = [
            # Stock exchange patterns
            {"label": "STOCK_SYMBOL", "pattern": [{"TEXT": {"REGEX": r"^\([A-Z]+:[A-Z]{1,5}\)$"}}]},
            
            # Currency patterns
            {"label": "CURRENCY", "pattern": [{"TEXT": {"REGEX": r"^\$[\d,]+(?:\.\d{2})?$"}}]},
            {"label": "CURRENCY", "pattern": [{"TEXT": {"REGEX": r"^[\d,]+(?:\.\d{2})?\s*(?:USD|EUR|GBP|JPY)$"}}]},
            
            # Financial institution patterns
            {"label": "FINANCIAL_ORG", "pattern": [{"LOWER": "goldman"}, {"LOWER": "sachs"}]},
            {"label": "FINANCIAL_ORG", "pattern": [{"LOWER": "morgan"}, {"LOWER": "stanley"}]},
            {"label": "FINANCIAL_ORG", "pattern": [{"LOWER": "jp"}, {"LOWER": "morgan"}]},
            {"label": "FINANCIAL_ORG", "pattern": [{"LOWER": "jpmorgan"}]},
            {"label": "FINANCIAL_ORG", "pattern": [{"LOWER": "deutsche"}, {"LOWER": "bank"}]},
            
            # Financial terms
            {"label": "FINANCIAL_INSTRUMENT", "pattern": [{"LOWER": "portfolio"}]},
            {"label": "FINANCIAL_INSTRUMENT", "pattern": [{"LOWER": "investment"}]},
            {"label": "FINANCIAL_INSTRUMENT", "pattern": [{"LOWER": "transaction"}]},
            {"label": "FINANCIAL_INSTRUMENT", "pattern": [{"LOWER": "wire"}, {"LOWER": "transfer"}]},
            
            # Professional titles
            {"label": "JOB_TITLE", "pattern": [{"LOWER": "cfa"}]},
            {"label": "JOB_TITLE", "pattern": [{"LOWER": "portfolio"}, {"LOWER": "manager"}]},
            {"label": "JOB_TITLE", "pattern": [{"LOWER": "senior"}, {"LOWER": "portfolio"}, {"LOWER": "manager"}]},
        ]
        
        ruler.add_patterns(patterns)
    
    def extract_entities(self, text: str) -> List[Dict[str, Any]]:
        """Extract entities from text using spaCy NLP."""
        doc = self.nlp(text)
        entities = []
        
        # Extract named entities
        for ent in doc.ents:
            confidence = self._calculate_confidence(ent)
            entity = {
                "type": self._map_entity_label(ent.label_),
                "value": ent.text.strip(),
                "confidence": confidence,
                "start": ent.start_char,
                "end": ent.end_char,
                "spacy_label": ent.label_,
                "context": self._get_context(doc, ent)
            }
            entities.append(entity)
        
        # Add regex-based patterns for highly structured data
        regex_entities = self._extract_regex_patterns(text)
        entities.extend(regex_entities)
        
        # Remove duplicates and filter low-quality entities
        entities = self._deduplicate_entities(entities)
        entities = self._filter_entities(entities)
        
        return entities
    
    def _map_entity_label(self, spacy_label: str) -> str:
        """Map spaCy entity labels to our custom types."""
        mapping = {
            "PERSON": "PERSON_NAME",
            "ORG": "COMPANY_NAME",
            "GPE": "LOCATION",
            "MONEY": "MONETARY_AMOUNT",
            "DATE": "DATE",
            "TIME": "TIME",
            "PERCENT": "PERCENTAGE",
            "CARDINAL": "NUMBER",
            "ORDINAL": "ORDINAL_NUMBER",
            "EMAIL": "EMAIL_ADDRESS",
            "STOCK_SYMBOL": "STOCK_SYMBOL",
            "CURRENCY": "MONETARY_AMOUNT",
            "FINANCIAL_ORG": "FINANCIAL_INSTITUTION",
            "FINANCIAL_INSTRUMENT": "FINANCIAL_INSTRUMENT",
            "JOB_TITLE": "JOB_TITLE"
        }
        return mapping.get(spacy_label, spacy_label)
    
    def _calculate_confidence(self, ent) -> float:
        """Calculate confidence score for an entity."""
        base_confidence = 0.8  # Base confidence for spaCy entities
        
        # Adjust based on entity type
        type_confidence = {
            "PERSON": 0.85,
            "ORG": 0.9,
            "MONEY": 0.95,
            "GPE": 0.9,
            "DATE": 0.95,
            "STOCK_SYMBOL": 0.95,
            "FINANCIAL_ORG": 0.9,
            "EMAIL": 0.98
        }
        
        # Adjust based on entity length and capitalization
        length_bonus = min(0.1, len(ent.text) * 0.01)
        cap_bonus = 0.05 if ent.text[0].isupper() else 0
        
        confidence = type_confidence.get(ent.label_, base_confidence) + length_bonus + cap_bonus
        return min(0.99, confidence)  # Cap at 99%
    
    def _get_context(self, doc, ent, window: int = 5) -> str:
        """Get surrounding context for an entity."""
        start = max(0, ent.start - window)
        end = min(len(doc), ent.end + window)
        context_tokens = doc[start:end]
        return " ".join([token.text for token in context_tokens])
    
    def _extract_regex_patterns(self, text: str) -> List[Dict[str, Any]]:
        """Extract highly structured patterns using regex."""
        entities = []
        
        # Stock symbols with exchange
        stock_pattern = r'\((?:NYSE|NASDAQ):\s*([A-Z]{1,5})\)'
        for match in re.finditer(stock_pattern, text):
            entities.append({
                "type": "STOCK_SYMBOL",
                "value": match.group(1),
                "confidence": 0.95,
                "start": match.start(),
                "end": match.end(),
                "spacy_label": "STOCK_SYMBOL",
                "context": self._get_regex_context(text, match, 20)
            })
        
        # Email addresses
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        for match in re.finditer(email_pattern, text):
            entities.append({
                "type": "EMAIL_ADDRESS",
                "value": match.group(0),
                "confidence": 0.98,
                "start": match.start(),
                "end": match.end(),
                "spacy_label": "EMAIL",
                "context": self._get_regex_context(text, match, 15)
            })
        
        # Phone numbers
        phone_pattern = r'\b(?:\+1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b'
        for match in re.finditer(phone_pattern, text):
            entities.append({
                "type": "PHONE_NUMBER",
                "value": match.group(0),
                "confidence": 0.9,
                "start": match.start(),
                "end": match.end(),
                "spacy_label": "PHONE",
                "context": self._get_regex_context(text, match, 15)
            })
        
        return entities
    
    def _get_regex_context(self, text: str, match, window: int) -> str:
        """Get context around regex match."""
        start = max(0, match.start() - window)
        end = min(len(text), match.end() + window)
        return text[start:end].strip()
    
    def _deduplicate_entities(self, entities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate entities based on text overlap."""
        sorted_entities = sorted(entities, key=lambda x: (x['start'], -x['confidence']))
        deduplicated = []
        
        for entity in sorted_entities:
            # Check for overlap with existing entities
            overlap = False
            for existing in deduplicated:
                if self._entities_overlap(entity, existing):
                    # Keep the one with higher confidence
                    if entity['confidence'] > existing['confidence']:
                        deduplicated.remove(existing)
                    else:
                        overlap = True
                        break
            
            if not overlap:
                deduplicated.append(entity)
        
        return deduplicated
    
    def _entities_overlap(self, ent1: Dict[str, Any], ent2: Dict[str, Any]) -> bool:
        """Check if two entities overlap in text position."""
        return not (ent1['end'] <= ent2['start'] or ent2['end'] <= ent1['start'])
    
    def _filter_entities(self, entities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Filter out low-quality entities."""
        filtered = []
        
        for entity in entities:
            # Skip very short entities unless they're specific types
            if len(entity['value']) < 2 and entity['type'] not in ['STOCK_SYMBOL']:
                continue
            
            # Skip common words that aren't actually entities
            if entity['value'].lower() in ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']:
                continue
            
            # Skip entities with very low confidence
            if entity['confidence'] < 0.5:
                continue
            
            filtered.append(entity)
        
        return filtered

def main():
    """Main function to process text and return entities as JSON."""
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: python spacy_entity_extractor.py '<text>'"}))
        sys.exit(1)
    
    text = sys.argv[1]
    
    try:
        extractor = SpacyEntityExtractor()
        entities = extractor.extract_entities(text)
        
        # Convert to the format expected by the TypeScript demo
        formatted_entities = []
        for entity in entities:
            formatted_entities.append({
                "type": entity["type"],
                "value": entity["value"],
                "confidence": round(entity["confidence"], 3),
                "spacy_label": entity.get("spacy_label", ""),
                "context": entity.get("context", "")[:100]  # Limit context length
            })
        
        result = {
            "success": True,
            "entities": formatted_entities,
            "total_count": len(formatted_entities)
        }
        
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e),
            "entities": [],
            "total_count": 0
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main() 