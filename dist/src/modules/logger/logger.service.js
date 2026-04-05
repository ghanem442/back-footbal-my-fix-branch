"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerService = void 0;
const common_1 = require("@nestjs/common");
const nest_winston_1 = require("nest-winston");
const winston_1 = require("winston");
let LoggerService = class LoggerService {
    constructor(logger) {
        this.logger = logger;
    }
    log(message, context, meta) {
        this.logger.info(message, { context, ...meta });
    }
    error(message, trace, context, meta) {
        this.logger.error(message, { context, trace, ...meta });
    }
    warn(message, context, meta) {
        this.logger.warn(message, { context, ...meta });
    }
    debug(message, context, meta) {
        this.logger.debug(message, { context, ...meta });
    }
    verbose(message, context, meta) {
        this.logger.verbose(message, { context, ...meta });
    }
    logHttpRequest(data) {
        this.logger.info('HTTP Request', {
            context: 'HTTP',
            ...data,
        });
    }
    logAuthAttempt(data) {
        const level = data.result === 'success' ? 'info' : 'warn';
        this.logger.log(level, 'Authentication Attempt', {
            context: 'Auth',
            ...data,
        });
    }
    logPaymentTransaction(data) {
        this.logger.info('Payment Transaction', {
            context: 'Payment',
            ...data,
        });
    }
    logJobExecution(data) {
        const level = data.status === 'failed' ? 'error' : 'info';
        this.logger.log(level, 'Background Job', {
            context: 'Jobs',
            ...data,
        });
    }
    logWebhook(data) {
        this.logger.info('Webhook Received', {
            context: 'Webhook',
            ...data,
        });
    }
    logPaymentStatusChange(data) {
        this.logger.info('Payment Status Changed', {
            context: 'Payment',
            ...data,
        });
    }
};
exports.LoggerService = LoggerService;
exports.LoggerService = LoggerService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_PROVIDER)),
    __metadata("design:paramtypes", [winston_1.Logger])
], LoggerService);
//# sourceMappingURL=logger.service.js.map