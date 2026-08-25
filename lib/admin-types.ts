export const ADMIN_ROLES = ["super_admin", "admin"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export type AdminActor = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  sessionId: string | null;
};

export type AuthenticatedAdmin = AdminActor & {
  active: true;
  mustChangePassword: boolean;
  legacy: boolean;
};

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && (ADMIN_ROLES as readonly string[]).includes(value);
}
