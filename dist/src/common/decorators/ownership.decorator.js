"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckOwnership = exports.ResourceType = exports.OWNERSHIP_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.OWNERSHIP_KEY = 'ownership';
var ResourceType;
(function (ResourceType) {
    ResourceType["FIELD"] = "field";
    ResourceType["BOOKING"] = "booking";
})(ResourceType || (exports.ResourceType = ResourceType = {}));
const CheckOwnership = (config) => (0, common_1.SetMetadata)(exports.OWNERSHIP_KEY, config);
exports.CheckOwnership = CheckOwnership;
//# sourceMappingURL=ownership.decorator.js.map