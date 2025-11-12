import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { Prisma } from '#/generated/prisma/client.js';

export interface AuditMeta {
  actionDetails?: string;
  oldValues?: Prisma.InputJsonValue | typeof Prisma.DbNull;
  newValues?: Prisma.InputJsonValue | typeof Prisma.DbNull;
}

export interface RequestContextData {
  userId?: string | null;
  ipAddress?: string;
  auditMeta?: AuditMeta;
}

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContextData>();

  run(data: RequestContextData, callback: () => void) {
    this.storage.run(data, callback);
  }

  get(): RequestContextData | undefined {
    return this.storage.getStore();
  }

  setAuditMeta(meta: AuditMeta) {
    const store = this.storage.getStore();
    if (store) {
      store.auditMeta = meta;
    }
  }

  clearAuditMeta() {
    const store = this.storage.getStore();
    if (store && store.auditMeta) {
      delete store.auditMeta;
    }
  }

  async withAudit<T>(meta: AuditMeta, fn: () => Promise<T>): Promise<T> {
    this.setAuditMeta(meta);
    try {
      return await fn();
    } finally {
      this.clearAuditMeta();
    }
  }
}
