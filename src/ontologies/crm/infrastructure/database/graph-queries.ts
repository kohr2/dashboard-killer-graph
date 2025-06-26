// Advanced Graph Queries for CRM Knowledge Graph
// Complex Cypher queries for discovering patterns and relationships

export class GraphQueries {
  
  // 🔍 RELATIONSHIP DISCOVERY QUERIES
  
  /**
   * Find all contacts connected to organizations in a specific industry
   */
  static contactsByIndustry = `
    MATCH (c:Contact)-[:WORKS_AT]->(o:Organization)
    WHERE toLower(o.industry) CONTAINS toLower($industry)
    RETURN c, o, 
           o.industry as industry,
           count{(c)-[:PARTICIPANT_IN]->(:Communication)} as communicationCount,
           count{(c)<-[:ASSIGNED_TO]-(:Task)} as taskCount
    ORDER BY communicationCount DESC
  `;

  /**
   * Find the most active contacts (by communication volume)
   */
  static mostActiveContacts = `
    MATCH (c:Contact)
    OPTIONAL MATCH (c)-[:PARTICIPANT_IN]->(comm:Communication)
    WITH c, count(comm) as commCount
    WHERE commCount > 0
    RETURN c, commCount
    ORDER BY commCount DESC
    LIMIT 20
  `;

  /**
   * Find overdue tasks for contacts at specific organization sizes
   */
  static overdueTasksByOrgSize = `
    MATCH (c:Contact)-[:WORKS_AT]->(o:Organization),
          (t:Task)-[:ASSIGNED_TO]->(c)
    WHERE o.size = $orgSize 
      AND t.dueDate < datetime()
      AND t.status <> 'completed'
    RETURN c, o, t, 
           duration.between(t.dueDate, datetime()) as overdueBy
    ORDER BY overdueBy DESC
  `;

  // 📊 ANALYTICS QUERIES

  /**
   * Get communication network analysis
   */
  static communicationNetwork = `
    MATCH (c1:Contact)-[:PARTICIPANT_IN]->(comm:Communication)<-[:PARTICIPANT_IN]-(c2:Contact)
    WHERE c1 <> c2
    WITH c1, c2, count(comm) as connectionStrength
    WHERE connectionStrength >= $minConnections
    RETURN c1.name as contact1, 
           c2.name as contact2, 
           connectionStrength
    ORDER BY connectionStrength DESC
  `;

  /**
   * Organization influence score based on employee activity
   */
  static organizationInfluenceScore = `
    MATCH (o:Organization)<-[:WORKS_AT]-(c:Contact)
    OPTIONAL MATCH (c)-[:PARTICIPANT_IN]->(comm:Communication)
    OPTIONAL MATCH (t:Task)-[:ASSIGNED_TO]->(c)
    WITH o, 
         count(DISTINCT c) as employeeCount,
         count(DISTINCT comm) as totalCommunications,
         count(DISTINCT t) as totalTasks
    RETURN o.name as organization,
           employeeCount,
           totalCommunications,
           totalTasks,
           (employeeCount * 2 + totalCommunications + totalTasks) as influenceScore
    ORDER BY influenceScore DESC
  `;

  // 🎯 BUSINESS INTELLIGENCE QUERIES

  /**
   * Find potential upsell opportunities
   */
  static upsellOpportunities = `
    MATCH (o:Organization)<-[:WORKS_AT]-(c:Contact)
    WHERE o.size IN ['Small', 'Medium']
    OPTIONAL MATCH (c)-[:PARTICIPANT_IN]->(comm:Communication)
    WHERE comm.type IN ['meeting', 'call']
      AND comm.createdAt > datetime() - duration({months: 3})
    WITH o, c, count(comm) as recentEngagement
    WHERE recentEngagement >= 3
    RETURN o.name as organization,
           o.size as currentSize,
           collect(c.name) as activeContacts,
           recentEngagement
    ORDER BY recentEngagement DESC
  `;

