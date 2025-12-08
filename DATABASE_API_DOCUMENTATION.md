# Database API Documentation

This document tracks all database interactions (CRUD operations) and endpoints used in the CrashProject application.

**Last Updated:** 2024

---

## Table of Contents

1. [Database Tables](#database-tables)
2. [RPC Functions](#rpc-functions)
3. [Real-time Subscriptions](#real-time-subscriptions)
4. [Storage Operations](#storage-operations)
5. [CRUD Operations by Table](#crud-operations-by-table)

---

## Database Tables

### 1. `tbl_users`
**Purpose:** Stores user account information

**Fields:**
- `user_id` (UUID, Primary Key)
- `email` (VARCHAR, Unique)
- `phone` (VARCHAR, Unique)
- `password_hash` (VARCHAR)
- `first_name` (VARCHAR)
- `last_name` (VARCHAR)
- `birthdate` (DATE)
- `sex` (VARCHAR)
- `emergency_contact_name` (VARCHAR)
- `emergency_contact_number` (VARCHAR)
- `region` (VARCHAR)
- `city` (VARCHAR)
- `barangay` (VARCHAR)
- `created_at` (TIMESTAMP)

### 2. `tbl_reports`
**Purpose:** Stores emergency reports and cases

**Fields:**
- `report_id` (UUID, Primary Key)
- `reporter_id` (UUID, Foreign Key → tbl_users.user_id)
- `assigned_office_id` (UUID, Foreign Key → tbl_police_offices.office_id)
- `category` (VARCHAR)
- `description` (TEXT)
- `status` (ENUM: 'pending', 'assigned', 'investigating', 'resolved', 'closed')
- `latitude` (NUMERIC)
- `longitude` (NUMERIC)
- `location_city` (VARCHAR)
- `location_barangay` (VARCHAR)
- `remarks` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### 3. `tbl_messages`
**Purpose:** Stores chat messages between users and police offices

**Fields:**
- `message_id` (UUID, Primary Key)
- `report_id` (UUID, Foreign Key → tbl_reports.report_id)
- `sender_id` (UUID)
- `sender_type` (ENUM: 'user', 'police_office', 'admin')
- `receiver_id` (UUID)
- `message_content` (TEXT)
- `timestamp` (TIMESTAMP)

### 4. `tbl_media`
**Purpose:** Stores media file metadata for reports

**Fields:**
- `media_id` (UUID, Primary Key)
- `file_url` (VARCHAR)
- `report_id` (UUID, Foreign Key → tbl_reports.report_id)
- `file_type` (ENUM: 'image', 'video', 'audio')
- `sender_id` (UUID)
- `uploaded_at` (TIMESTAMP)

### 5. `tbl_police_offices`
**Purpose:** Stores police office information

**Fields:**
- `office_id` (UUID, Primary Key)
- `office_name` (VARCHAR)
- `head_officer` (VARCHAR)
- `contact_number` (VARCHAR)
- `latitude` (NUMERIC)
- `longitude` (NUMERIC)
- `created_by` (UUID, Foreign Key → tbl_admin.admin_id)
- `created_at` (TIMESTAMP)

---

## RPC Functions

### 1. `create_emergency_sos`
**Location:** `app/screens/Home/Home.tsx` (line 331)

**Purpose:** Creates an emergency SOS report and automatically assigns it to the nearest police office

**Parameters:**
- `p_user_id` (UUID): User ID of the reporter
- `p_lat` (FLOAT): Latitude of the emergency location
- `p_long` (FLOAT): Longitude of the emergency location
- `p_category` (TEXT): Category of the emergency (default: 'Emergency')
- `p_description` (TEXT): Description of the emergency

**Returns:**
- `report_id` (UUID): ID of the created report
- `assigned_office_id` (UUID): ID of the assigned police office
- `assigned_office_name` (TEXT): Name of the assigned police office
- `message` (TEXT): Success message

**Usage:**
```typescript
const { data, error } = await supabase.rpc('create_emergency_sos', {
  p_user_id: reporterId,
  p_lat: latitude,
  p_long: longitude,
  p_category: 'Emergency',
  p_description: description,
});
```

---

## Real-time Subscriptions

### 1. Active Case Changes
**Location:** `app/hooks/useActiveCase.ts` (line 206)

**Channel:** `active-case-changes`

**Table:** `tbl_reports`

**Events:** All changes (`*`)

**Purpose:** Monitors report status changes to update active case and notifications

**Filter:** None (listens to all report changes)

---

### 2. Messages Subscription
**Location:** `app/screens/Home/ChatScreen.tsx` (line 117)

**Channel:** `messages-{report_id}`

**Table:** `tbl_messages`

**Events:** `INSERT`

**Purpose:** Real-time message updates for a specific report

**Filter:** `report_id=eq.{report_id}`

---

## Storage Operations

### Storage Bucket: `crash-media`

**Purpose:** Stores media files (images, videos, audio) for reports

**Operations:**
1. **Upload:** Upload media files to storage bucket
2. **Delete:** Remove media files when report is cancelled

**Path Format:** `reports/{report_id}/{timestamp}_{filename}`

---

## CRUD Operations by Table

---

### `tbl_users`

#### CREATE

**1. User Registration**
- **Location:** `app/screens/AccessPoint/components/Register/Register.tsx` (line 532)
- **Operation:** `INSERT`
- **Fields Used:**
  - `user_id` (from Supabase auth)
  - `email`
  - `phone`
  - `password_hash`
  - `first_name`
  - `last_name`
  - `birthdate`
  - `sex`
  - `emergency_contact_name`
  - `emergency_contact_number`
  - `region`
  - `city`
  - `barangay`
  - `created_at`

#### READ

**1. Get User by User ID**
- **Location:** Multiple files
- **Operation:** `SELECT`
- **Filter:** `user_id = {authUserId}`
- **Fields Selected:** `*` or specific fields
- **Used In:**
  - `app/contexts/AuthContext.tsx` (line 48)
  - `app/hooks/useActiveCase.ts` (line 42)
  - `app/screens/Home/Home.tsx` (line 238)
  - `app/screens/Home/Profile.tsx` (line 110)
  - `app/screens/Home/Report.tsx` (line 146)
  - `app/utils/sessionRestoration.ts` (line 46)

**2. Get User by Email**
- **Location:** Multiple files
- **Operation:** `SELECT`
- **Filter:** `email = {userEmail}`
- **Fields Selected:** `*` or specific fields
- **Used In:**
  - `app/contexts/AuthContext.tsx` (line 63)
  - `app/hooks/useActiveCase.ts` (line 51)
  - `app/screens/AccessPoint/components/Login/Login.tsx` (line 91)
  - `app/screens/Home/Home.tsx` (line 252)
  - `app/screens/Home/Profile.tsx` (line 136)
  - `app/screens/Home/Report.tsx` (line 177)
  - `app/utils/sessionRestoration.ts` (line 59)

**3. Get User Location Fields**
- **Location:** `app/screens/Home/Report.tsx` (line 146, 177, 209)
- **Operation:** `SELECT`
- **Filter:** `user_id = {session.user.id}`
- **Fields Selected:** `barangay, city, region`

#### UPDATE

**1. Update User Profile**
- **Location:** `app/screens/Home/Profile.tsx` (line 319)
- **Operation:** `UPDATE`
- **Filter:** `email = {profileData.email}`
- **Fields Updated:**
  - `first_name`
  - `last_name`
  - `sex`
  - `birthdate`
  - `phone`
  - `emergency_contact_name`
  - `emergency_contact_number`
  - `region`
  - `city`
  - `barangay`

#### DELETE
- **Not implemented** (users are not deleted from the app)

---

### `tbl_reports`

#### CREATE

**1. Create Report (Manual)**
- **Location:** `app/screens/Home/Report.tsx` (line 743)
- **Operation:** `INSERT`
- **Fields Used:**
  - `reporter_id`
  - `assigned_office_id` (null initially)
  - `category`
  - `description`
  - `status` ('pending')
  - `latitude`
  - `longitude`
  - `location_city`
  - `location_barangay`
  - `remarks`
  - `created_at`
  - `updated_at`

**2. Create Emergency SOS (via RPC)**
- **Location:** `app/screens/Home/Home.tsx` (line 331)
- **Operation:** `RPC: create_emergency_sos`
- **Auto-assigns:** Nearest police office based on Haversine distance calculation

#### READ

**1. Get Active Case**
- **Location:** `app/hooks/useActiveCase.ts` (line 69)
- **Operation:** `SELECT`
- **Filter:** `reporter_id = {reporterId}`
- **Fields Selected:**
  - `report_id`
  - `reporter_id`
  - `assigned_office_id`
  - `category`
  - `description`
  - `status`
  - `latitude`
  - `longitude`
  - `remarks`
  - `created_at`
  - `updated_at`
- **Order:** `created_at DESC`
- **Filter Logic:** Status must be 'pending' or 'responding'

**2. Get Notifications**
- **Location:** `app/hooks/useActiveCase.ts` (line 164)
- **Operation:** `SELECT`
- **Filter:** 
  - `reporter_id = {reporterId}`
  - `status IN ('pending', 'assigned', 'investigating', 'resolved', 'closed')`
- **Fields Selected:** Same as active case
- **Order:** `updated_at DESC`
- **Limit:** 20

**3. Get Report by Report ID**
- **Location:** `app/screens/Home/ChatScreen.tsx` (line 70)
- **Operation:** `SELECT`
- **Filter:** `report_id = {report_id}`
- **Fields Selected:** `assigned_office_id`
- **Purpose:** Get receiver_id for messages

**4. Check Active Report (Session Restoration)**
- **Location:** `app/utils/sessionRestoration.ts` (line 79)
- **Operation:** `SELECT`
- **Filter:** 
  - `reporter_id = {reporterId}`
  - `status IN ('pending', 'responding')`
- **Order:** `created_at DESC`
- **Limit:** 1

**5. Get Reports for SOS Check**
- **Location:** `app/screens/Home/Home.tsx` (line 472)
- **Operation:** `SELECT`
- **Filter:** 
  - `reporter_id = {reporterId}`
  - `status IN ('pending', 'responding')`
- **Order:** `created_at DESC`
- **Limit:** 1

#### UPDATE
- **Not implemented in app** (status updates likely handled by admin/police dashboard)

#### DELETE

**1. Cancel/Delete Report**
- **Location:** `app/hooks/useActiveCase.ts` (line 288)
- **Operation:** `DELETE`
- **Filter:** `report_id = {reportId}`
- **Cascade:** Also deletes associated messages and media files
- **Pre-delete Operations:**
  1. Fetch all media files for the report
  2. Delete media files from storage bucket
  3. Delete messages from `tbl_messages`
  4. Delete report from `tbl_reports`

---

### `tbl_messages`

#### CREATE

**1. Send Message**
- **Location:** `app/screens/Home/ChatScreen.tsx` (line 190)
- **Operation:** `INSERT`
- **Fields Used:**
  - `report_id`
  - `sender_id` (from Supabase auth session)
  - `sender_type` ('user')
  - `receiver_id` (from report's assigned_office_id)
  - `message_content`
  - `timestamp`

**2. Send Message (Chat Modal)**
- **Location:** `app/screens/AccessPoint/components/Chatsystem/ChatModal.tsx` (line 140)
- **Operation:** `INSERT`
- **Fields Used:** Same as above

**3. Send Message (SOS Chat Modal)**
- **Location:** `app/screens/AccessPoint/components/Chatsystem/SOSChatModal.tsx` (line 150)
- **Operation:** `INSERT`
- **Fields Used:** Same as above

#### READ

**1. Load Messages**
- **Location:** `app/screens/Home/ChatScreen.tsx` (line 89)
- **Operation:** `SELECT`
- **Filter:** `report_id = {report_id}`
- **Fields Selected:** `*`
- **Order:** `timestamp ASC`

**2. Load Messages (Chat Modal)**
- **Location:** `app/screens/AccessPoint/components/Chatsystem/ChatModal.tsx` (line 80)
- **Operation:** `SELECT`
- **Filter:** `report_id = {activeCase.report_id}`
- **Fields Selected:** `*`
- **Order:** `timestamp ASC`

**3. Load Messages (SOS Chat Modal)**
- **Location:** `app/screens/AccessPoint/components/Chatsystem/SOSChatModal.tsx` (line 79)
- **Operation:** `SELECT`
- **Filter:** `report_id = {activeCase.report_id}`
- **Fields Selected:** `*`
- **Order:** `timestamp ASC`

#### UPDATE
- **Not implemented** (messages are immutable)

#### DELETE

**1. Delete Messages on Report Cancellation**
- **Location:** `app/hooks/useActiveCase.ts` (line 275)
- **Operation:** `DELETE`
- **Filter:** `report_id = {reportId}`
- **Purpose:** Cascade delete when report is cancelled

---

### `tbl_media`

#### CREATE

**1. Upload Media for Report**
- **Location:** `app/screens/Home/Report.tsx` (line 523)
- **Operation:** `INSERT`
- **Fields Used:**
  - `file_url` (from storage upload)
  - `report_id`
  - `file_type` ('image', 'video', or 'audio')
  - `sender_id` (from Supabase auth session)
  - `uploaded_at`

**Process:**
1. Upload file to Supabase Storage bucket `crash-media`
2. Get public URL from storage
3. Insert record into `tbl_media` with file metadata

#### READ

**1. Get Media Files for Report Cancellation**
- **Location:** `app/hooks/useActiveCase.ts` (line 234)
- **Operation:** `SELECT`
- **Filter:** `report_id = {reportId}`
- **Fields Selected:** `file_url`
- **Purpose:** Get file URLs to delete from storage before deleting report

#### UPDATE
- **Not implemented**

#### DELETE
- **Not implemented directly** (media files are deleted from storage when report is cancelled, but records may remain in database)

---

### `tbl_police_offices`

#### CREATE
- **Not implemented in app** (likely handled by admin dashboard)

#### READ
- **Not directly queried in app** (nearest office selection handled by RPC function `create_emergency_sos`)

#### UPDATE
- **Not implemented in app**

#### DELETE
- **Not implemented in app**

---

## Summary of Database Interactions

### Total Operations by Type:
- **CREATE:** 4 operations
  - User registration
  - Report creation (manual)
  - Emergency SOS (via RPC)
  - Message sending (3 locations)
  - Media upload

- **READ:** 15+ operations
  - User lookups (by ID, email)
  - Active case checks
  - Notification fetching
  - Message loading
  - Media file retrieval

- **UPDATE:** 1 operation
  - User profile update

- **DELETE:** 2 operations
  - Report cancellation (with cascade)
  - Message deletion (cascade)

### Real-time Subscriptions:
- **2 active subscriptions:**
  1. Report status changes
  2. Message inserts per report

### RPC Functions:
- **1 function:**
  - `create_emergency_sos` - Creates report and auto-assigns nearest police office

### Storage Operations:
- **Upload:** Media files to `crash-media` bucket
- **Delete:** Media files when report is cancelled

---

## Notes

1. **Authentication:** All operations require Supabase auth session (except registration)
2. **Cascade Deletes:** When a report is deleted, associated messages and media files are also deleted
3. **Real-time Updates:** Active case and messages use Supabase real-time subscriptions for instant updates
4. **Location-based:** Emergency SOS uses Haversine formula (in SQL) to find nearest police office
5. **Media Storage:** Files are stored in Supabase Storage and metadata is stored in `tbl_media`

---

## File Locations Reference

| Operation | File | Line |
|-----------|------|------|
| User Registration | `app/screens/AccessPoint/components/Register/Register.tsx` | 532 |
| User Login | `app/screens/AccessPoint/components/Login/Login.tsx` | 91 |
| User Profile Update | `app/screens/Home/Profile.tsx` | 319 |
| Create Report | `app/screens/Home/Report.tsx` | 743 |
| Create SOS | `app/screens/Home/Home.tsx` | 331 |
| Cancel Report | `app/hooks/useActiveCase.ts` | 288 |
| Send Message | `app/screens/Home/ChatScreen.tsx` | 190 |
| Load Messages | `app/screens/Home/ChatScreen.tsx` | 89 |
| Upload Media | `app/screens/Home/Report.tsx` | 523 |
| Active Case Check | `app/hooks/useActiveCase.ts` | 69 |
| Notifications | `app/hooks/useActiveCase.ts` | 164 |

---

**End of Documentation**

