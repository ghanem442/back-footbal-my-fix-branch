import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  APP_NAME: Joi.string().default('Football Field Booking API'),
  ENABLE_SWAGGER: Joi.boolean().default(true),

  // Database
  DATABASE_URL: Joi.string().required(),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().default(0),

  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),

  // OAuth - Google
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().optional(),
  GOOGLE_CALLBACK_URL: Joi.string().optional(),

  // OAuth - Facebook
  FACEBOOK_APP_ID: Joi.string().optional(),
  FACEBOOK_APP_SECRET: Joi.string().optional(),
  FACEBOOK_CALLBACK_URL: Joi.string().optional(),

  // Payment Gateways
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

  // SMS - Twilio
  TWILIO_ACCOUNT_SID: Joi.string().optional(),
  TWILIO_AUTH_TOKEN: Joi.string().optional(),
  TWILIO_PHONE_NUMBER: Joi.string().optional(),

  // Email - SendGrid
  SENDGRID_API_KEY: Joi.string().optional(),
  SENDGRID_FROM_EMAIL: Joi.string().email().optional(),
  SENDGRID_FROM_NAME: Joi.string().optional(),

  // Email - SMTP (Gmail)
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().optional(),
  SMTP_USER: Joi.string().email().optional(),
  SMTP_PASS: Joi.string().optional(),
  SMTP_FROM_EMAIL: Joi.string().email().optional(),
  SMTP_FROM_NAME: Joi.string().optional(),

  // Firebase Cloud Messaging
  FCM_PROJECT_ID: Joi.string().optional(),
  FCM_PRIVATE_KEY: Joi.string().optional(),
  FCM_CLIENT_EMAIL: Joi.string().email().optional(),

  // Storage
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

  // System Configuration
  DEPOSIT_PERCENTAGE: Joi.number().min(0).max(100).default(20),
  // Commission rate is percentage of DEPOSIT (not total price)
  GLOBAL_COMMISSION_RATE: Joi.number().min(0).max(100).default(50),
  BOOKING_TIMEOUT_MINUTES: Joi.number().min(1).default(15),
  NO_SHOW_THRESHOLD_MINUTES: Joi.number().min(1).default(30),
  REMINDER_HOURS_BEFORE: Joi.number().min(1).default(2),
});
