-- First check existing admins
SELECT id, email, name, role FROM "User" WHERE role = 'ADMIN';
