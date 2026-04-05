export declare class TokenHasher {
    static generateToken(bytes?: number): string;
    static hashToken(token: string): string;
    static generateAndHashToken(bytes?: number): {
        plainToken: string;
        hashedToken: string;
    };
}
