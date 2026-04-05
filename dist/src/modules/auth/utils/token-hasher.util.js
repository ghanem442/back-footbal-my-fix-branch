"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenHasher = void 0;
const crypto_1 = require("crypto");
class TokenHasher {
    static generateToken(bytes = 32) {
        return (0, crypto_1.randomBytes)(bytes).toString('hex');
    }
    static hashToken(token) {
        return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
    }
    static generateAndHashToken(bytes = 32) {
        const plainToken = this.generateToken(bytes);
        const hashedToken = this.hashToken(plainToken);
        return { plainToken, hashedToken };
    }
}
exports.TokenHasher = TokenHasher;
//# sourceMappingURL=token-hasher.util.js.map