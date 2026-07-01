export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  entityCode: string | null;
  isEntityResponsible: boolean;
  iat?: number;
  exp?: number;
}
