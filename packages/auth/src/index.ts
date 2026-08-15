export type PrincipalKind = 'public' | 'customer' | 'staff' | 'platform-admin' | 'system';

export type AuthenticatedPrincipal = {
  userId: string;
  sessionId: string;
  kind: Exclude<PrincipalKind, 'public' | 'system'>;
};
