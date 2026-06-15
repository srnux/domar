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
  /** Tenant the user belongs to; null for platform admins. */
  companyId: string | null;
  /** Name of the tenant company; null for platform admins. */
  companyName: string | null;
  /** Global super-admin (manages companies); routes to the /admin area. */
  isPlatformAdmin: boolean;
  /** Average 1–5 rating across this worker's rated jobs; null when unrated. Workers only. */
  avgScore: number | null;
  /** Number of rated jobs backing avgScore. Workers only. */
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}
