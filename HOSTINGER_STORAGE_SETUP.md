# Hostinger Object Storage Setup Guide

## Overview

Hostinger Object Storage is an S3-compatible storage solution that provides a cost-effective alternative to AWS S3. It's particularly suitable for projects with budget constraints while maintaining compatibility with S3 APIs.

## Why Choose Hostinger Object Storage?

### Advantages
- ✅ **Cost-Effective**: Generally cheaper than AWS S3
- ✅ **S3-Compatible**: Works with existing S3 libraries and tools
- ✅ **Simple Pricing**: Predictable costs without complex tiers
- ✅ **Good for Regional Projects**: Excellent for Middle East/European markets
- ✅ **Easy Setup**: Straightforward configuration process

### Considerations
- ⚠️ **Limited Regions**: Fewer data center locations than AWS
- ⚠️ **Smaller Ecosystem**: Less third-party integrations
- ⚠️ **Performance**: May have higher latency for global users

## Setup Instructions

### Step 1: Create Hostinger Object Storage

1. Log in to your Hostinger account
2. Navigate to **Object Storage** section
3. Click **Create New Bucket**
4. Configure your bucket:
   - **Bucket Name**: Choose a unique name (e.g., `football-booking-uploads`)
   - **Region**: Select closest to your users
   - **Access**: Set to Public or Private based on needs

### Step 2: Get Access Credentials

1. Go to **Object Storage** dashboard
2. Click on your bucket
3. Navigate to **Access Keys** or **API Credentials**
4. Generate new access key pair:
   - **Access Key ID**: Similar to AWS Access Key
   - **Secret Access Key**: Similar to AWS Secret Key
5. Save these credentials securely

### Step 3: Configure Environment Variables

Add to your `.env` file:

```bash
# Set storage provider to hostinger
STORAGE_PROVIDER=hostinger

# Hostinger Object Storage Configuration
HOSTINGER_ENDPOINT=https://your-region.hostinger.com
HOSTINGER_BUCKET=football-booking-uploads
HOSTINGER_ACCESS_KEY=your-access-key-id
HOSTINGER_SECRET_KEY=your-secret-access-key
HOSTINGER_REGION=your-region
HOSTINGER_PUBLIC_URL=https://football-booking-uploads.your-region.hostinger.com
```

### Step 4: Update Storage Service Implementation

Since Hostinger is S3-compatible, you can use the AWS SDK. Update your storage service:

#### Install AWS SDK (if not already installed)

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

#### Create Hostinger Storage Service

Create `src/modules/storage/providers/hostinger.storage.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageProvider } from '../interfaces/storage-provider.interface';

@Injectable()
export class HostingerStorageProvider implements StorageProvider {
  private readonly logger = new Logger(HostingerStorageProvider.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('HOSTINGER_ENDPOINT');
    const region = this.config.get<string>('HOSTINGER_REGION', 'auto');
    const accessKey = this.config.get<string>('HOSTINGER_ACCESS_KEY');
    const secretKey = this.config.get<string>('HOSTINGER_SECRET_KEY');

    this.bucket = this.config.get<string>('HOSTINGER_BUCKET', '');
    this.publicUrl = this.config.get<string>('HOSTINGER_PUBLIC_URL', '');

    if (!endpoint || !accessKey || !secretKey || !this.bucket) {
      this.logger.warn('Hostinger Object Storage credentials not configured');
    }

    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId: accessKey!,
        secretAccessKey: secretKey!,
      },
      forcePathStyle: true, // Required for S3-compatible services
    });

    this.logger.log('Hostinger Object Storage initialized');
  }

  async upload(file: Express.Multer.File, path: string): Promise<string> {
    try {
      const key = `${path}/${Date.now()}-${file.originalname}`;

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read', // Make file publicly accessible
      });

      await this.s3Client.send(command);

      const fileUrl = `${this.publicUrl}/${key}`;
      this.logger.log(`File uploaded to Hostinger: ${fileUrl}`);

      return fileUrl;
    } catch (error) {
      this.logger.error('Failed to upload file to Hostinger', error);
      throw new Error('File upload failed');
    }
  }

  async delete(fileUrl: string): Promise<void> {
    try {
      // Extract key from URL
      const key = fileUrl.replace(`${this.publicUrl}/`, '');

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted from Hostinger: ${key}`);
    } catch (error) {
      this.logger.error('Failed to delete file from Hostinger', error);
      throw new Error('File deletion failed');
    }
  }

  async getSignedUrl(fileUrl: string, expiresIn: number = 3600): Promise<string> {
    try {
      const key = fileUrl.replace(`${this.publicUrl}/`, '');

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      this.logger.error('Failed to generate signed URL', error);
      throw new Error('Signed URL generation failed');
    }
  }
}
```

#### Update Storage Module

Update `src/modules/storage/storage.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { LocalStorageProvider } from './providers/local.storage';
import { S3StorageProvider } from './providers/s3.storage';
import { CloudinaryStorageProvider } from './providers/cloudinary.storage';
import { HostingerStorageProvider } from './providers/hostinger.storage';

