// Test data for dashboard-killer-graph

// Create Organizations
CREATE (org1:Organization {
  id: 'org-001', 
  name: 'Microsoft Corporation', 
  type: 'Technology Company',
  sector: 'Technology',
  country: 'USA'
})

CREATE (org2:Organization {
  id: 'org-002', 
  name: 'Apple Inc', 
  type: 'Technology Company',
  sector: 'Technology', 
  country: 'USA'
})

CREATE (org3:Organization {
  id: 'org-003', 
  name: 'BlueOwl Capital', 
  type: 'Investment Firm',
  sector: 'Finance',
  country: 'USA'
})

// Create Contacts
CREATE (contact1:Contact {
  id: 'contact-001',
  name: 'John Smith',
  firstName: 'John',
  lastName: 'Smith', 
  email: 'john.smith@microsoft.com',
  title: 'VP of Sales'
})

CREATE (contact2:Contact {
  id: 'contact-002',
  name: 'Lisa Johnson', 
  firstName: 'Lisa',
  lastName: 'Johnson',
  email: 'lisa.j@apple.com',
  title: 'Product Manager'
})

// Create Deals  
CREATE (deal1:Deal {
  id: 'deal-001',
  name: 'Microsoft Partnership Deal',
  amount: 5000000,
  status: 'Active',
  stage: 'Negotiation'
})

CREATE (deal2:Deal {
  id: 'deal-002', 
  name: 'Apple Investment',
  amount: 10000000,
  status: 'Closed',
  stage: 'Completed'
})

// Create relationships
CREATE (contact1)-[:WORKS_FOR]->(org1)
CREATE (contact2)-[:WORKS_FOR]->(org2)  
CREATE (deal1)-[:INVOLVES]->(org1)
CREATE (deal2)-[:INVOLVES]->(org2)
CREATE (org3)-[:INVESTED_IN]->(deal2)

RETURN 'Test data created successfully' as result; 