  /**
   * Task completion rates by organization
   */
  static taskCompletionByOrg = `
    MATCH (o:Organization)<-[:WORKS_AT]-(c:Contact)<-[:ASSIGNED_TO]-(t:Task)
    WITH o, 
         count(t) as totalTasks,
         count{(t:Task) WHERE t.status = 'completed'} as completedTasks
    WHERE totalTasks > 0
    RETURN o.name as organization,
           totalTasks,
           completedTasks,
           round(toFloat(completedTasks) / totalTasks * 100, 2) as completionRate
    ORDER BY completionRate DESC
  `;

  // 🔮 PREDICTIVE QUERIES

  /**
   * Predict high-risk contacts (low engagement)
   */
  static highRiskContacts = `
    MATCH (c:Contact)
    OPTIONAL MATCH (c)-[:PARTICIPANT_IN]->(comm:Communication)
    WHERE comm.createdAt > datetime() - duration({months: 2})
    WITH c, count(comm) as recentCommunications
    OPTIONAL MATCH (t:Task)-[:ASSIGNED_TO]->(c)
    WHERE t.createdAt > datetime() - duration({months: 1})
      AND t.status <> 'completed'
    WITH c, recentCommunications, count(t) as pendingTasks
    WHERE recentCommunications < 2 AND pendingTasks > 3
    RETURN c.name as contact,
           c.email as email,
           recentCommunications,
           pendingTasks,
           'High Risk - Low Engagement' as riskReason
  `;

  /**
   * Find communication patterns (who talks to whom most)
   */
  static communicationPatterns = `
    MATCH (c:Contact)-[:PARTICIPANT_IN]->(comm:Communication)
    WITH c, comm.type as commType, 
         extract(month FROM comm.createdAt) as month,
         count(*) as frequency
    RETURN c.name as contact,
           commType,
           month,
           frequency
    ORDER BY c.name, month, frequency DESC
  `;

  // 🌐 GRAPH TRAVERSAL QUERIES

  /**
   * Find shortest path between two contacts through organizations
   */
  static shortestContactPath = `
    MATCH path = shortestPath(
      (c1:Contact {id: $contactId1})-[*..4]-(c2:Contact {id: $contactId2})
    )
    WHERE c1 <> c2
    RETURN path,
           length(path) as pathLength,
           [node in nodes(path) | 
             CASE 
               WHEN 'Contact' IN labels(node) THEN node.name
               WHEN 'Organization' IN labels(node) THEN node.name
               ELSE 'Unknown'
             END
           ] as pathNodes
  `;

  /**
   * Find all contacts within N degrees of a specific contact
   */
  static contactNeighborhood = `
    MATCH (center:Contact {id: $contactId})
    CALL apoc.path.subgraphNodes(center, {
      relationshipFilter: 'WORKS_AT|PARTICIPANT_IN',
      minLevel: 1,
      maxLevel: $degrees
    }) YIELD node
    WHERE 'Contact' IN labels(node) AND node <> center
    RETURN DISTINCT node as contact,
           shortestPath((center)-[*..${`$degrees`}]-(node)) as path
  `;

  // 📈 TEMPORAL QUERIES

  /**
   * Communication timeline for a contact
   */
  static communicationTimeline = `
    MATCH (c:Contact {id: $contactId})-[:PARTICIPANT_IN]->(comm:Communication)
    RETURN comm.type as type,
           comm.subject as subject,
           comm.createdAt as timestamp,
           comm.direction as direction
    ORDER BY comm.createdAt DESC
    LIMIT 50
  `;

  /**
   * Task velocity by month
   */
  static taskVelocityTrend = `
    MATCH (t:Task)
    WHERE t.completedAt IS NOT NULL
    WITH t, 
         t.createdAt as created,
         t.completedAt as completed,
         duration.between(t.createdAt, t.completedAt) as completionTime
    RETURN extract(year FROM created) as year,
           extract(month FROM created) as month,
           count(t) as tasksCompleted,
           avg(completionTime.days) as avgCompletionDays
    ORDER BY year DESC, month DESC
  `;
} 