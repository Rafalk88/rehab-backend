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

type FindOld = (model: string, where: unknown) => Promise<unknown>;

describe('audit.extension (unit)', () => {
  let auditCallback: jest.MockedFunction<(p: AuditPayload) => Promise<void>>;
  let findOld: jest.MockedFunction<FindOld>;

  beforeEach(() => {
    auditCallback = jest.fn().mockResolvedValue(undefined as never) as jest.MockedFunction<
      (p: AuditPayload) => Promise<void>
    >;
    findOld = jest.fn().mockResolvedValue(null as never) as jest.MockedFunction<FindOld>;
  });

  const payloadOf = () => (auditCallback.mock.calls[0] as any)[0];

  // -------------------------------------------------------------
  it('computeDiff should calculate proper field changes', () => {
    const diff = computeDiff({ a: 1, b: 2, c: 3 }, { a: 1, b: 5, c: 3 });

    expect(diff).toEqual({
      oldValues: { b: 2 },
      newValues: { b: 5 },
    });
  });

  // -------------------------------------------------------------
  it('computeDiff should treat equal dates as unchanged', () => {
    const createdAt = '2026-01-01T00:00:00.000Z';
    const diff = computeDiff(
      { status: 'PLANNED', createdAt: new Date(createdAt) as any },
      { status: 'DONE', createdAt: new Date(createdAt) as any },
    );

    expect(diff).toEqual({
      oldValues: { status: 'PLANNED' },
      newValues: { status: 'DONE' },
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
      findOld,
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
      findOld,
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
  it('should fetch old record on update via findOld and compute diff', async () => {
    const oldRec = { id: 'abc', name: 'Old', age: 10 };
    const newRec = { id: 'abc', name: 'New', age: 10 };

    findOld.mockResolvedValue(oldRec as never);
    const query = jest.fn().mockResolvedValue(newRec as never);
    const args = { where: { id: 'abc' }, data: { name: 'New' } };

    await handleAuditOperation(
      { model: 'User', operation: 'update', args, query },
      auditCallback,
      findOld,
    );

    expect(findOld).toHaveBeenCalledWith('User', { id: 'abc' });
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(args);

    const payload = payloadOf();
    expect(payload.oldValues).toEqual({ name: 'Old' });
    expect(payload.newValues).toEqual({ name: 'New' });
    expect(payload.entityId).toBe('abc');
  });

  // -------------------------------------------------------------
  it('should correctly handle delete operations', async () => {
    const oldRec = { id: 'del1', value: 'X' };

    findOld.mockResolvedValue(oldRec as never);
    const query = jest.fn().mockResolvedValue(oldRec as never);

    await handleAuditOperation(
      { model: 'User', operation: 'delete', args: { where: { id: 'del1' } }, query },
      auditCallback,
      findOld,
    );

    const payload = payloadOf();
    expect(payload.action).toBe('delete');
    expect(payload.entityId).toBe('del1');
    expect(payload.oldValues).toEqual(oldRec);
    expect(payload.newValues).toBeNull();
  });

  // -------------------------------------------------------------
  it('should audit create operations without loading old record', async () => {
    const newRec = { id: 'u1', name: 'John' };
    const query = jest.fn().mockResolvedValue(newRec as never);

    await handleAuditOperation(
      { model: 'User', operation: 'create', args: { data: {} }, query },
      auditCallback,
      findOld,
    );

    expect(findOld).not.toHaveBeenCalled();
    expect(auditCallback).toHaveBeenCalledTimes(1);

    const payload = payloadOf();
    expect(payload.model).toBe('User');
    expect(payload.action).toBe('create');
    expect(payload.entityId).toBe('u1');
    expect(payload.oldValues).toBeNull();
    expect(payload.newValues).toEqual(newRec);
  });

  // -------------------------------------------------------------
  it('should fetch old record on update via findOld and compute diff', async () => {
    const oldRec = { id: 'abc', name: 'Old', age: 10 };
    const newRec = { id: 'abc', name: 'New', age: 10 };

    findOld.mockResolvedValue(oldRec as never);
    const query = jest.fn().mockResolvedValue(newRec as never);
    const args = { where: { id: 'abc' }, data: { name: 'New' } };

    await handleAuditOperation(
      { model: 'User', operation: 'update', args, query },
      auditCallback,
      findOld,
    );

    expect(findOld).toHaveBeenCalledWith('User', { id: 'abc' });
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(args);

    const payload = payloadOf();
    expect(payload.oldValues).toEqual({ name: 'Old' });
    expect(payload.newValues).toEqual({ name: 'New' });
    expect(payload.entityId).toBe('abc');
  });

  // -------------------------------------------------------------
  it('should still run the mutation and log when findOld fails', async () => {
    const newRec = { id: 'abc', name: 'New' };
    const error = new Error('db down');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    findOld.mockRejectedValue(error as never);
    const query = jest.fn().mockResolvedValue(newRec as never);

    const result = await handleAuditOperation(
      { model: 'User', operation: 'update', args: { where: { id: 'abc' }, data: {} }, query },
      auditCallback,
      findOld,
    );

    expect(result).toEqual(newRec);
    expect(consoleSpy).toHaveBeenCalledWith('Audit: failed to load old record', error);
    expect(payloadOf().oldValues).toBeNull();

    consoleSpy.mockRestore();
  });

  // -------------------------------------------------------------
  it('should correctly handle delete operations', async () => {
    const oldRec = { id: 'del1', value: 'X' };

    findOld.mockResolvedValue(oldRec as never);
    const query = jest.fn().mockResolvedValue(oldRec as never);

    await handleAuditOperation(
      { model: 'User', operation: 'delete', args: { where: { id: 'del1' } }, query },
      auditCallback,
      findOld,
    );

    const payload = payloadOf();
    expect(payload.action).toBe('delete');
    expect(payload.entityId).toBe('del1');
    expect(payload.oldValues).toEqual(oldRec);
    expect(payload.newValues).toBeNull();
  });

  // -------------------------------------------------------------
  it('should fallback to Prisma.DbNull when no id exists', async () => {
    const query = jest.fn().mockResolvedValue({ foo: 'bar' } as never);

    await handleAuditOperation(
      { model: 'User', operation: 'create', args: {}, query },
      auditCallback,
      findOld,
    );

    expect(payloadOf().entityId).toBe(Prisma.DbNull);
  });
});
