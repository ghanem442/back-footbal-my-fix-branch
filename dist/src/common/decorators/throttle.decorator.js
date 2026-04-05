"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThrottleDefault = exports.ThrottlePayment = exports.ThrottleAuth = exports.Throttle = exports.THROTTLE_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.THROTTLE_KEY = 'throttle';
const Throttle = (options) => (0, common_1.SetMetadata)(exports.THROTTLE_KEY, options);
exports.Throttle = Throttle;
const ThrottleAuth = () => (0, exports.Throttle)({ limit: 5, ttl: 900 });
exports.ThrottleAuth = ThrottleAuth;
const ThrottlePayment = () => (0, exports.Throttle)({ limit: 10, ttl: 3600 });
exports.ThrottlePayment = ThrottlePayment;
const ThrottleDefault = () => (0, exports.Throttle)({ limit: 100, ttl: 900 });
exports.ThrottleDefault = ThrottleDefault;
//# sourceMappingURL=throttle.decorator.js.map