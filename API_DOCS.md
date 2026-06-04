# API Documentation

## Base URL
http://localhost:4000

## Authentication
ทุก API ที่ต้องการ Token ให้ใส่ Header:
Authorization: Bearer <token>

---

## Auth APIs

### Register
POST /api/register
Body: { "username": "string", "password": "string", "role": "customer" }
Response: { "message": "สมัครสมาชิกสำเร็จ", "user": { "id", "username", "role" } }

### Login
POST /api/login
Body: { "username": "string", "password": "string" }
Response: { "message": "เข้าสู่ระบบสำเร็จ", "token": "JWT_TOKEN" }

---

## Customer APIs (ต้องมี Token)

### ดูโปรเจคของตัวเอง
GET /api/projects
Headers: Authorization: Bearer <token>
Response: [{ "id", "name", "description", "status", "user_id", "created_at" }]

### สร้างโปรเจคใหม่
POST /api/projects
Headers: Authorization: Bearer <token>
Body: { "name": "string", "description": "string" }
Response: { "id", "name", "description", "status", "user_id", "created_at" }

---

## Admin APIs (ต้องมี Token + role: admin)

### ดูทุกโปรเจค
GET /api/admin/projects
Headers: Authorization: Bearer <token>
Response: [{ "id", "name", "description", "status", "user_id", "username", "created_at" }]

### อัปเดตสถานะโปรเจค
PUT /api/admin/projects/:id
Headers: Authorization: Bearer <token>
Body: { "status": "pending | in_progress | completed" }
Response: { "id", "name", "description", "status", "user_id", "created_at" }

### ดู Users ทั้งหมด
GET /api/admin/users
Headers: Authorization: Bearer <token>
Response: [{ "id", "username", "role", "created_at" }]