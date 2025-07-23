#!/bin/bash

# Unified Test Script for Dashboard Killer Graph
# This script handles testing of various components (MCP, Neo4j, etc.)

set -e

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

# Default configuration
DEFAULT_TEST="mcp"
DEFAULT_PORT=3002

# Parse command line arguments
TEST_TYPE=${1:-$DEFAULT_TEST}
PORT=${2:-$DEFAULT_PORT}

# Show help
if [ "$TEST_TYPE" = "--help" ] || [ "$TEST_TYPE" = "-h" ]; then
    print_header "Unified Test Script"
    echo ""
    echo "Usage: $0 [test_type] [port]"
    echo ""
    echo "Test Types:"
    echo "  mcp       - Test MCP protocol communication"
    echo "  neo4j     - Test Neo4j connection"
    echo "  transport - Test MCP transport options"
    echo "  all       - Run all tests"
    echo ""
    echo "Arguments:"
    echo "  test_type - Type of test to run (default: $DEFAULT_TEST)"
    echo "  port      - Port to use for testing (default: $DEFAULT_PORT)"
    echo ""
    echo "Examples:"
    echo "  $0 mcp                    # Test MCP protocol"
    echo "  $0 neo4j                  # Test Neo4j connection"
    echo "  $0 transport              # Test MCP transport options"
    echo "  $0 all                    # Run all tests"
    echo "  $0 --help                 # Show this help"
    echo ""
    exit 0
fi

# Validate test type
case $TEST_TYPE in
    "mcp"|"neo4j"|"transport"|"all")
        ;;
    *)
        print_error "Invalid test type: $TEST_TYPE"
        echo "Valid test types: mcp, neo4j, transport, all"
        exit 1
        ;;
esac

# Display header
print_header "Running $TEST_TYPE Tests"
echo "📋 Test Type: $TEST_TYPE"
echo "   Port: $PORT"
echo ""

# Function to test MCP protocol
test_mcp_protocol() {
    print_section "🧪 Testing MCP Protocol Communication"
    
    # Check if Node.js is available
    check_node
    
    print_status "Starting MCP server in test mode..."
    
    # Start the MCP server in background
    NEO4J_DATABASE=dashboard-killer \
    MCP_ACTIVE_ONTOLOGIES=core,fibo \
    LOG_SILENT=true \
    node src/mcp/servers/mcp-server-stdio.js &
    
    local server_pid=$!
    print_status "MCP server started with PID: $server_pid"
    
    # Wait for server to start
    sleep 2
    
    # Test server communication
    print_status "Testing MCP communication..."
    
    # Create a simple test script
    cat > /tmp/mcp_test.js << 'EOF'
const { spawn } = require('child_process');

console.log('🧪 Testing MCP Protocol Communication');
console.log('=====================================');

// Start the MCP server
const mcpServer = spawn('node', ['src/mcp/servers/mcp-server-stdio.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    NEO4J_DATABASE: 'dashboard-killer',
    MCP_ACTIVE_ONTOLOGIES: 'core,fibo',
    LOG_SILENT: 'true'
  }
});

let serverOutput = '';
let serverError = '';

mcpServer.stdout.on('data', (data) => {
  const output = data.toString();
  serverOutput += output;
  console.log('📤 Server stdout:', output.trim());
});

mcpServer.stderr.on('data', (data) => {
  const error = data.toString();
  serverError += error;
  console.log('⚠️  Server stderr:', error.trim());
});

mcpServer.on('close', (code) => {
  console.log(`\n🛑 Server exited with code ${code}`);
  if (code === 0) {
    console.log('✅ MCP protocol test completed successfully');
  } else {
    console.log('❌ MCP protocol test failed');
  }
});

// Wait a moment for server to start
setTimeout(() => {
  console.log('\n📡 Sending MCP initialization message...');
  
  // Send MCP initialization message
  const initMessage = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {}
      },
      clientInfo: {
        name: "test-client",
        version: "1.0.0"
      }
    }
  };
  
  mcpServer.stdin.write(JSON.stringify(initMessage) + '\n');
  
  // Wait and send list tools request
  setTimeout(() => {
    console.log('📡 Sending list tools request...');
    
    const listToolsMessage = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list"
    };
    
    mcpServer.stdin.write(JSON.stringify(listToolsMessage) + '\n');
    
    // Wait and then close
    setTimeout(() => {
      console.log('📡 Closing connection...');
      mcpServer.stdin.end();
    }, 2000);
    
  }, 1000);
  
}, 2000);

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Terminating test...');
  mcpServer.kill();
  process.exit(0);
});
EOF
    
    # Run the test
    node /tmp/mcp_test.js
    
    # Clean up
    rm /tmp/mcp_test.js
    kill $server_pid 2>/dev/null || true
    
    print_success "MCP protocol test completed"
}

