import { Prisma, PrismaClient } from '#generated/prisma/client.js';

type JsonVal = Prisma.InputJsonValue;
type JsonObj = { [key: string]: JsonVal } | null;

export type AuditPayload = {
  model: string;
  action: string;
  entityId: JsonVal | typeof Prisma.DbNull;
  oldValues: JsonObj;
  newValues: JsonObj;
  args: unknown;
};

export type FindOld = (model: string, where: unknown) => Promise<unknown>;

const SENSITIVE_FIELDS = [
  'passwordHash',
  'tokenHash',
  'loginHmac',
  'emailHmac',
  'loginEncrypted',
  'emailEncrypted',
];

/**
 * Redacts sensitive fields from a JSON object. Fields to redact are defined in SENSITIVE_FIELDS.
 * @param obj
 * @returns A new object with sensitive fields redacted.
 */
function redactSensitive(obj: JsonObj): JsonObj {
  if (!obj) return obj;
  const result = { ...obj };
  for (const field of SENSITIVE_FIELDS) {
    if (field in result) result[field] = '[REDACTED]';
  }
  return result;
}

/** Value comparison: Date, Decimal and Json fields are different objects even when equal. */
function isSame(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Computes field-level diff between two JSON objects.
 * @return Only changed fields
 */
export function computeDiff(
  oldRecord: JsonObj,
  newRecord: JsonObj,
): { oldValues: JsonObj; newValues: JsonObj } {
  if (!oldRecord || !newRecord) {
    return { oldValues: oldRecord, newValues: newRecord };
  }

  const oldValues: { [key: string]: JsonVal } = {};
  const newValues: { [key: string]: JsonVal } = {};

  for (const key of Object.keys(newRecord)) {
    if (!isSame(oldRecord[key], newRecord[key])) {
      oldValues[key] = oldRecord[key]!;
      newValues[key] = newRecord[key]!;
    }
  }

  return {
    oldValues: Object.keys(oldValues).length ? oldValues : null,
    newValues: Object.keys(newValues).length ? newValues : null,
  };
}

/**
 * Handles audit operations for a given set of options and audit callback.
 * @param findOld loads the record before the mutation (query() can only run the current operation)
 * @returns result of the original query operation
 */
export async function handleAuditOperation(
  opts: {
    model: string;
    operation: string;
    args: any;
    query: any;
  },
  auditCallback: (payload: AuditPayload) => Promise<void>,
  findOld: FindOld,
) {
  const mutationOps = ['create', 'update', 'delete', 'upsert'] as const;

  const { model, operation, args, query } = opts;

  if (!mutationOps.includes(operation as any)) {
    return query(args);
  }

  const where = args?.where;
  let oldRecord: JsonObj = null;

  if (operation !== 'create' && where) {
    try {
      const found = await findOld(model, where);
      oldRecord = found && typeof found === 'object' ? (found as JsonObj) : null;
    } catch (err) {
      console.error('Audit: failed to load old record', err);
      oldRecord = null;
    }
  }

  const result = await query(args);
  const newRecord: JsonObj = operation === 'delete' ? null : result;

  const redactedOldRecord = redactSensitive(oldRecord);
  const redactedNewRecord = redactSensitive(newRecord);

  const { oldValues, newValues } = computeDiff(redactedOldRecord, redactedNewRecord);

  const whereId = where?.id;
  let entityId: JsonVal | typeof Prisma.DbNull = Prisma.DbNull;

  if (whereId !== undefined) entityId = whereId;
  else if (newRecord?.id !== undefined) entityId = newRecord.id;
  else if (oldRecord?.id !== undefined) entityId = oldRecord.id;

  try {
    await auditCallback({
      model,
      action: operation,
      entityId,
      oldValues,
      newValues,
      args,
    });
  } catch (err) {
    console.error('Audit error:', err);
    //! TODO: add error handling strategy: fail silently, log, or throw error to rollback transaction
  }

  return result;
}

/**
 * Audit Extension for Prisma
 *
 * Logs create/update/delete/upsert operations with:
 *  - before/after values
 *  - model name
 *  - operation type
 *
 * @param baseClient client WITHOUT this extension, used to read the record before the mutation
 */
export function createAuditExtension(
  auditCallback: (payload: AuditPayload) => Promise<void>,
  baseClient: PrismaClient,
) {
  const findOld: FindOld = (model, where) => {
    const delegate = (baseClient as any)[model.charAt(0).toLowerCase() + model.slice(1)];
    return delegate.findUnique({ where });
  };

  return Prisma.defineExtension({
    name: 'audit-extension',
    query: {
      $allModels: {
        async $allOperations(params) {
          return handleAuditOperation(params, auditCallback, findOld);
        },
      },
    },
  });
}
