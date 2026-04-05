-- Create Admin User Directly in Database
-- Use this if the API registration doesn't work or you need to upgrade an existing user

-- Option 1: Create new admin user
-- Note: You'll need to hash the password using bcrypt with salt rounds 10
-- Password: Admin@123456
-- Hashed: $2b$10$YourHashedPasswordHere

INSERT INTO "User" (
    id,
    email,
    name,
    "passwordHash",
    role,
    "isVerified",
    "emailVerifiedAt",
    "createdAt",
    "updatedAt"
) VALUES (
    gen_random_uuid(),
    'admin@fieldbook.com',
    'System Admin',
    '$2b$10$rQZ5YJKvX8xGJ0qVZ5YJKvX8xGJ0qVZ5YJKvX8xGJ0qVZ5YJKvX8xG', -- Replace with actual hash
    'ADMIN',
    true,
    NOW(),
    NOW(),
    NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Option 2: Upgrade existing user to admin
UPDATE "User" 
SET 
    role = 'ADMIN',
    "isVerified" = true,
    "emailVerifiedAt" = NOW()
WHERE email = 'admin@fieldbook.com';

-- Option 3: Make any existing user an admin (replace email)
UPDATE "User" 
SET role = 'ADMIN'
WHERE email = 'your-email@example.com';

-- Verify the admin user was created/updated
SELECT 
    id,
    email,
    name,
    role,
    "isVerified",
    "createdAt"
FROM "User"
WHERE role = 'ADMIN';
