export type AppRole = "admin" | "worker" | "accountant" | "coworker" | "visitor";

const FINANCE_ROLES: AppRole[] = ["admin", "worker", "accountant"];
const FINANCE_ACCESS_ROLES: AppRole[] = ["admin", "worker", "accountant", "coworker"];
const RESTRICTED_ROLES: AppRole[] = ["coworker", "visitor"];

/** Full financial management: admin, worker, accountant */
export const canManageFinances = (role: string | null | undefined): boolean =>
  FINANCE_ROLES.includes((role || "") as AppRole);

/** View finances (including coworker): admin, worker, accountant, coworker */
export const canAccessFinances = (role: string | null | undefined): boolean =>
  FINANCE_ACCESS_ROLES.includes((role || "") as AppRole);

/** Can see holdings/salaries (excludes coworker and visitor) */
export const canViewHoldings = (role: string | null | undefined): boolean =>
  !RESTRICTED_ROLES.includes((role || "") as AppRole);
