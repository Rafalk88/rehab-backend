export {};
declare global {
  namespace Express {
    export interface Request {
      session?: {
        userId: string;
        role?: string;
        permissions?: string[];
        organizationalUnitId?: string | null;
      };
    }
  }
}
