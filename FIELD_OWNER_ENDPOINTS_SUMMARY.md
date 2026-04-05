# Field Owner Endpoints Summary

## 1. POST /fields Response

Based on code analysis:

```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "ownerId": "owner-user-id-from-jwt",
    "name": "Field Name",
    "nameAr": null,
    "description": "Field description",
    "descriptionAr": null,
    "address": "Field address",
    "addressAr": null,
    "latitude": 30.0444,
    "longitude": 31.2357,
    "basePrice": "450.00",
    "commissionRate": "10.00",
    "averageRating": 0,
    "totalReviews": 0,
    "deletedAt": null,
    "createdAt": "2026-03-13T04:00:00.000Z",
    "updatedAt": "2026-03-13T04:00:00.000Z"
  },
  "message": {
    "en": "Field created successfully",
    "ar": "تم إنشاء الملعب بنجاح"
  },
  "timestamp": "2026-03-13T04:00:00.000Z"
}
```

### Key Points:
- ✅ `success: true` is returned
- ✅ `id` is returned (UUID)
- ✅ `ownerId` is returned (from JWT, NOT from body)

## 2. Get Owner's Fields Endpoint

```
GET /api/v1/fields?myFields=true
```

With JWT token in Authorization header.

### Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "field-id",
      "ownerId": "owner-id",
      "name": "Field Name",
      "basePrice": "400.00",
      ...
    }
  ],
  "meta": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

## 3. ownerId Source - CRITICAL

```typescript
@Post()
@Roles(Role.FIELD_OWNER)
async createField(
  @CurrentUser('userId') userId: string,  // ← From JWT token
  @Body() createFieldDto: CreateFieldDto,
) {
  const field = await this.fieldsService.createField(userId, createFieldDto);
  // userId is extracted from JWT, NOT from request body
}
```

### How it works:
1. User logs in → gets JWT token
2. JWT token contains: `{userId, email, role}`
3. When creating field, `@CurrentUser('userId')` extracts userId from JWT
4. Service saves field with `ownerId = userId` from JWT
5. **Body does NOT contain ownerId** - it's automatic from authentication

### Security:
- ✅ User cannot fake ownerId
- ✅ Field is always created for the logged-in user
- ✅ No way to create field for another user

## Testing POST /fields

### Request:
```http
POST /api/v1/fields
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "name": "My Field",
  "description": "Field description",
  "address": "123 Street, City",
  "latitude": 30.0444,
  "longitude": 31.2357,
  "basePrice": 400,
  "commissionRate": 10
}
```

### Important:
- ❌ Do NOT send `ownerId` in body
- ✅ ownerId is extracted from JWT automatically
- ✅ Must have `FIELD_OWNER` role
- ✅ Must be authenticated (valid JWT token)

## Common Issues

### Issue 1: 401 Unauthorized
**Cause:** Invalid or missing JWT token
**Solution:** Login first, get fresh token

### Issue 2: 403 Forbidden
**Cause:** User role is not FIELD_OWNER
**Solution:** Use account with FIELD_OWNER role

### Issue 3: Field created but not showing in myFields
**Cause:** ownerId not saved correctly
**Check:** 
- JWT token is valid
- @CurrentUser decorator is working
- Service is receiving userId parameter

## Flutter Integration

When creating field from Flutter:

```dart
final token = await getToken(); // From secure storage

final response = await http.post(
  Uri.parse('$baseUrl/fields'),
  headers: {
    'Authorization': 'Bearer $token',
    'Content-Type': 'application/json',
  },
  body: jsonEncode({
    'name': fieldName,
    'description': description,
    'address': address,
    'latitude': latitude,
    'longitude': longitude,
    'basePrice': basePrice,
  }),
);

// Do NOT send ownerId - it's automatic!
```

## Verification Steps

After creating field:

1. Check response has `success: true`
2. Check response has `data.id`
3. Check response has `data.ownerId`
4. Verify `data.ownerId` matches logged-in user ID
5. Call `GET /fields?myFields=true` to verify field appears
6. Check `data.basePrice` is saved correctly
