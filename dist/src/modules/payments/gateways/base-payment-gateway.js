"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasePaymentGateway = void 0;
const common_1 = require("@nestjs/common");
class BasePaymentGateway {
    constructor(gatewayName) {
        this.gatewayName = gatewayName;
        this.logger = new common_1.Logger(`${gatewayName}Gateway`);
    }
    logPaymentOperation(operation, details) {
        this.logger.log(`${operation}: ${JSON.stringify(details)}`);
    }
    logPaymentError(operation, error) {
        this.logger.error(`${operation} failed: ${error.message}`, error.stack);
    }
}
exports.BasePaymentGateway = BasePaymentGateway;
//# sourceMappingURL=base-payment-gateway.js.map