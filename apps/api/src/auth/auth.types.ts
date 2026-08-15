export type AccessTokenPayload = {
  sub: string;
  sid: string;
  kind: 'customer' | 'staff';
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
};
