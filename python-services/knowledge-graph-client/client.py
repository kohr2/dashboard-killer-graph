"""
Knowledge Graph Client for Python

A Python client library for interacting with the Knowledge Graph MCP HTTP server.
"""

import requests
import time
import json
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass


@dataclass
class HealthResponse:
    """Health check response"""
    status: str
    server: str
    version: str
    database: str
    active_ontologies: List[str]


@dataclass
class Tool:
    """Tool information"""
    name: str
    description: str
    input_schema: Dict[str, Any]


@dataclass
class QueryResponse:
    """Query response"""
    content: str
    query: str
    timestamp: str


@dataclass
class CallResponse:
    """Tool call response"""
    tool: str
    result: Any
    timestamp: str


@dataclass
class NLPResponse:
    """NLP processing response"""
    operation: str
    result: Any
    ontology_used: str
    timestamp: str


class KnowledgeGraphClientError(Exception):
    """Custom exception for Knowledge Graph Client errors"""
    
    def __init__(self, message: str, status_code: Optional[int] = None, response: Optional[Dict] = None):
        super().__init__(message)
        self.status_code = status_code
        self.response = response


class KnowledgeGraphClient:
    """
    Client for interacting with the Knowledge Graph MCP HTTP server.
    
    This client provides methods for:
    - Health checking
    - Tool discovery
    - Knowledge graph queries
    - NLP processing operations
    """
    
    def __init__(
        self,
        base_url: str = "http://localhost:3002",
        timeout: int = 300,
        retries: int = 3,
        api_key: Optional[str] = None
    ):
        """
        Initialize the Knowledge Graph client.
        
        Args:
            base_url: Base URL of the Knowledge Graph server
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
            'User-Agent': 'KnowledgeGraph-Client/1.0'
        })
    
    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Make an HTTP request to the Knowledge Graph server.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint
            data: Request data
            **kwargs: Additional request parameters
            
        Returns:
            Response data as dictionary
            
        Raises:
            KnowledgeGraphClientError: If the request fails
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
                    error_detail = error_data.get('error', error_detail)
                except:
                    error_detail = response.text
                
                raise KnowledgeGraphClientError(
                    f"HTTP {response.status_code}: {error_detail}",
                    response.status_code,
                    response.json() if response.content else None
                )
                
            except requests.exceptions.RequestException as e:
                if attempt == self.retries:
                    raise KnowledgeGraphClientError(f"Request failed after {self.retries} retries: {str(e)}")
                
                # Exponential backoff
                time.sleep(2 ** attempt)
    
    def health_check(self) -> HealthResponse:
        """
        Check if the Knowledge Graph server is healthy.
        
        Returns:
            Health status information
        """
        data = self._make_request('GET', '/health')
        return HealthResponse(**data)
    
    def get_tools(self) -> List[Tool]:
        """
        Get available tools and their schemas.
        
        Returns:
            List of available tools
        """
        data = self._make_request('GET', '/tools')
        return [Tool(**tool) for tool in data.get('tools', [])]
    
    def get_server_info(self) -> Dict[str, Any]:
        """
        Get server information.
        
        Returns:
            Server information
        """
        return self._make_request('GET', '/')
    
    def query_knowledge_graph(self, query: str) -> QueryResponse:
        """
        Query the knowledge graph using natural language.
        
        Args:
            query: Natural language query
            
        Returns:
            Query response
        """
        payload = {
            "tool": "query_knowledge_graph",
            "arguments": {"query": query}
        }
        response = self._make_request('POST', '/call', payload)
        return QueryResponse(
            content=response['result']['content'],
            query=response['result']['query'],
            timestamp=response['timestamp']
        )
    
    def query(self, query: str) -> QueryResponse:
        """
        Simple query endpoint (alternative to query_knowledge_graph).
        
        Args:
            query: Natural language query
            
        Returns:
            Query response
        """
        data = self._make_request('GET', f'/query?q={requests.utils.quote(query)}')
        return QueryResponse(**data)
    
    def extract_entities(
        self, 
        text: str, 
        ontology_name: str = 'default'
    ) -> List[Dict[str, Any]]:
        """
        Extract entities from text.
        
        Args:
            text: Input text to process
            ontology_name: Ontology to use for extraction
            
        Returns:
            List of extracted entities
        """
        payload = {
            "tool": "nlp_processing",
            "arguments": {
                "operation": "extract_entities",
                "text": text,
                "ontology_name": ontology_name
            }
        }
        response = self._make_request('POST', '/call', payload)
        return response['result']
    
    def refine_entities(
        self, 
        text: str, 
        ontology_name: str = 'default'
    ) -> Dict[str, Any]:
        """
        Extract and refine entities using LLM.
        
        Args:
            text: Input text to process
            ontology_name: Ontology to use for extraction
            
        Returns:
            Refined entities result
        """
        payload = {
            "tool": "nlp_processing",
            "arguments": {
                "operation": "refine_entities",
                "text": text,
                "ontology_name": ontology_name
            }
        }
        response = self._make_request('POST', '/call', payload)
        return response['result']
    
    def extract_graph(
        self, 
        text: str, 
        ontology_name: str = 'default'
    ) -> Dict[str, Any]:
        """
        Extract knowledge graph from text.
        
        Args:
            text: Input text to process
            ontology_name: Ontology to use for extraction
            
        Returns:
            Extracted knowledge graph
        """
        payload = {
            "tool": "nlp_processing",
            "arguments": {
                "operation": "extract_graph",
                "text": text,
                "ontology_name": ontology_name
            }
        }
        response = self._make_request('POST', '/call', payload)
        return response['result']
    
    def batch_extract_graph(
        self, 
        texts: List[str], 
        ontology_name: str = 'default'
    ) -> List[Dict[str, Any]]:
        """
        Batch extract knowledge graphs from multiple texts.
        
        Args:
            texts: List of input texts to process
            ontology_name: Ontology to use for extraction
            
        Returns:
            List of extracted knowledge graphs
        """
        payload = {
            "tool": "nlp_processing",
            "arguments": {
                "operation": "batch_extract_graph",
                "texts": texts,
                "ontology_name": ontology_name
            }
        }
        response = self._make_request('POST', '/call', payload)
        return response['result']
    
    def generate_embeddings(self, texts: List[str]) -> List[Dict[str, Any]]:
        """
        Generate embeddings for texts.
        
        Args:
            texts: List of texts to generate embeddings for
            
        Returns:
            List of embeddings
        """
        payload = {
            "tool": "nlp_processing",
            "arguments": {
                "operation": "generate_embeddings",
                "texts": texts
            }
        }
        response = self._make_request('POST', '/call', payload)
        return response['result']
    
    def call_tool(self, tool: str, args: Dict[str, Any]) -> CallResponse:
        """
        Call any tool with custom arguments.
        
        Args:
            tool: Tool name to call
            args: Tool arguments
            
        Returns:
            Tool call response
        """
        payload = {"tool": tool, "arguments": args}
        response = self._make_request('POST', '/call', payload)
        return CallResponse(**response)
    
    def process_nlp(
        self,
        operation: str,
        text: Optional[str] = None,
        texts: Optional[List[str]] = None,
        ontology_name: Optional[str] = None
    ) -> NLPResponse:
        """
        Process text with NLP operations (alternative endpoint).
        
        Args:
            operation: NLP operation to perform
            text: Single text to process
            texts: Multiple texts to process
            ontology_name: Ontology to use
            
        Returns:
            NLP processing response
        """
        payload = {"operation": operation}
        if text is not None:
            payload["text"] = text
        if texts is not None:
            payload["texts"] = texts
        if ontology_name is not None:
            payload["ontology_name"] = ontology_name
            
        response = self._make_request('POST', '/nlp', payload)
        return NLPResponse(**response)


# Convenience functions for common operations
def create_client(
    base_url: str = "http://localhost:3002",
    timeout: int = 300,
    retries: int = 3,
    api_key: Optional[str] = None
) -> KnowledgeGraphClient:
    """
    Create a Knowledge Graph client instance.
    
    Args:
        base_url: Base URL of the Knowledge Graph server
        timeout: Request timeout in seconds
        retries: Number of retries for failed requests
        api_key: Optional API key for authentication
        
    Returns:
        Knowledge Graph client instance
    """
    return KnowledgeGraphClient(
        base_url=base_url,
        timeout=timeout,
        retries=retries,
        api_key=api_key
    )


def health_check(base_url: str = "http://localhost:3002") -> HealthResponse:
    """
    Quick health check of the Knowledge Graph server.
    
    Args:
        base_url: Base URL of the Knowledge Graph server
        
    Returns:
        Health status information
    """
    client = create_client(base_url)
    return client.health_check()


def query_graph(query: str, base_url: str = "http://localhost:3002") -> QueryResponse:
    """
    Quick query of the knowledge graph.
    
    Args:
        query: Natural language query
        base_url: Base URL of the Knowledge Graph server
        
    Returns:
        Query response
    """
    client = create_client(base_url)
    return client.query_knowledge_graph(query)


def extract_entities_from_text(
    text: str, 
    ontology_name: str = 'default',
    base_url: str = "http://localhost:3002"
) -> List[Dict[str, Any]]:
    """
    Quick entity extraction from text.
    
    Args:
        text: Input text to process
        ontology_name: Ontology to use for extraction
        base_url: Base URL of the Knowledge Graph server
        
    Returns:
        List of extracted entities
    """
    client = create_client(base_url)
    return client.extract_entities(text, ontology_name) 