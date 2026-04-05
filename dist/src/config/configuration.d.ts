declare const _default: () => {
    app: {
        nodeEnv: string;
        port: number;
        name: string;
        frontendUrl: string;
    };
    database: {
        url: string | undefined;
    };
    redis: {
        host: string;
        port: number;
        password: string | undefined;
        db: number;
    };
    jwt: {
        secret: string | undefined;
        refreshSecret: string | undefined;
        accessExpiration: string;
        refreshExpiration: string;
    };
    oauth: {
        google: {
            clientId: string | undefined;
            clientSecret: string | undefined;
            callbackUrl: string | undefined;
        };
        facebook: {
            appId: string | undefined;
            appSecret: string | undefined;
            callbackUrl: string | undefined;
        };
    };
    payment: {
        stripe: {
            secretKey: string | undefined;
            webhookSecret: string | undefined;
        };
        fawry: {
            merchantCode: string | undefined;
            secretKey: string | undefined;
        };
        vodafone: {
            merchantId: string | undefined;
            secretKey: string | undefined;
        };
        instapay: {
            merchantId: string | undefined;
            secretKey: string | undefined;
        };
    };
    sms: {
        twilio: {
            accountSid: string | undefined;
            authToken: string | undefined;
            phoneNumber: string | undefined;
        };
    };
    email: {
        sendgrid: {
            apiKey: string | undefined;
            fromEmail: string | undefined;
            fromName: string | undefined;
        };
    };
    fcm: {
        projectId: string | undefined;
        privateKey: string | undefined;
        clientEmail: string | undefined;
    };
    storage: {
        provider: string;
        s3: {
            bucket: string | undefined;
            region: string | undefined;
            accessKeyId: string | undefined;
            secretAccessKey: string | undefined;
        };
        cloudinary: {
            cloudName: string | undefined;
            apiKey: string | undefined;
            apiSecret: string | undefined;
        };
    };
    system: {
        depositPercentage: number;
        globalCommissionRate: number;
        bookingTimeoutMinutes: number;
        noShowThresholdMinutes: number;
        reminderHoursBefore: number;
    };
};
export default _default;
