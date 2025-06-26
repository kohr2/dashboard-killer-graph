import { singleton } from 'tsyringe';
import { User } from '../../domain/user';
import { PermissionAction, PermissionResource } from '../../domain/role';

@singleton()
export class AccessControlService {
  public can(
    user: User,
    action: PermissionAction,
    resource: PermissionResource,
  ): boolean {
    if (!user || !user.roles) {
      return false;
    }

    // Iterate over all roles of the user
    for (const role of user.roles) {
      // Iterate over all permissions of the role
      for (const permission of role.permissions) {
        const hasActionMatch = permission.action === action || permission.action === '*';
        const hasResourceMatch = permission.resource === resource || permission.resource === '*';

        if (hasActionMatch && hasResourceMatch) {
          // At this point, we found a matching permission.
          // We would add more logic here for field-level and condition-based checks later.
          return true;
        }
      }
    }

    // If no permission matched after checking all roles
    return false;
  }
} 