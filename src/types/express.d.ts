import 'express';

declare module 'express' {
  export interface Request {
    session?: {
      userId: string;
      role?: string;
      permissions?: string[];
      organizationalUnitId?: string | null;
    };
  }
}
