export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    name: process.env.APP_NAME || 'Football Field Booking API',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    },
    facebook: {
      appId: process.env.FACEBOOK_APP_ID,
      appSecret: process.env.FACEBOOK_APP_SECRET,
      callbackUrl: process.env.FACEBOOK_CALLBACK_URL,
    },
  },
  payment: {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
    fawry: {
      merchantCode: process.env.FAWRY_MERCHANT_CODE,
      secretKey: process.env.FAWRY_SECRET_KEY,
    },
    vodafone: {
      merchantId: process.env.VODAFONE_MERCHANT_ID,
      secretKey: process.env.VODAFONE_SECRET_KEY,
    },
    instapay: {
      merchantId: process.env.INSTAPAY_MERCHANT_ID,
      secretKey: process.env.INSTAPAY_SECRET_KEY,
    },
  },
  sms: {
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    },
  },
  email: {
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
      fromEmail: process.env.SENDGRID_FROM_EMAIL,
      fromName: process.env.SENDGRID_FROM_NAME,
    },
  },
  fcm: {
    projectId: process.env.FCM_PROJECT_ID,
    privateKey: process.env.FCM_PRIVATE_KEY,
    clientEmail: process.env.FCM_CLIENT_EMAIL,
  },
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local',
    s3: {
      bucket: process.env.AWS_S3_BUCKET,
      region: process.env.AWS_S3_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
    },
  },
  system: {
    depositPercentage: parseInt(process.env.DEPOSIT_PERCENTAGE || '20', 10),
    // Commission rate is percentage of DEPOSIT (not total price)
    // Default 50% means platform gets half of deposit, field owner gets other half in wallet
    globalCommissionRate: parseInt(process.env.GLOBAL_COMMISSION_RATE || '50', 10),
    bookingTimeoutMinutes: parseInt(process.env.BOOKING_TIMEOUT_MINUTES || '15', 10),
    noShowThresholdMinutes: parseInt(process.env.NO_SHOW_THRESHOLD_MINUTES || '30', 10),
    reminderHoursBefore: parseInt(process.env.REMINDER_HOURS_BEFORE || '2', 10),
  },
});