@Module({
  imports: [ConfigModule],
  providers: [
    StorageService,
    LocalStorageProvider,
    S3StorageProvider,
    CloudinaryStorageProvider,
    HostingerStorageProvider,
    {
      provide: 'STORAGE_PROVIDER',
      useFactory: (
        config: ConfigService,
        local: LocalStorageProvider,
        s3: S3StorageProvider,
        cloudinary: CloudinaryStorageProvider,
        hostinger: HostingerStorageProvider,
      ) => {
        const provider = config.get<string>('STORAGE_PROVIDER', 'local');
        
        switch (provider) {
          case 's3':
            return s3;
          case 'cloudinary':
            return cloudinary;
          case 'hostinger':
            return hostinger;
          case 'local':
          default:
            return local;
        }
      },
      inject: [
        ConfigService,
        LocalStorageProvider,
        S3StorageProvider,
        CloudinaryStorageProvider,
        HostingerStorageProvider,
      ],
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
```

## Testing Hostinger Storage

### Test Upload Script

Create `test-hostinger-upload.js`:

```javascript
const { S3Client, PutObjectCommand, ListBucketsCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
require('dotenv').config();

async function testHostingerUpload() {
  const client = new S3Client({
    endpoint: process.env.HOSTINGER_ENDPOINT,
    region: process.env.HOSTINGER_REGION || 'auto',
    credentials: {
      accessKeyId: process.env.HOSTINGER_ACCESS_KEY,
      secretAccessKey: process.env.HOSTINGER_SECRET_KEY,
    },
    forcePathStyle: true,
  });

  try {
    // Test 1: List buckets
    console.log('Testing connection...');
    const listCommand = new ListBucketsCommand({});
    const buckets = await client.send(listCommand);
    console.log('✅ Connected successfully!');
    console.log('Available buckets:', buckets.Buckets?.map(b => b.Name));

    // Test 2: Upload a test file
    console.log('\nTesting file upload...');
    const testContent = 'Hello from Football Booking API!';
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.HOSTINGER_BUCKET,
      Key: `test/test-${Date.now()}.txt`,
      Body: Buffer.from(testContent),
      ContentType: 'text/plain',
      ACL: 'public-read',
    });

    await client.send(uploadCommand);
    console.log('✅ File uploaded successfully!');
    console.log(`URL: ${process.env.HOSTINGER_PUBLIC_URL}/test/test-${Date.now()}.txt`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Details:', error);
  }
}

testHostingerUpload();
```

Run the test:

```bash
node test-hostinger-upload.js
```

## CORS Configuration

If you're accessing files from a web browser, configure CORS on your Hostinger bucket:

### Via Hostinger Dashboard

1. Go to your bucket settings
2. Find **CORS Configuration**
3. Add the following policy:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

### For Production (Restrict Origins)

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "https://yourdomain.com",
        "https://app.yourdomain.com"
      ],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

## Bucket Policy (Public Access)

To make uploaded files publicly accessible:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

## Cost Comparison

### Hostinger Object Storage
- **Storage**: ~$0.01-0.02 per GB/month
- **Bandwidth**: Often included or very low cost
- **Requests**: Usually included in package

### AWS S3 (for comparison)
- **Storage**: $0.023 per GB/month (Standard)
- **Bandwidth**: $0.09 per GB (first 10TB)
- **Requests**: $0.0004 per 1,000 GET requests

### Cloudinary (for comparison)
- **Free Tier**: 25GB storage, 25GB bandwidth
- **Paid Plans**: Start at $89/month

## Migration from Other Providers

### From AWS S3 to Hostinger

```bash
# Using AWS CLI with S3-compatible endpoint
aws s3 sync s3://aws-bucket-name s3://hostinger-bucket-name \
  --endpoint-url https://your-region.hostinger.com \
  --profile hostinger
```

### From Local Storage to Hostinger

```javascript
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

async function migrateLocalToHostinger() {
  const client = new S3Client({
    endpoint: process.env.HOSTINGER_ENDPOINT,
    region: process.env.HOSTINGER_REGION,
    credentials: {
      accessKeyId: process.env.HOSTINGER_ACCESS_KEY,
      secretAccessKey: process.env.HOSTINGER_SECRET_KEY,
    },
    forcePathStyle: true,
  });

  const uploadsDir = './uploads';
  const files = fs.readdirSync(uploadsDir, { recursive: true });

  for (const file of files) {
    const filePath = path.join(uploadsDir, file);
    if (fs.statSync(filePath).isFile()) {
      const fileContent = fs.readFileSync(filePath);
      
      await client.send(new PutObjectCommand({
        Bucket: process.env.HOSTINGER_BUCKET,
        Key: file,
        Body: fileContent,
        ACL: 'public-read',
      }));
      
      console.log(`Migrated: ${file}`);
    }
  }
}

migrateLocalToHostinger();
```

## Troubleshooting

### Common Issues

#### 1. Connection Refused
```
Error: connect ECONNREFUSED
```
**Solution**: Verify `HOSTINGER_ENDPOINT` is correct and includes `https://`

#### 2. Access Denied
```
Error: AccessDenied: Access Denied
```
**Solution**: Check access key credentials and bucket permissions

#### 3. Invalid Bucket Name
```
Error: InvalidBucketName
```
**Solution**: Bucket names must be lowercase, no spaces, 3-63 characters

#### 4. CORS Errors in Browser
```
Error: CORS policy blocked
```
**Solution**: Configure CORS policy in Hostinger dashboard

### Debug Mode

Enable detailed logging:

```typescript
this.s3Client = new S3Client({
  endpoint,
  region,
  credentials: {
    accessKeyId: accessKey!,
    secretAccessKey: secretKey!,
  },
  forcePathStyle: true,
  logger: console, // Enable debug logging
});
```

## Best Practices

1. **Use Environment Variables**: Never hardcode credentials
2. **Enable Versioning**: Protect against accidental deletions
3. **Set Lifecycle Rules**: Auto-delete old files to save costs
4. **Use CDN**: Consider Cloudflare or similar for better performance
5. **Monitor Usage**: Track storage and bandwidth usage regularly
6. **Backup Important Data**: Don't rely solely on object storage
7. **Use Signed URLs**: For private/sensitive files
8. **Optimize Images**: Compress before uploading to save space

## Additional Resources

- [Hostinger Object Storage Documentation](https://www.hostinger.com/tutorials/object-storage)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [S3 API Compatibility](https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html)

---

**Note**: Hostinger Object Storage is S3-compatible, so most S3 tools and libraries work seamlessly with minimal configuration changes.
