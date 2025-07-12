"""
NLP Service Client SDK

A Python client for interacting with the NLP Service API.
Provides easy-to-use methods for entity extraction, graph extraction, and embedding generation.
"""

import requests
import json
from typing import List, Dict, Any, Optional, Union
from dataclasses import dataclass
import time


@dataclass
class Entity:
    """Represents an extracted entity."""
    type: str
    value: str
    confidence: Optional[float] = None
    properties: Optional[Dict[str, Any]] = None
    start: Optional[int] = None
    end: Optional[int] = None
    spacy_label: Optional[str] = None
    context: Optional[str] = None


@dataclass
class Relationship:
    """Represents a relationship between entities."""
    source: str
    target: str
    type: str
    confidence: Optional[float] = None
    explanation: Optional[str] = None


@dataclass
class GraphResponse:
    """Represents a complete knowledge graph extraction result."""
    entities: List[Entity]
    relationships: List[Relationship]
    refinement_info: str
    embedding: Optional[List[float]] = None
    ontology_used: Optional[str] = None
    database_used: Optional[str] = None


@dataclass
class RefinedExtractionResponse:
    """Represents the result of entity extraction with LLM refinement."""
    raw_entities: List[Entity]
    refined_entities: List[Entity]
    refinement_info: str
    ontology_used: Optional[str] = None
    database_used: Optional[str] = None


class NLPServiceError(Exception):
    """Custom exception for NLP service errors."""
    pass


