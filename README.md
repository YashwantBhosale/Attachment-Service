# Modular Attachment Service

Service that issues JWT-secured REST APIs for uploading, streaming, downloading, and managing user documents in MongoDB GridFS. Uploads use in-memory buffering (multer) and a reusable attachment module layered over Mongoose + GridFS.

## Architecture
- Express app wires health, auth, and document routes; DB and GridFS buckets initialize on startup ([server.js](server.js#L1-L32), [config/connectDB.js](config/connectDB.js#L8-L53), [config/gridfsConfig.js](config/gridfsConfig.js#L1-L95)).
- Bucket rules (max size, mime types) live in [config/bucketConfig.js](config/bucketConfig.js#L1-L95); `initializeMultipleBuckets` seeds all declared buckets at boot.
- JWT auth middleware validates `Authorization: Bearer <token>` and attaches `req.user.id` ([middleware/auth.js](middleware/auth.js#L1-L24)).
- Users and documents are persisted via Mongoose ([models/userModel.js](models/userModel.js#L1-L55), [models/documentModel.js](models/documentModel.js#L1-L51)).
- Attachment module (`AttachmentService`) encapsulates upload/stream/download/delete logic against GridFS and a Mongoose model; `DocumentService` specializes it for the `documents` bucket ([services/AttachmentService.js](services/AttachmentService.js#L5-L255), [services/DocumentService.js](services/DocumentService.js#L1-L57)).
- HTTP controllers adapt services to REST, apply auth, and marshal responses ([controllers/authController.js](controllers/authController.js#L12-L229), [controllers/documentController.js](controllers/documentController.js#L5-L155), [routes/documentRoutes.js](routes/documentRoutes.js#L1-L24), [routes/authRoutes.js](routes/authRoutes.js#L1-L10)).

## Core data
- Document fields: userId, documentType (PROFILE_PHOTO, ID_PROOF, ADDRESS_PROOF, CERTIFICATE, CONTRACT, INVOICE, OTHER), file metadata, status (PENDING, VERIFIED, REJECTED, MODIFICATION_REQUESTED), timestamps ([models/documentModel.js](models/documentModel.js#L1-L51)).
- User fields: name, email (unique), hashed password, role (user|admin), isActive flag; password hashing via bcrypt pre-save hook ([models/userModel.js](models/userModel.js#L1-L55)).

## Attachment module
- Upload (`upload`): accepts a file buffer + metadata, optionally deletes an existing doc for the same user/documentType when `replaceExisting` is true, generates a descriptive filename, streams to GridFS, then persists a document record ([services/AttachmentService.js](services/AttachmentService.js#L11-L57)).
- Upload from stream (`uploadFromStream`): same flow for already-streaming content ([services/AttachmentService.js](services/AttachmentService.js#L59-L99)).
- Download/stream: validates document ID, confirms the GridFS file exists, returns a download stream with filename/mime/size metadata or a plain stream for inline use ([services/AttachmentService.js](services/AttachmentService.js#L101-L142)).
- Query helpers: `getById`, `getAll` with populate/sort/limit/skip options; `updateMetadata` for partial updates; `_deleteExisting` for replace semantics ([services/AttachmentService.js](services/AttachmentService.js#L144-L225)).
- Document specialization: `DocumentService.uploadDocument` sets status=PENDING and always replaces existing for the same user/type; `getUserDocuments` shapes responses with download/stream URLs; `updateStatus` enforces allowed states ([services/DocumentService.js](services/DocumentService.js#L4-L54)).

## Request lifecycle (upload)
1. Client sends `POST /api/documents/upload` with `multipart/form-data` field `file` and body `documentType` (and optional `remarks`).
2. Multer (memory storage) enforces bucket limits and mime list from `documents` config ([config/multerConfig.js](config/multerConfig.js#L6-L63)).
3. Auth middleware injects `req.user.id` ([middleware/auth.js](middleware/auth.js#L1-L24)).
4. Controller delegates to `DocumentService.uploadDocument`, which streams to GridFS and saves metadata; response returns document JSON ([controllers/documentController.js](controllers/documentController.js#L5-L38)).

## REST API
All routes are prefixed with `/api`. Supply `Authorization: Bearer <token>` except for signup/login/health.

**Auth**
- POST `/auth/signup` – body `{ name, email, password }` → returns JWT and user ([authController.js](controllers/authController.js#L12-L67)).
- POST `/auth/login` – body `{ email, password }` → returns JWT and user ([authController.js](controllers/authController.js#L69-L126)).
- GET `/auth/me` – returns current user ([authController.js](controllers/authController.js#L128-L143)).
- PUT `/auth/update-profile` – body `{ name?, email? }` ([authController.js](controllers/authController.js#L145-L180)).
- PUT `/auth/change-password` – body `{ currentPassword, newPassword }` ([authController.js](controllers/authController.js#L182-L221)).

**Documents** (uses `documents` bucket rules)
- POST `/documents/upload` – multipart `file`; fields `documentType` (required), `remarks` (optional). Replaces existing file of same type for the user ([documentController.js](controllers/documentController.js#L5-L38)).
- GET `/documents/my-documents` – optional query `documentType` to filter ([documentController.js](controllers/documentController.js#L94-L113)).
- GET `/documents/download/:documentId` – downloads with `Content-Disposition: attachment` ([documentController.js](controllers/documentController.js#L40-L61)).
- GET `/documents/stream/:documentId` – streams inline ([documentController.js](controllers/documentController.js#L63-L92)).
- PATCH `/documents/:documentId/status` – body `{ status: PENDING|VERIFIED|REJECTED|MODIFICATION_REQUESTED }` ([documentController.js](controllers/documentController.js#L135-L155)).
- DELETE `/documents/:documentId` – removes GridFS file + metadata ([documentController.js](controllers/documentController.js#L115-L133)).

## Example calls (cURL)
```bash
# Signup
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","password":"Secret123!"}'

# Login (captures token)
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"Secret123!"}' | jq -r '.token')

# Upload a PDF
curl -X POST http://localhost:5000/api/documents/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/id.pdf" \
  -F "documentType=ID_PROOF" \
  -F "remarks=Front side"

# List my documents
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/documents/my-documents?documentType=ID_PROOF

# Download
curl -L -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/documents/download/<documentId> -o id-proof.pdf

# Update status (admin-style workflow)
curl -X PATCH http://localhost:5000/api/documents/<documentId>/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"VERIFIED"}'
```

## Configuration & limits
- Env vars: `MONGO_URI` (required), `PORT` (default 5000), `JWT_SECRET`, `JWT_EXPIRE` (default 7d).
- Bucket-level limits/mime types: adjust or add buckets in [config/bucketConfig.js](config/bucketConfig.js#L1-L95); use `createUploadMiddleware('<bucketKey>')` in routes to swap rules ([config/multerConfig.js](config/multerConfig.js#L6-L63)).
- GridFS buckets auto-initialize for every bucket listed in `bucketConfigs` at startup ([config/connectDB.js](config/connectDB.js#L8-L21)).

## Service usage (for developers)
- Reuse `AttachmentService` with any Mongoose model: `new AttachmentService(MyModel, 'my_bucket')` gives `upload`, `uploadFromStream`, `download`, `stream`, `getAll`, `updateMetadata`, `delete`.
- To add a new attachment domain (e.g., invoices):
  1) Add a bucket entry to [config/bucketConfig.js](config/bucketConfig.js#L39-L65).
  2) Create a Mongoose model for metadata.
  3) Extend `AttachmentService` similar to [services/DocumentService.js](services/DocumentService.js#L1-L57) and wire routes/controllers with `createUploadMiddleware('<bucketKey>')`.

## Running locally
- Install deps: `npm install`.
- Set `MONGO_URI` (and optionally `JWT_SECRET`, `PORT`) in a `.env` file.
- Start: `node server.js` (or `nodemon server.js`). Health check: `GET /api/health`.

## Smoke testing
- A scripted client exercises uploads/streams/status flows in [tests/test-api.js](tests/test-api.js#L1-L143); run with `node tests/test-api.js` while the server is up.


## About the author
Made with ❤️ by [Yashwant Bhosale](https://github.com/YashwantBhosale).