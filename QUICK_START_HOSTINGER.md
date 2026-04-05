# Quick Start: Hostinger Object Storage

## 5-Minute Setup Guide

### Step 1: Get Hostinger Credentials (2 minutes)

1. Log in to [Hostinger](https://www.hostinger.com)
2. Go to **Object Storage** section
3. Create a new bucket (e.g., `football-booking-uploads`)
4. Generate access keys
5. Copy the credentials

### Step 2: Update Environment Variables (1 minute)

Add to your `.env` file:

```bash
STORAGE_PROVIDER=hostinger
HOSTINGER_ENDPOINT=https://your-region.hostinger.com
HOSTINGER_BUCKET=football-booking-uploads
HOSTINGER_ACCESS_KEY=your-access-key-here
HOSTINGER_SECRET_KEY=your-secret-key-here
HOSTINGER_REGION=your-region
HOSTINGER_PUBLIC_URL=https://football-booking-uploads.your-region.hostinger.com
```

### Step 3: Test Connection (1 minute)

```bash
node test-hostinger-storage.js
```

Expected output:
```
✅ All required environment variables are set
✅ S3 client initialized
✅ Connection successful!
✅ File uploaded successfully!
✅ File deleted successfully!
✅ All tests passed!
```

### Step 4: Start Application (1 minute)

```bash
npm run start:dev
```

Check logs for:
```
[StorageService] Using Hostinger Object Storage Provider
```

### Step 5: Test Upload (Optional)

```bash
curl -X POST http://localhost:3000/api/v1/fields/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-image.jpg"
```

## That's It! 🎉

Your application is now using Hostinger Object Storage.

## Common Issues

### Issue: "Connection refused"
**Solution:** Check `HOSTINGER_ENDPOINT` includes `https://`

### Issue: "Access Denied"
**Solution:** Verify access key and secret key are correct

### Issue: "Bucket not found"
**Solution:** Ensure bucket name matches exactly (case-sensitive)

## Cost Estimate

For a small app (50GB storage, 200GB bandwidth):
- **Hostinger:** ~$5-10/month
- **AWS S3:** ~$20-25/month
- **Savings:** 50-70%

## Need Help?

- 📖 Full Guide: `HOSTINGER_STORAGE_SETUP.md`
- 🔍 Comparison: `STORAGE_PROVIDERS_COMPARISON.md`
- 💻 Code Changes: `CODE_CHANGES_SUMMARY.md`

## Switch Back Anytime

To switch back to local storage:
```bash
STORAGE_PROVIDER=local
```

No code changes needed!
