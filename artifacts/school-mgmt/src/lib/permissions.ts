export const MODULES = [
  "dashboard",
  "students",
  "teachers",
  "classes",
  "attendance",
  "fees",
  "results",
  "reportCards",
  "reports",
  "settings",
  "users",
] as const;

export type Module = (typeof MODULES)[number];
export const ACTIONS = ["view", "create", "edit", "delete"] as const;
export type Action = (typeof ACTIONS)[number];
export type ModulePerms = Record<Action, boolean>;
export type RolePerms = Record<Module, ModulePerms>;
export type AllPerms = Record<string, RolePerms>;

const full = (): ModulePerms => ({ view: true, create: true, edit: true, delete: true });
const viewOnly = (): ModulePerms => ({ view: true, create: false, edit: false, delete: false });
const none = (): ModulePerms => ({ view: false, create: false, edit: false, delete: false });
const partial = (v: boolean, c: boolean, e: boolean, d: boolean): ModulePerms =>
  ({ view: v, create: c, edit: e, delete: d });

export const MODULE_LABELS: Record<Module, string> = {
  dashboard: "Dashboard",
  students: "Students",
  teachers: "Teachers",
  classes: "Classes & Subjects",
  attendance: "Attendance",
  fees: "Fees & Payments",
  results: "Results",
  reportCards: "Report Cards",
  reports: "Reports",
  settings: "Settings",
  users: "Users & Roles",
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  headteacher: "Headteacher",
  teacher: "Teacher",
  accountant: "Accountant",
  student: "Student",
  parent: "Parent",
};

export const DEFAULT_PERMISSIONS: AllPerms = {
  admin: {
    dashboard: full(), students: full(), teachers: full(), classes: full(),
    attendance: full(), fees: full(), results: full(), reportCards: full(),
    reports: full(), settings: full(), users: full(),
  },
  headteacher: {
    dashboard: viewOnly(),
    students: viewOnly(),
    teachers: viewOnly(),
    classes: viewOnly(),
    attendance: partial(true, true, true, false),
    fees: viewOnly(),
    results: viewOnly(),
    reportCards: partial(true, false, true, false),
    reports: viewOnly(),
    settings: none(),
    users: none(),
  },
  teacher: {
    dashboard: viewOnly(),
    students: viewOnly(),
    teachers: none(),
    classes: viewOnly(),
    attendance: partial(true, true, true, false),
    fees: none(),
    results: partial(true, true, true, false),
    reportCards: viewOnly(),
    reports: none(),
    settings: none(),
    users: none(),
  },
  accountant: {
    dashboard: viewOnly(),
    students: viewOnly(),
    teachers: none(),
    classes: none(),
    attendance: none(),
    fees: full(),
    results: none(),
    reportCards: none(),
    reports: viewOnly(),
    settings: none(),
    users: none(),
  },
  student: {
    dashboard: none(),
    students: none(),
    teachers: none(),
    classes: none(),
    attendance: none(),
    fees: none(),
    results: none(),
    reportCards: none(),
    reports: none(),
    settings: none(),
    users: none(),
  },
  parent: {
    dashboard: none(),
    students: none(),
    teachers: none(),
    classes: none(),
    attendance: none(),
    fees: none(),
    results: none(),
    reportCards: none(),
    reports: none(),
    settings: none(),
    users: none(),
  },
};

const STORAGE_KEY = "schoolpro_perms_v1";

export function loadPermissions(): AllPerms {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: Partial<AllPerms> = JSON.parse(stored);
      const merged: AllPerms = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS));
      for (const role of Object.keys(parsed)) {
        if (merged[role] && parsed[role]) {
          for (const mod of MODULES) {
            if (parsed[role]![mod]) {
              merged[role][mod] = { ...merged[role][mod], ...parsed[role]![mod] };
            }
          }
        }
      }
      return merged;
    }
  } catch {}
  return JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS));
}

export function savePermissions(permissions: AllPerms): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(permissions));
}

export function resetPermissions(): AllPerms {
  localStorage.removeItem(STORAGE_KEY);
  return JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS));
}
