import type { Role, Skill } from '../enums';

/** User as returned by the API (never includes credentials). */
export interface UserDto {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
  skills: Skill[];
  locale: string;
  isActive: boolean;
  avatarFilename: string | null;
  createdAt: string;
  updatedAt: string;
}
