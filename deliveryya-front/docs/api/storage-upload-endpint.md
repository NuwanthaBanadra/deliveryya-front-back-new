# Storage Upload Endpoint

Endpoint: `POST /api/v1/storage/upload`

Description:
- Upload one or more files to the server. Files are saved under the configured `app.upload.path` + the provided `path` (default: `uploads`). The response returns a list of `public_id` values that represent the relative stored file paths (e.g. `products/<uuid>.jpg`).

Request
- Content-Type: multipart/form-data
- Parameters (form-data):
  - `files` (file) — required, repeatable. Send the files using the same field name multiple times for multiple files.
  - `path` (text) — optional, default `uploads`. Subdirectory under the configured upload path where files will be stored (example: `products`, `profiles`).

Sample curl (Windows PowerShell):

```powershell
curl -X POST "http://localhost:8080/api/v1/storage/upload?path=products" \
  -H "Authorization: Bearer <your_jwt_or_token_if_needed>" \
  -F "files=@C:\path\to\image1.jpg" \
  -F "files=@C:\path\to\image2.png"
```

Postman / GUI clients
- In Postman choose POST and the URL `http://localhost:8080/api/v1/storage/upload?path=products` (or add `path` as a form-data key).
- Under Body -> form-data add multiple entries with the key `files` and type `File`. Add one entry for each file you want to upload. Optionally add a `path` key (type: Text) with value `products` (or whatever subfolder you want).

JavaScript (browser or Node + form-data) example

```js
const url = 'http://localhost:8080/api/v1/storage/upload';
const form = new FormData();
form.append('files', fileInput.files[0]);
form.append('files', fileInput.files[1]);
form.append('path', 'products'); // optional

fetch(url + '?path=products', {
  method: 'POST',
  headers: {
    // Note: Don't set Content-Type header when sending FormData in browser — the browser will add the correct boundary.
    'Authorization': 'Bearer <token>'
  },
  body: form
}).then(res => res.json()).then(console.log);
```

Sample request body (conceptual)

- multipart/form-data
  - files: [file1.jpg, file2.png]
  - path: products

Sample success response (application JSON)

```json
{
  "message": "Success",
  "desc": "Files uploaded successfully",
  "object": [
    "products/442d8095-8c15-4b64-ab3a-eaf9934ff6cd.jpg",
    "products/7b2f8d8b-f4e1-4870-9344-65dd2ea1e279.jpg"
  ]
}
```

Errors
- If an I/O error occurs while saving files the controller throws a `BusinessException` with message `Failed to upload files`.
- If you send no files or only empty files the `object` array in the success response will be empty.

Notes
- The controller generates a UUID-based filename and preserves the original file extension.
- The returned `public_id` is the relative path (subfolder + filename). To access files via static resources, the app likely serves `app.upload.path` under a static URL — check your Spring configuration for static resource mapping.
- Ensure the `app.upload.path` property is set in `application.properties` (it is referenced by the controller).

Troubleshooting
- Permission denied while creating directories or writing files: check that the process has write permission to `app.upload.path`.
- Large uploads: ensure your Spring Boot multipart settings (max file size, max request size) are configured to allow the sizes you need.



