/* eslint-disable @typescript-eslint/no-explicit-any */

import { handleAuditOperation, computeDiff } from './audit.extension.js';
import { Prisma } from '#generated/prisma/client.js';
import { jest } from '@jest/globals';

type JsonVal = Prisma.InputJsonValue;
type JsonObj = { [key: string]: JsonVal };

type AuditPayload = {
  model: string;
  action: string;
  entityId: Prisma.InputJsonValue | typeof Prisma.DbNull;
  oldValues: JsonObj | null;
  newValues: JsonObj | null;
  args: unknown;
};

describe('audit.extension (unit)', () => {
  let auditCallback: jest.MockedFunction<(p: AuditPayload) => Promise<void>>;

  beforeEach(() => {
    auditCallback = jest.fn().mockResolvedValue(undefined as never) as jest.MockedFunction<
      (p: AuditPayload) => Promise<void>
    >;
  });

  // -------------------------------------------------------------
  it('computeDiff should calculate proper field changes', () => {
    const diff = computeDiff({ a: 1, b: 2, c: 3 }, { a: 1, b: 5, c: 3 });

    expect(diff).toEqual({
      oldValues: { b: 2 },
      newValues: { b: 5 },
    });
  });

  // -------------------------------------------------------------
  it('should skip non-mutation operations', async () => {
    const query = jest.fn().mockResolvedValue([{ id: 1 }] as never);

    const result = await handleAuditOperation(
      {
        model: 'User',
        operation: 'findMany',
        args: {},
        query,
      },
      auditCallback,
    );

    expect(query).toHaveBeenCalledTimes(1);
    expect(auditCallback).not.toHaveBeenCalled();
    expect(result).toEqual([{ id: 1 }]);
  });

  // -------------------------------------------------------------
  it('should audit create operations', async () => {
    const newRec = { id: 'u1', name: 'John' };

    const query = jest.fn().mockResolvedValue(newRec as never);

    await handleAuditOperation(
      {
        model: 'User',
        operation: 'create',
        args: { data: {} },
        query,
      },
      auditCallback,
    );

    expect(auditCallback).toHaveBeenCalledTimes(1);
    const payload = (auditCallback.mock.calls[0] as any)[0];

    expect((payload as any)?.model).toBe('User');
    expect((payload as any)?.action).toBe('create');
    expect((payload as any)?.entityId).toBe('u1');
    expect((payload as any)?.oldValues).toBeNull();
    expect((payload as any)?.newValues).toEqual(newRec);
  });

  // -------------------------------------------------------------
  it('should fetch old record on update and compute diff', async () => {
    const oldRec = { id: 'abc', name: 'Old', age: 10 };
    const newRec = { id: 'abc', name: 'New', age: 10 };

    const query = jest
      .fn()
      .mockImplementationOnce(async (arg: any) => {
        if (arg.action === 'findUnique') return oldRec;
        return null;
      })
      .mockResolvedValueOnce(newRec as never);

    await handleAuditOperation(
      {
        model: 'User',
        operation: 'update',
        args: { where: { id: 'abc' }, data: { name: 'New' } },
        query,
      },
      auditCallback,
    );

    expect(auditCallback).toHaveBeenCalledTimes(1);
    const payload = (auditCallback.mock.calls[0] as any)[0];

    expect((payload as any)?.oldValues).toEqual({ name: 'Old' });
    expect((payload as any)?.newValues).toEqual({ name: 'New' });
    expect((payload as any)?.entityId).toBe('abc');
  });

  // -------------------------------------------------------------
  it('should correctly handle delete operations', async () => {
    const oldRec = { id: 'del1', value: 'X' };

    const query = jest
      .fn()
      .mockImplementationOnce(async (arg: any) => {
        if (arg.action === 'findUnique') return oldRec;
        return null;
      })
      .mockResolvedValueOnce(oldRec as never);

    await handleAuditOperation(
      {
        model: 'User',
        operation: 'delete',
        args: { where: { id: 'del1' } },
        query,
      },
      auditCallback,
    );

    const payload = (auditCallback.mock.calls[0] as any)[0];

    expect((payload as any)?.action).toBe('delete');
    expect((payload as any)?.entityId).toBe('del1');
    expect((payload as any)?.oldValues).toEqual(oldRec);
    expect((payload as any)?.newValues).toBeNull();
  });

  // -------------------------------------------------------------
  it('should fallback to Prisma.DbNull when no id exists', async () => {
    const newRec = { foo: 'bar' };

    const query = jest.fn().mockResolvedValue(newRec as never);

    await handleAuditOperation(
      {
        model: 'User',
        operation: 'create',
        args: {},
        query,
      },
      auditCallback,
    );

    const payload = (auditCallback.mock.calls[0] as any)[0];
    expect((payload as any)?.entityId).toBe(Prisma.DbNull);
  });
});
