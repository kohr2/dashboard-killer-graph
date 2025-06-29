import 'reflect-metadata';
import { AccessControlService } from '../../../../../src/platform/security/application/services/access-control.service';
import { User } from '../../../../../src/platform/security/domain/user';
import { ANALYST_ROLE, ADMIN_ROLE, GUEST_ROLE } from '../../../../../src/platform/security/domain/role';

describe('AccessControlService', () => {
  let accessControlService: AccessControlService;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // Set NODE_ENV to something other than 'test' to run the real logic
    process.env.NODE_ENV = 'production'; 
    accessControlService = new AccessControlService();
  });
  
  afterEach(() => {
    // Restore the original NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  });

  const guestUser: User = { id: 'guest-1', username: 'guest', roles: [GUEST_ROLE] };
  const analystUser: User = { id: 'analyst-1', username: 'analyst', roles: [ANALYST_ROLE] };
  const adminUser: User = { id: 'admin-1', username: 'admin', roles: [ADMIN_ROLE] };
  
  // A user with multiple roles
  const multiRoleUser: User = { id: 'multi-1', username: 'multi', roles: [GUEST_ROLE, ANALYST_ROLE]};

  describe('can', () => {
    it('should return true if a user has the required permission', () => {
      const hasPermission = accessControlService.can(analystUser, 'read', 'Deal');
      expect(hasPermission).toBe(true);
    });

    it('should return false if a user does not have the required permission', () => {
      const hasPermission = accessControlService.can(guestUser, 'read', 'Deal');
      expect(hasPermission).toBe(false);
    });

    it('should grant access based on wildcard resource permission', () => {
      const hasPermission = accessControlService.can(adminUser, 'delete', 'Contact');
      expect(hasPermission).toBe(true);
    });
    
    it('should grant access based on wildcard action permission (not a standard use case but good to check)', () => {
        const customRoleUser: User = { id: 'custom-1', username: 'custom', roles: [
            { name: 'querier', permissions: [{ action: 'query', resource: '*' }] }
        ]};
        const hasPermission = accessControlService.can(customRoleUser, 'query', 'Organization');
        expect(hasPermission).toBe(true);
    });

    it('should handle users with multiple roles correctly', () => {
        // Can do Analyst stuff
        expect(accessControlService.can(multiRoleUser, 'read', 'Deal')).toBe(true);
        // Can do Guest stuff
        expect(accessControlService.can(multiRoleUser, 'read', 'Organization')).toBe(true);
        // Cannot do Admin stuff
        expect(accessControlService.can(multiRoleUser, 'delete', 'Contact')).toBe(false);
    });

    it('should deny access if user has no roles', () => {
        const noRoleUser: User = { id: 'no-role-1', username: 'norole', roles: [] };
        const hasPermission = accessControlService.can(noRoleUser, 'read', 'Contact');
        expect(hasPermission).toBe(false);
    });
  });
}); 