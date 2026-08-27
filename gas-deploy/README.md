# CL69 — Deploy to Google Apps Script

## ไฟล์ที่ต้องใช้

| ไฟล์ | คำอธิบาย |
|------|----------|
| `Code.gs` | Server-side: อ่านข้อมูลจาก Google Sheet |
| `Index.html` | Client-side: Dashboard UI ทั้งหมด |

## ขั้นตอนการ Deploy

### 1. สร้าง Apps Script Project

1. เปิด [script.google.com](https://script.google.com)
2. กด **New Project**
3. จะได้ไฟล์ `Code.gs` ว่างเปล่า

### 2. คัดลอกไฟล์

1. **Code.gs** — ลบโค้ดเดิมออก แล้ววางเนื้อหาจาก `gas-deploy/Code.gs`
2. **Index.html** — กดปุ่ม **+** แล้วเลือก **HTML** ตั้งชื่อ `Index` (ไม่ต้องใส่ .html) แล้ววางเนื้อหาจาก `gas-deploy/Index.html`

### 3. ตั้งค่า Sheet ID

ใน `Code.gs` ตรวจสอบว่า SHEET ID ถูกต้อง:

```javascript
const SHEET_ID = '1UtSyrAUOXdtRiztXbN4ntobPeS0fMErUrAIeK4NRxcw';
const SHEET_NAME = 'sheet99';
```

### 4. Deploy

1. กดปุ่ม **Deploy** → **New deployment**
2. เลือกประเภท: **Web app**
3. ตั้งค่า:
   - **Description**: CL69 Dashboard
   - **Execute as**: Me (your account)
   - **Who has access**: Anyone (หรือจะจำกัดก็ได้)
4. กด **Deploy**
5. คัดลอก URL ที่ได้ — นี่คือ Dashboard ของคุณ

### 5. อนุญาต Permissions

ครั้งแรกที่ deploy จะต้องกด **Authorize access** เพื่ออนุญาตให้ Apps Script อ่าน Google Sheet ของคุณ

### 6. อัพเดท (เมื่อแก้โค้ด)

1. แก้ไขโค้ดเสร็จแล้ว
2. กด **Deploy** → **Manage deployments**
3. กด **Edit** (ดินสอ) → เลือก **New version**
4. กด **Deploy**

## ฟีเจอร์ที่มี

- ✅ Summary cards (ราคารวม, จำนวนหน่วยงาน, จำนวนรายการ)
- ✅ Plan breakdown (ในแผน, นอกแผน, ทดแทน)
- ✅ Bar chart เลือก dimension ได้ (เดือน, กลุ่มภารกิจ, ฯลฯ)
- ✅ TOP 10 analysis ทุก dimension
- ✅ Data table พร้อม sort ได้ทุกคอลัมน์
- ✅ Search/filter แบบ realtime
- ✅ Pagination
- ✅ Export CSV
- ✅ แสดงปี พ.ศ. แทน ค.ศ.
- ✅ Prompt font จาก Google Fonts

## หมายเหตุ

- ข้อมูลจะโหลดใหม่ทุกครั้งที่เปิดหน้าเว็บ (ไม่มี caching)
- ถ้า Sheet มีข้อมูลเยอะมาก อาจโหลดช้าเล็กน้อย
- Apps Script มี quota: 6 นาที/execution, 90 นาที/day
