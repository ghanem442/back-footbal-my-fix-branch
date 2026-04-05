export interface JwtPayload {
  userId: string;
  email: string;
  role: 'PLAYER' | 'FIELD_OWNER' | 'ADMIN';
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
}
