export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'query' | '*';
export type PermissionResource = 'Contact' | 'Organization' | 'Deal' | 'Communication' | 'Task' | '*' ;

export interface Permission {
  action: PermissionAction;
  resource: PermissionResource;
  /**
   * Optional: Specify which fields are accessible.
   * If not provided, access is granted to all fields.
   * e.g., ['firstName', 'lastName'] for a Contact.
   */
  fields?: string[];
  /**
   * Optional: A condition to apply, specified in Cypher syntax.
   * e.g., "node.isPublic = true"
   */
  condition?: string;
}

export interface Role {
  name: string;
  permissions: Permission[];
}

// --- Example Roles ---

export const GUEST_ROLE: Role = {
  name: 'Guest',
  permissions: [
    { action: 'read', resource: 'Organization', fields: ['name', 'website'] },
    { action: 'read', resource: 'Contact', condition: 'node.isPublic = true' }
  ],
};

export const ANALYST_ROLE: Role = {
  name: 'Analyst',
  permissions: [
    ...GUEST_ROLE.permissions,
    { action: 'read', resource: 'Contact' }, // All fields
    { action: 'read', resource: 'Deal' },
    { action: 'read', resource: 'Communication' },
    { action: 'create', resource: 'Task' },
    { action: 'query', resource: '*' }, // Can run queries on all resources
  ],
};

export const ADMIN_ROLE: Role = {
  name: 'Admin',
  permissions: [
    { action: 'create', resource: '*' },
    { action: 'read', resource: '*' },
    { action: 'update', resource: '*' },
    { action: 'delete', resource: '*' },
    { action: 'query', resource: '*' },
  ],
}; 