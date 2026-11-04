const ACTIONS = {
  READ: 'read',
  UPDATE: 'update',
  REGISTER: 'register',
  RESET: 'reset',
  LOCK: 'lock',
  ASSIGN: 'assign',
  OVERRIDE: 'override',
  CREATE: 'create',
} as const;

const PERMISSIONS = {
  VISITS: {
    READ: `visits.${ACTIONS.READ}`,
    CREATE: `visits.${ACTIONS.CREATE}`,
    UPDATE: `visits.${ACTIONS.UPDATE}`,
    UPDATE_STATUS: `visits.${ACTIONS.UPDATE}_status`,
  },
  USERS: {
    READ: `users.${ACTIONS.READ}`,
    CREATE: `users.${ACTIONS.CREATE}`,
    UPDATE: `users.${ACTIONS.UPDATE}`,
    REGISTER: `users.${ACTIONS.REGISTER}`,
    RESET_PASSWORD: `users.${ACTIONS.RESET}_password`,
    LOCK: `users.${ACTIONS.LOCK}`,
  },
  ORG_UNITS: {
    READ: `org_units.${ACTIONS.READ}`,
    CREATE: `org_units.${ACTIONS.CREATE}`,
    UPDATE: `org_units.${ACTIONS.UPDATE}`,
  },
  PATIENTS: {
    READ: `patients.${ACTIONS.READ}`,
    CREATE: `patients.${ACTIONS.CREATE}`,
    UPDATE: `patients.${ACTIONS.UPDATE}`,
  },
  ROLES: {
    READ: `roles.${ACTIONS.READ}`,
    CREATE: `roles.${ACTIONS.CREATE}`,
    UPDATE: `roles.${ACTIONS.UPDATE}`,
    ASSIGN: `roles.${ACTIONS.ASSIGN}`,
  },
  PERMISSIONS: {
    READ: `permissions.${ACTIONS.READ}`,
    ASSIGN: `permissions.${ACTIONS.ASSIGN}`,
    OVERRIDE: `permissions.${ACTIONS.OVERRIDE}`,
  },
} as const;

const ALL_PERMISSIONS = Object.values(PERMISSIONS).flatMap((group) =>
  Object.values(group),
) as Permission[];

export { ACTIONS, PERMISSIONS, ALL_PERMISSIONS };

export type Action = (typeof ACTIONS)[keyof typeof ACTIONS];

type ValueOf<T> = T[keyof T];
export type Permission = ValueOf<{
  [K in keyof typeof PERMISSIONS]: ValueOf<(typeof PERMISSIONS)[K]>;
}>;
