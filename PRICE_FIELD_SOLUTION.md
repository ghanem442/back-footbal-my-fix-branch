# حل مشكلة السعر في Field

## المشكلة
Flutter app بيدور على `basePrice` في Field object:
```dart
final price = field.basePrice;
if (price == null) return '—';
```

لكن Field model مفيهوش أي price field، السعر موجود بس في TimeSlot.

## الحلول المتاحة

### Option 1: إضافة basePrice للـ Field Model ⭐ (موصى به)

إضافة `basePrice` كـ field في Field model عشان يكون السعر الأساسي/الافتراضي للملعب.

**1. تعديل Prisma Schema:**

```prisma
model Field {
  id              String                     @id @default(uuid())
  ownerId         String
  name            String
  nameAr          String?
  description     String?
  descriptionAr   String?
  location        Unsupported("geography")?
  address         String
  addressAr       String?
  latitude        Float?
  longitude       Float?
  basePrice       Decimal?                   @db.Decimal(10, 2)  // ← إضافة هذا السطر
  commissionRate  Decimal?                   @db.Decimal(5, 2)
  averageRating   Float?
  totalReviews    Int                        @default(0)
  deletedAt       DateTime?
  createdAt       DateTime                   @default(now())
  updatedAt       DateTime                   @updatedAt

  owner      User         @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  timeSlots  TimeSlot[]
  bookings   Booking[]
  reviews    Review[]
  images     FieldImage[]

  @@index([ownerId])
}
```

**2. إنشاء Migration:**

```bash
npx prisma migrate dev --name add_base_price_to_field
```

**3. تحديث CreateFieldDto:**

```typescript
// src/modules/fields/dto/create-field.dto.ts
export class CreateFieldDto {
  // ... existing fields ...
  
  @ApiProperty({
    description: 'Base price per hour for the field',
    example: 400,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;
}
```

**4. تحديث UpdateFieldDto:**

```typescript
// src/modules/fields/dto/update-field.dto.ts
export class UpdateFieldDto extends PartialType(CreateFieldDto) {
  // basePrice will be included automatically
}
```

**مميزات هذا الحل:**
- ✅ السعر يظهر مباشرة في GET /fields
- ✅ السعر يظهر في GET /fields/:id
- ✅ Flutter app يشتغل بدون تعديل
- ✅ يمكن استخدام basePrice كسعر افتراضي عند إنشاء TimeSlots

---

### Option 2: إرجاع أقل سعر من TimeSlots

تعديل الـ service عشان يحسب أقل سعر من TimeSlots ويرجعه مع Field.

**تعديل fields.service.ts:**

```typescript
async findAll(queryDto: QueryFieldsDto, ownerId?: string) {
  const { page = 1, limit = 10 } = queryDto;
  const skip = (page - 1) * limit;

  const where: any = { deletedAt: null };
  if (ownerId) {
    where.ownerId = ownerId;
  }

  const total = await this.prisma.field.count({ where });

  const fields = await this.prisma.field.findMany({
    where,
    include: {
      images: {
        orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }],
        take: 1,
      },
      owner: {
        select: {
          id: true,
          email: true,
          phoneNumber: true,
        },
      },
      timeSlots: {
        select: {
          price: true,
        },
        orderBy: {
          price: 'asc',
        },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
  });

  // Add basePrice from minimum TimeSlot price
  const fieldsWithPrice = fields.map(field => {
    const basePrice = field.timeSlots[0]?.price || null;
    const { timeSlots, ...fieldData } = field;
    return {
      ...fieldData,
      basePrice,
    };
  });

  return {
    data: fieldsWithPrice,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async getFieldDetails(id: string) {
  const field = await this.prisma.field.findUnique({
    where: { id, deletedAt: null },
    include: {
      images: {
        orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }],
      },
      owner: {
        select: {
          id: true,
          email: true,
          phoneNumber: true,
        },
      },
      timeSlots: {
        select: {
          price: true,
        },
        orderBy: {
          price: 'asc',
        },
        take: 1,
      },
    },
  });

  if (!field) {
    throw new NotFoundException(
      await this.i18n.translate('field.notFound'),
    );
  }

  const basePrice = field.timeSlots[0]?.price || null;
  const { timeSlots, ...fieldData } = field;

  return {
    ...fieldData,
    basePrice,
  };
}
```

**مميزات:**
- ✅ لا يحتاج migration
- ✅ السعر يُحسب تلقائياً من TimeSlots

**عيوب:**
- ❌ أبطأ (query إضافي)
- ❌ لو مفيش TimeSlots، السعر يكون null

---

### Option 3: إنشاء endpoint منفصل للأسعار

إنشاء endpoint جديد يرجع الأسعار المتاحة للملعب.

```typescript
// GET /fields/:id/pricing
async getFieldPricing(@Param('id') id: string) {
  const timeSlots = await this.prisma.timeSlot.findMany({
    where: {
      fieldId: id,
      date: { gte: new Date() },
    },
    select: {
      price: true,
    },
    distinct: ['price'],
    orderBy: {
      price: 'asc',
    },
  });

  const prices = timeSlots.map(slot => slot.price);
  const minPrice = prices[0] || null;
  const maxPrice = prices[prices.length - 1] || null;

  return {
    success: true,
    data: {
      minPrice,
      maxPrice,
      availablePrices: prices,
    },
  };
}
```

**عيوب:**
- ❌ يحتاج تعديل Flutter app
- ❌ request إضافي

---

## التوصية النهائية

**استخدم Option 1** (إضافة basePrice للـ Field):

1. أسرع في الأداء
2. أبسط في الاستخدام
3. Flutter app يشتغل مباشرة
4. يمكن استخدامه كسعر افتراضي

## الخطوات التنفيذية

```bash
# 1. تعديل schema.prisma (أضف basePrice)
# 2. إنشاء migration
npx prisma migrate dev --name add_base_price_to_field

# 3. تحديث DTOs
# 4. اختبار الـ endpoints
```

## Response المتوقع بعد التعديل

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-here",
      "name": "Champions Field",
      "nameAr": "ملعب الأبطال",
      "address": "123 Sports St",
      "basePrice": 400,
      "averageRating": 4.5,
      "totalReviews": 10,
      "images": [
        {
          "url": "https://...",
          "isPrimary": true
        }
      ],
      "owner": {
        "id": "owner-id",
        "email": "owner@example.com"
      }
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```
