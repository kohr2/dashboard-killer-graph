import { Role } from './role';

export interface User {
  id: string;
  username: string;
  roles: Role[];
} 