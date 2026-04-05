"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationSchema = void 0;
const Joi = __importStar(require("joi"));
exports.validationSchema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    PORT: Joi.number().default(3000),
    APP_NAME: Joi.string().default('Football Field Booking API'),
    ENABLE_SWAGGER: Joi.boolean().default(true),
    DATABASE_URL: Joi.string().required(),
    REDIS_HOST: Joi.string().default('localhost'),
    REDIS_PORT: Joi.number().default(6379),
    REDIS_PASSWORD: Joi.string().allow('').optional(),
    REDIS_DB: Joi.number().default(0),
    JWT_SECRET: Joi.string().required(),
    JWT_REFRESH_SECRET: Joi.string().required(),
    JWT_ACCESS_EXPIRATION: Joi.string().default('15m'),
    JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),
    GOOGLE_CLIENT_ID: Joi.string().optional(),
    GOOGLE_CLIENT_SECRET: Joi.string().optional(),
    GOOGLE_CALLBACK_URL: Joi.string().optional(),
    FACEBOOK_APP_ID: Joi.string().optional(),
    FACEBOOK_APP_SECRET: Joi.string().optional(),
    FACEBOOK_CALLBACK_URL: Joi.string().optional(),
    STRIPE_SECRET_KEY: Joi.string().optional(),
    STRIPE_WEBHOOK_SECRET: Joi.string().optional(),
    PAYMOB_API_KEY: Joi.string().optional(),
    PAYMOB_INTEGRATION_ID: Joi.string().optional(),
    PAYMOB_IFRAME_ID: Joi.string().optional(),
    PAYMOB_HMAC_SECRET: Joi.string().allow('').optional(),
    FAWRY_MERCHANT_CODE: Joi.string().optional(),
    FAWRY_SECRET_KEY: Joi.string().optional(),
    VODAFONE_MERCHANT_ID: Joi.string().optional(),
    VODAFONE_SECRET_KEY: Joi.string().optional(),
    INSTAPAY_MERCHANT_ID: Joi.string().optional(),
    INSTAPAY_SECRET_KEY: Joi.string().optional(),
    NGROK_URL: Joi.string().uri().allow('').optional(),
    TWILIO_ACCOUNT_SID: Joi.string().optional(),
    TWILIO_AUTH_TOKEN: Joi.string().optional(),
    TWILIO_PHONE_NUMBER: Joi.string().optional(),
    SENDGRID_API_KEY: Joi.string().optional(),
    SENDGRID_FROM_EMAIL: Joi.string().email().optional(),
    SENDGRID_FROM_NAME: Joi.string().optional(),
    SMTP_HOST: Joi.string().optional(),
    SMTP_PORT: Joi.number().optional(),
    SMTP_USER: Joi.string().email().optional(),
    SMTP_PASS: Joi.string().optional(),
    SMTP_FROM_EMAIL: Joi.string().email().optional(),
    SMTP_FROM_NAME: Joi.string().optional(),
    FCM_PROJECT_ID: Joi.string().optional(),
    FCM_PRIVATE_KEY: Joi.string().optional(),
    FCM_CLIENT_EMAIL: Joi.string().email().optional(),
    STORAGE_PROVIDER: Joi.string().valid('local', 's3', 'cloudinary', 'hostinger').default('local'),
    AWS_S3_BUCKET: Joi.string().optional(),
    AWS_S3_REGION: Joi.string().optional(),
    AWS_ACCESS_KEY_ID: Joi.string().optional(),
    AWS_SECRET_ACCESS_KEY: Joi.string().optional(),
    CLOUDINARY_CLOUD_NAME: Joi.string().optional(),
    CLOUDINARY_API_KEY: Joi.string().optional(),
    CLOUDINARY_API_SECRET: Joi.string().optional(),
    HOSTINGER_ENDPOINT: Joi.string().uri().optional(),
    HOSTINGER_BUCKET: Joi.string().optional(),
    HOSTINGER_ACCESS_KEY: Joi.string().optional(),
    HOSTINGER_SECRET_KEY: Joi.string().optional(),
    HOSTINGER_REGION: Joi.string().optional(),
    HOSTINGER_PUBLIC_URL: Joi.string().uri().optional(),
    DEPOSIT_PERCENTAGE: Joi.number().min(0).max(100).default(20),
    GLOBAL_COMMISSION_RATE: Joi.number().min(0).max(100).default(50),
    BOOKING_TIMEOUT_MINUTES: Joi.number().min(1).default(15),
    NO_SHOW_THRESHOLD_MINUTES: Joi.number().min(1).default(30),
    REMINDER_HOURS_BEFORE: Joi.number().min(1).default(2),
});
//# sourceMappingURL=validation.schema.js.map