class NLPServiceClient:
    """
    Client for interacting with the NLP Service API.
    
    This client provides methods for:
    - Entity extraction (raw and refined)
    - Knowledge graph extraction
    - Batch processing
    - Embedding generation
    - Ontology management
    """
    
    def __init__(
        self,
        base_url: str = "http://localhost:8000",
        timeout: int = 300,
        retries: int = 3,
        api_key: Optional[str] = None
    ):
        """
        Initialize the NLP Service client.
        
        Args:
            base_url: Base URL of the NLP service
            timeout: Request timeout in seconds
            retries: Number of retries for failed requests
            api_key: Optional API key for authentication
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.retries = retries
        self.session = requests.Session()
        
        if api_key:
            self.session.headers.update({'Authorization': f'Bearer {api_key}'})
        
        # Set default headers
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'NLP-Service-Client/1.0'
        })
    
    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Make an HTTP request to the NLP service.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint
            data: Request data
            **kwargs: Additional request parameters
            
        Returns:
            Response data as dictionary
            
        Raises:
            NLPServiceError: If the request fails
        """
        url = f"{self.base_url}{endpoint}"
        
        for attempt in range(self.retries + 1):
            try:
                response = self.session.request(
                    method=method,
                    url=url,
                    json=data,
                    timeout=self.timeout,
                    **kwargs
                )
                
                # Handle successful responses
                if response.status_code == 204:  # No content
                    return {}
                
                if response.status_code < 400:
                    return response.json() if response.content else {}
                
                # Handle error responses
                error_detail = "Unknown error"
                try:
                    error_data = response.json()
                    error_detail = error_data.get('detail', error_detail)
                except:
                    error_detail = response.text
                
                raise NLPServiceError(
                    f"HTTP {response.status_code}: {error_detail}"
                )
                
            except requests.exceptions.RequestException as e:
                if attempt == self.retries:
                    raise NLPServiceError(f"Request failed after {self.retries} retries: {str(e)}")
                
                # Exponential backoff
                time.sleep(2 ** attempt)
    
    def health_check(self) -> Dict[str, Any]:
        """
        Check if the NLP service is healthy.
        
        Returns:
            Health status information
        """
        return self._make_request('GET', '/health')
    
    def extract_entities(self, text: str, ontology_name: Optional[str] = None, database: Optional[str] = None) -> List[Entity]:
        """
        Extract entities from text using spaCy (raw extraction).
        
        Args:
            text: Input text to process
            ontology_name: Optional ontology name to scope the extraction
            database: Optional database name to use for the extraction
            
        Returns:
            List of extracted entities
        """
        payload = {'text': text}
        if ontology_name:
            payload['ontology_name'] = ontology_name
        if database:
            payload['database'] = database
            
        response = self._make_request('POST', '/extract-entities', payload)
        
        entities = []
        for entity_data in response:
            entity = Entity(**entity_data)
            entities.append(entity)
        
        return entities
    
    def refine_entities(self, text: str, ontology_name: Optional[str] = None, database: Optional[str] = None) -> RefinedExtractionResponse:
        """
        Extract entities with spaCy and refine them using LLM.
        
        Args:
            text: Input text to process
            ontology_name: Optional ontology name to scope the extraction
            database: Optional database name to use for the extraction
            
        Returns:
            Refined extraction response with raw and refined entities
        """
        payload = {'text': text}
        if ontology_name:
            payload['ontology_name'] = ontology_name
        if database:
            payload['database'] = database
            
        response = self._make_request('POST', '/refine-entities', payload)
        
        raw_entities = [Entity(**e) for e in response.get('raw_entities', [])]
        refined_entities = [Entity(**e) for e in response.get('refined_entities', [])]
        
        return RefinedExtractionResponse(
            raw_entities=raw_entities,
            refined_entities=refined_entities,
            refinement_info=response.get('refinement_info', ''),
            ontology_used=response.get('ontology_used'),
            database_used=response.get('database_used')
        )
    
    def extract_graph(self, text: str, ontology_name: Optional[str] = None, database: Optional[str] = None) -> GraphResponse:
        """
        Extract a knowledge graph from text using LLM.
        
        Args:
            text: Input text to process
            ontology_name: Optional ontology name to scope the extraction
            database: Optional database name to use for the extraction
            
        Returns:
            Complete graph extraction result
        """
        payload = {'text': text}
        if ontology_name:
            payload['ontology_name'] = ontology_name
        if database:
            payload['database'] = database
            
        response = self._make_request('POST', '/extract-graph', payload)
        
        entities = [Entity(**e) for e in response.get('entities', [])]
        relationships = [Relationship(**r) for r in response.get('relationships', [])]
        
        return GraphResponse(
            entities=entities,
            relationships=relationships,
            refinement_info=response.get('refinement_info', ''),
            embedding=response.get('embedding'),
            ontology_used=response.get('ontology_used'),
            database_used=response.get('database_used')
        )
    
    def batch_extract_graph(self, texts: List[str], ontology_name: Optional[str] = None, database: Optional[str] = None) -> List[GraphResponse]:
        """
        Extract knowledge graphs from multiple texts in batch.
        
        Args:
            texts: List of input texts to process
            ontology_name: Optional ontology name to scope the extraction
            database: Optional database name to use for the extraction
            
        Returns:
            List of graph extraction results
        """
        payload = {'texts': texts}
        if ontology_name:
            payload['ontology_name'] = ontology_name
        if database:
            payload['database'] = database
            
        response = self._make_request('POST', '/batch-extract-graph', payload)
        
        graphs = []
        for graph_data in response:
            entities = [Entity(**e) for e in graph_data.get('entities', [])]
            relationships = [Relationship(**r) for r in graph_data.get('relationships', [])]
            
            graph = GraphResponse(
                entities=entities,
                relationships=relationships,
                refinement_info=graph_data.get('refinement_info', ''),
                embedding=graph_data.get('embedding'),
                ontology_used=graph_data.get('ontology_used'),
                database_used=graph_data.get('database_used')
            )
            graphs.append(graph)
        
        return graphs
    
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of texts.
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embedding vectors
        """
        response = self._make_request('POST', '/embed', {'texts': texts})
        return response.get('embeddings', [])
    
    def get_available_ontologies(self) -> Dict[str, Any]:
        """
        Get list of available ontologies and their configurations.
        
        Returns:
            Dictionary with available ontologies and their details
        """
        return self._make_request('GET', '/ontologies')
    
    def update_ontology(
        self,
        entity_types: Optional[List[str]] = None,
        relationship_types: Optional[List[str]] = None,
        property_types: Optional[List[str]] = None,
        entity_descriptions: Optional[Dict[str, str]] = None,
        relationship_descriptions: Optional[Dict[str, str]] = None,
        compact_ontology: Optional[Dict[str, Any]] = None,
        ontology_name: Optional[str] = None
    ) -> None:
        """
        Update the ontology schema used by the NLP service.
        
        Args:
            entity_types: List of valid entity types
            relationship_types: List of valid relationship types
            property_types: List of valid property types
            entity_descriptions: Descriptions for entity types
            relationship_descriptions: Descriptions for relationship types
            compact_ontology: Compact ontology format
            ontology_name: Name for the ontology (defaults to 'default')
        """
        payload = {}
        
        if entity_types is not None:
            payload['entity_types'] = entity_types
        if relationship_types is not None:
            payload['relationship_types'] = relationship_types
        if property_types is not None:
            payload['property_types'] = property_types
        if entity_descriptions is not None:
            payload['entity_descriptions'] = entity_descriptions
        if relationship_descriptions is not None:
            payload['relationship_descriptions'] = relationship_descriptions
        if compact_ontology is not None:
            payload['compact_ontology'] = compact_ontology
        if ontology_name is not None:
            payload['ontology_name'] = ontology_name
        
        self._make_request('POST', '/ontologies', payload)
    
    def close(self):
        """Close the client session."""
        self.session.close()
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()


# Convenience functions for quick usage
def extract_entities(text: str, base_url: str = "http://localhost:8000", ontology_name: Optional[str] = None) -> List[Entity]:
    """Quick function to extract entities from text."""
    with NLPServiceClient(base_url) as client:
        return client.extract_entities(text, ontology_name)


def extract_graph(text: str, base_url: str = "http://localhost:8000", ontology_name: Optional[str] = None) -> GraphResponse:
    """Quick function to extract a knowledge graph from text."""
    with NLPServiceClient(base_url) as client:
        return client.extract_graph(text, ontology_name)


def batch_extract_graph(texts: List[str], base_url: str = "http://localhost:8000", ontology_name: Optional[str] = None) -> List[GraphResponse]:
    """Quick function to extract knowledge graphs from multiple texts."""
    with NLPServiceClient(base_url) as client:
        return client.batch_extract_graph(texts, ontology_name)


def generate_embeddings(texts: List[str], base_url: str = "http://localhost:8000") -> List[List[float]]:
    """Quick function to generate embeddings for texts."""
    with NLPServiceClient(base_url) as client:
        return client.generate_embeddings(texts)


def get_available_ontologies(base_url: str = "http://localhost:8000") -> Dict[str, Any]:
    """Quick function to get available ontologies."""
    with NLPServiceClient(base_url) as client:
        return client.get_available_ontologies()


# Example usage
if __name__ == "__main__":
    # Example 1: Using the client class
    client = NLPServiceClient("http://localhost:8000")
    
    try:
        # Health check
        health = client.health_check()
        print(f"Service health: {health}")
        
        # Get available ontologies
        ontologies = client.get_available_ontologies()
        print(f"Available ontologies: {ontologies.get('available_ontologies', [])}")
        
        # Extract entities with specific ontology
        text = "Apple Inc. CEO Tim Cook announced a $2 billion investment in renewable energy."
        entities = client.extract_entities(text, ontology_name="financial")
        print(f"Extracted {len(entities)} entities using financial ontology:")
        for entity in entities:
            print(f"  - {entity.value} ({entity.type})")
        
        # Extract knowledge graph with specific ontology
        graph = client.extract_graph(text, ontology_name="financial")
        print(f"Extracted {len(graph.entities)} entities and {len(graph.relationships)} relationships using {graph.ontology_used} ontology")
        
        # Extract with different ontology
        graph2 = client.extract_graph(text, ontology_name="procurement")
        print(f"Extracted {len(graph2.entities)} entities and {len(graph2.relationships)} relationships using {graph2.ontology_used} ontology")
        
    finally:
        client.close()
    
    # Example 2: Using convenience functions with ontology scoping
    entities = extract_entities("Microsoft Corp. reported quarterly earnings of $50 billion.", ontology_name="financial")
    print(f"Quick extraction with financial ontology: {len(entities)} entities")
    
    # Example 3: Batch processing with ontology scoping
    texts = [
        "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
        "Microsoft Corp. reported quarterly earnings of $50 billion.",
        "Google's Sundar Pichai discussed AI strategy."
    ]
    
    graphs = batch_extract_graph(texts, ontology_name="financial")
    print(f"Batch processed {len(graphs)} documents with financial ontology")
    
    # Example 4: Embedding generation
    embeddings = generate_embeddings(["Apple Inc.", "Microsoft Corp.", "Google"])
    print(f"Generated {len(embeddings)} embeddings")
    
    # Example 5: Get available ontologies
    available = get_available_ontologies()
    print(f"Available ontologies: {available}") 