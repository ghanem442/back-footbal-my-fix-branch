"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeSlotsModule = void 0;
const common_1 = require("@nestjs/common");
const time_slots_controller_1 = require("./time-slots.controller");
const time_slots_service_1 = require("./time-slots.service");
const prisma_module_1 = require("../prisma/prisma.module");
const i18n_module_1 = require("../i18n/i18n.module");
let TimeSlotsModule = class TimeSlotsModule {
};
exports.TimeSlotsModule = TimeSlotsModule;
exports.TimeSlotsModule = TimeSlotsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, i18n_module_1.I18nModule],
        controllers: [time_slots_controller_1.TimeSlotsController],
        providers: [time_slots_service_1.TimeSlotsService],
        exports: [time_slots_service_1.TimeSlotsService],
    })
], TimeSlotsModule);
//# sourceMappingURL=time-slots.module.js.map