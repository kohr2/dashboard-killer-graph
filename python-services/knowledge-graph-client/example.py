#!/usr/bin/env python3
"""
Example usage of the Knowledge Graph Client

This script demonstrates how external agents can integrate with the Knowledge Graph MCP server.
"""

import sys
import os
import asyncio
from typing import List, Dict, Any

# Add the client directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from client import (
    KnowledgeGraphClient, 
    create_client, 
    health_check, 
    query_graph, 
    extract_entities_from_text,
    KnowledgeGraphClientError
)


def basic_usage_example():
    """Basic usage example"""
    print("=== Basic Usage Example ===")
    
    try:
        # Create client
        client = create_client("http://localhost:3002")
        
        # Health check
        health = client.health_check()
        print(f"✅ Server is healthy: {health.status}")
        print(f"📊 Database: {health.database}")
        print(f"🎯 Active ontologies: {', '.join(health.active_ontologies)}")
        
        # Get available tools
        tools = client.get_tools()
        print(f"\n🔧 Available tools ({len(tools)}):")
        for tool in tools:
            print(f"  - {tool.name}: {tool.description[:100]}...")
        
        # Query knowledge graph
        print("\n🔍 Querying knowledge graph...")
        result = client.query_knowledge_graph("show all companies")
        print(f"Query: {result.query}")
        print(f"Result: {result.content[:200]}...")
        
    except KnowledgeGraphClientError as e:
        print(f"❌ Error: {e}")
        if e.status_code:
            print(f"   Status code: {e.status_code}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")


def nlp_processing_example():
    """NLP processing example"""
    print("\n=== NLP Processing Example ===")
    
    try:
        client = create_client("http://localhost:3002")
        
        # Example text
        text = "Apple Inc. CEO Tim Cook announced a $2 billion investment in renewable energy."
        
        # Extract entities
        print("🔍 Extracting entities...")
        entities = client.extract_entities(text, "financial")
        print(f"Found {len(entities)} entities:")
        for entity in entities:
            print(f"  - {entity.get('value', 'N/A')} ({entity.get('type', 'N/A')})")
        
        # Extract knowledge graph
        print("\n🧠 Extracting knowledge graph...")
        graph = client.extract_graph(text, "financial")
        print(f"Graph contains {len(graph.get('entities', []))} entities and {len(graph.get('relationships', []))} relationships")
        
        # Show entities
        for entity in graph.get('entities', [])[:3]:  # Show first 3
            print(f"  Entity: {entity.get('value', 'N/A')} ({entity.get('type', 'N/A')})")
        
        # Show relationships
        for rel in graph.get('relationships', [])[:3]:  # Show first 3
            print(f"  Relationship: {rel.get('source', 'N/A')} --[{rel.get('type', 'N/A')}]--> {rel.get('target', 'N/A')}")
        
    except KnowledgeGraphClientError as e:
        print(f"❌ Error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")


def batch_processing_example():
    """Batch processing example"""
    print("\n=== Batch Processing Example ===")
    
    try:
        client = create_client("http://localhost:3002")
        
        # Multiple texts
        texts = [
            "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
            "Microsoft Corp. reported quarterly earnings of $50 billion.",
            "Google's Sundar Pichai discussed AI strategy."
        ]
        
        print(f"📝 Processing {len(texts)} texts...")
        
        # Batch extract graphs
        graphs = client.batch_extract_graph(texts, "financial")
        print(f"Generated {len(graphs)} knowledge graphs")
        
        for i, graph in enumerate(graphs):
            print(f"\nText {i+1}:")
            print(f"  Entities: {len(graph.get('entities', []))}")
            print(f"  Relationships: {len(graph.get('relationships', []))}")
            
            # Show first entity
            if graph.get('entities'):
                first_entity = graph['entities'][0]
                print(f"  First entity: {first_entity.get('value', 'N/A')}")
        
    except KnowledgeGraphClientError as e:
        print(f"❌ Error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")


def error_handling_example():
    """Error handling example"""
    print("\n=== Error Handling Example ===")
    
    try:
        # Try to connect to non-existent server
        client = create_client("http://localhost:9999")
        client.health_check()
    except KnowledgeGraphClientError as e:
        print(f"✅ Properly caught client error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error type: {type(e).__name__}: {e}")
    
    try:
        # Try invalid query
        client = create_client("http://localhost:3002")
        client.query_knowledge_graph("")  # Empty query
    except KnowledgeGraphClientError as e:
        print(f"✅ Properly caught validation error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error type: {type(e).__name__}: {e}")


def convenience_functions_example():
    """Convenience functions example"""
    print("\n=== Convenience Functions Example ===")
    
    try:
        # Quick health check
        health = health_check("http://localhost:3002")
        print(f"✅ Quick health check: {health.status}")
        
        # Quick query
        result = query_graph("show all companies", "http://localhost:3002")
        print(f"✅ Quick query result: {result.content[:100]}...")
        
        # Quick entity extraction
        entities = extract_entities_from_text(
            "Apple Inc. CEO Tim Cook announced a $2 billion investment.",
            "financial",
            "http://localhost:3002"
        )
        print(f"✅ Quick entity extraction: {len(entities)} entities found")
        
    except KnowledgeGraphClientError as e:
        print(f"❌ Error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")


def advanced_usage_example():
    """Advanced usage example"""
    print("\n=== Advanced Usage Example ===")
    
    try:
        client = create_client("http://localhost:3002")
        
        # Get server info
        info = client.get_server_info()
        print(f"📊 Server: {info.get('server', 'N/A')} v{info.get('version', 'N/A')}")
        print(f"🔗 Endpoints: {list(info.get('endpoints', {}).keys())}")
        
        # Use alternative query endpoint
        result = client.query("find cities in United States")
        print(f"✅ Alternative query result: {result.content[:100]}...")
        
        # Use alternative NLP endpoint
        nlp_result = client.process_nlp(
            operation="extract_entities",
            text="Apple Inc. CEO Tim Cook announced a $2 billion investment.",
            ontology_name="financial"
        )
        print(f"✅ Alternative NLP result: {nlp_result.ontology_used} ontology used")
        
        # Call tool directly
        tool_result = client.call_tool("query_knowledge_graph", {"query": "count companies"})
        print(f"✅ Direct tool call result: {tool_result.result['content'][:100]}...")
        
    except KnowledgeGraphClientError as e:
        print(f"❌ Error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")


def main():
    """Main function"""
    print("🚀 Knowledge Graph Client Examples")
    print("=" * 50)
    
    # Check if server is running
    try:
        health = health_check("http://localhost:3002")
        print(f"✅ Server is running: {health.status}")
    except Exception as e:
        print(f"❌ Server is not running: {e}")
        print("💡 Start the server with:")
        print("   NEO4J_DATABASE=dashboard-killer MCP_ACTIVE_ONTOLOGIES=core,fibo,procurement,geonames node src/mcp/servers/mcp-server-http.js")
        return
    
    # Run examples
    basic_usage_example()
    nlp_processing_example()
    batch_processing_example()
    error_handling_example()
    convenience_functions_example()
    advanced_usage_example()
    
    print("\n🎉 All examples completed!")


if __name__ == "__main__":
    main() 