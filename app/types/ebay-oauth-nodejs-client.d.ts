declare module "ebay-oauth-nodejs-client" {
  export interface EbayAuthTokenOptions {
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
    scope?: string | string[];
    env?: "PRODUCTION" | "SANDBOX";
    filePath?: string;
    baseUrl?: string;
  }

  export interface EbayTokenResponse {
    access_token?: string;
    token_type?: string;
    expires_in?: number;
    refresh_token?: string;
    refresh_token_expires_in?: number;
  }

  export default class EbayAuthToken {
    constructor(options: EbayAuthTokenOptions);
    getApplicationToken(
      environment: "PRODUCTION" | "SANDBOX",
      scopes?: string | string[]
    ): Promise<string>;
    generateUserAuthorizationUrl(
      environment: "PRODUCTION" | "SANDBOX",
      scopes: string | string[],
      options?: { state?: string; prompt?: string }
    ): string;
    exchangeCodeForAccessToken(
      environment: "PRODUCTION" | "SANDBOX",
      code: string
    ): Promise<string>;
    getAccessToken(
      environment: "PRODUCTION" | "SANDBOX",
      refreshToken: string,
      scopes: string | string[]
    ): Promise<string>;
    setRefreshToken(refreshToken: string): void;
    getRefreshToken(): string | undefined;
  }
}
