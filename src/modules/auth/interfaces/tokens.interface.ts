export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface TokenValidationResult {
  valid: boolean;
  payload?: any;
  error?: string;
}