# Function to test Neo4j connection
test_neo4j_connection() {
    print_section "🧪 Testing Neo4j Connection"
    
    # Check if Node.js is available
    check_node
    
    print_status "Testing Neo4j connectivity..."
    
    # Create a simple test script
    cat > /tmp/neo4j_test.js << 'EOF'
const neo4j = require('neo4j-driver');

async function testNeo4jConnection() {
  const uri = 'bolt://localhost:7687';
  const user = 'neo4j';
  const password = 'dashboard-killer';
  
  console.log('Testing Neo4j connection...');
  console.log(`URI: ${uri}`);
  console.log(`User: ${user}`);
  
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  
  try {
    // Test connectivity
    await driver.verifyConnectivity();
    console.log('✅ Neo4j connection successful!');
    
    // Test a simple query
    const session = driver.session();
    const result = await session.run('RETURN 1 as test');
    console.log('✅ Query test successful:', result.records[0].get('test'));
    
    await session.close();
    await driver.close();
    
    console.log('🎉 Neo4j is ready for integration tests!');
    return true;
  } catch (error) {
    console.error('❌ Neo4j connection failed:', error.message);
    console.log('\n📋 Troubleshooting:');
    console.log('1. Make sure Neo4j Desktop is running');
    console.log('2. Create a database on port 7688');
    console.log('3. Set password to "dashboard-killer"');
    console.log('4. Start the database in Neo4j Desktop');
    return false;
  }
}

testNeo4jConnection();
EOF
    
    # Run the test
    node /tmp/neo4j_test.js
    
    # Clean up
    rm /tmp/neo4j_test.js
    
    print_success "Neo4j connection test completed"
}

# Function to test MCP transport options
test_mcp_transport() {
    print_section "🧪 Testing MCP Transport Options"
    
    # Check if Node.js is available
    check_node
    
    echo "Choose transport to test:"
    echo "1) STDIO (for Claude Desktop)"
    echo "2) HTTP (for web clients)"
    echo "3) Both (run HTTP in background, test endpoints)"
    echo "4) Exit"
    echo ""
    
    read -p "Enter choice (1-4): " choice
    
    case $choice in
        1)
            print_status "Testing STDIO transport..."
            echo "   This will start the MCP server in stdio mode"
            echo "   Press Ctrl+C to stop the test"
            echo ""
            
            NEO4J_DATABASE=dashboard-killer \
            MCP_ACTIVE_ONTOLOGIES=core,fibo \
            node src/mcp/servers/mcp-server-stdio.js
            ;;
        2)
            print_status "Testing HTTP transport..."
            echo "   Starting HTTP server on port $PORT..."
            echo ""
            
            NEO4J_DATABASE=dashboard-killer \
            MCP_ACTIVE_ONTOLOGIES=core,fibo \
            MCP_HTTP_PORT=$PORT \
            node src/mcp/servers/mcp-server-http.js &
            
            local pid=$!
            echo "   Server started with PID: $pid"
            
            # Wait for server to start
            sleep 3
            
            # Test health endpoint
            echo "   Testing health endpoint..."
            if curl -s http://localhost:$PORT/health > /dev/null; then
                echo "   ✅ HTTP server is running"
                echo "   📍 Health endpoint: http://localhost:$PORT/health"
                echo "   📍 Root endpoint: http://localhost:$PORT/"
            else
                echo "   ❌ HTTP server failed to start"
            fi
            
            echo ""
            echo "   Press Ctrl+C to stop the server"
            
            # Wait for user to stop
            wait $pid
            ;;
        3)
            print_status "Testing both transports..."
            echo ""
            
            # Start HTTP server in background
            NEO4J_DATABASE=dashboard-killer \
            MCP_ACTIVE_ONTOLOGIES=core,fibo \
            MCP_HTTP_PORT=$PORT \
            node src/mcp/servers/mcp-server-http.js &
            
            http_pid=$!
            echo "   HTTP server started with PID: $http_pid"
            
            # Wait for HTTP server to start
            sleep 3
            
            # Test HTTP endpoints
            echo "   Testing HTTP endpoints..."
            if curl -s http://localhost:$PORT/health > /dev/null; then
                echo "   ✅ HTTP server is running"
                echo "   📍 Health: http://localhost:$PORT/health"
                echo "   📍 Root: http://localhost:$PORT/"
            else
                echo "   ❌ HTTP server failed to start"
            fi
            
            echo ""
            echo "   Now starting STDIO server..."
            echo "   Press Ctrl+C to stop both servers"
            
            # Start STDIO server
            NEO4J_DATABASE=dashboard-killer \
            MCP_ACTIVE_ONTOLOGIES=core,fibo \
            node src/mcp/servers/mcp-server-stdio.js &
            
            stdio_pid=$!
            echo "   STDIO server started with PID: $stdio_pid"
            
            # Wait for user to stop
            wait
            
            # Cleanup
            kill $http_pid 2>/dev/null || true
            kill $stdio_pid 2>/dev/null || true
            ;;
        4)
            echo "👋 Goodbye!"
            exit 0
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
    
    print_success "MCP transport test completed"
}

# Main test logic
case $TEST_TYPE in
    "mcp")
        test_mcp_protocol
        ;;
    "neo4j")
        test_neo4j_connection
        ;;
    "transport")
        test_mcp_transport
        ;;
    "all")
        print_section "🧪 Running All Tests"
        test_neo4j_connection
        echo ""
        test_mcp_protocol
        echo ""
        print_success "All tests completed!"
        ;;
esac 