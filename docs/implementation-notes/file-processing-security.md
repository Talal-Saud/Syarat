# File-processing security boundaries

Vehicle image bytes must be trusted only after content-signature detection, decoder verification, dimension checks, and size limits. A client-provided filename, extension, MIME type, storage key, tenant ID, or vehicle ID is never authorization evidence. Object paths are generated server-side as `tenants/{TenantContext.tenantId}/vehicles/{tenant-scoped vehicleId}/images/{generated-id}`.

Accepted image formats are limited to JPEG, PNG, and WebP. The service will re-encode image derivatives through Sharp, which strips EXIF metadata (including GPS) by default when no metadata is preserved. The original object, optimized image, and thumbnail are stored under generated names.

Imports accept CSV, XLSX only after signature/file-type and parser validation. Files have strict byte and row limits. CSV values beginning with `=`, `+`, `-`, or `@` are escaped in rendered reports to mitigate spreadsheet formula injection. Import jobs persist authoritative tenant and membership IDs from TenantContext and never from the file or request body.

## Remaining delivery work

The current foundation must still be exposed through guarded multipart endpoints, including server-side maximum request limits and a route for promoting a selected image to primary. The import module must add template generation, upload persistence, preview validation, BullMQ dispatch for large files, row-level partial writes, and CSV/XLSX error-report objects. Each operation must look up import jobs with `{ id, tenantId: TenantContext.tenantId }` before reading, previewing, queueing, or reporting them.

## Multipart boundary

The Fastify bootstrap enforces one file per request, a 15 MiB transport cap, and a 20-field cap. Image service policy is stricter at 10 MiB. Import endpoints must use a separate explicit import-file cap and reject over-limit parsing before persistence. Multipart limits prevent input buffering from becoming an uncontrolled resource-exhaustion vector.

## Verification checkpoint

The API typecheck and existing API test suite passed after adding the database foundation, S3-compatible storage client, content-decoding image processor, tenant-scoped vehicle image service, import job ownership service, and multipart bootstrap limits. This is a checkpoint only; the upload controllers, spreadsheet parser/worker, preview, report, and complete feature-specific tests remain outstanding.
