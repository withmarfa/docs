- **Type:** `core.file`
- **Required:** `blob_ref` and `mime_type`
- **Title field:** `title`
- **[Merge policy](/catalog/your-own-types#merge-policy):** every field `last_writer_wins`

| Field            | Kind               | Required | Description                                                                                                                                                |
| ---------------- | ------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `blob_ref`       | `string`           | Yes      | Reference to the binary content (sha256:\<hex>)                                                                                                            |
| `mime_type`      | `string`           | Yes      | MIME type                                                                                                                                                  |
| `title`          | `string`           |          | Filename or title                                                                                                                                          |
| `description`    | `string`           |          | What the file contains                                                                                                                                     |
| `url`            | `url`              |          | Web address                                                                                                                                                |
| `source_url`     | `url`              |          | Where the file was sourced from                                                                                                                            |
| `author`         | `string`           |          | Who created the file                                                                                                                                       |
| `language`       | `string` (`bcp47`) |          | BCP 47 language code                                                                                                                                       |
| `notes`          | `string`           |          | Personal annotations                                                                                                                                       |
| `extracted_text` | `string`           |          | Machine-extracted text content of the referenced blob (server enrichment: document text or image OCR)                                                      |
| `executable`     | `boolean`          |          | Whether the file may be run as a program; absent means it may not                                                                                          |
| `size_bytes`     | `integer`          |          | Size in bytes of the referenced blob (set by the server from the bytes the instance holds; absent where whoever named blob_ref never proved it holds them) |

## core.file.audio [#core-file-audio]

Recordings, music files, voice memos. Inherits all core.file fields.

| Field      | Kind               | Required | Description                                                                                     |
| ---------- | ------------------ | -------- | ----------------------------------------------------------------------------------------------- |
| `language` | `string` (`bcp47`) |          | BCP 47 language code (for spoken content)                                                       |
| `duration` | `number`           |          | Length in seconds (server enrichment: derived from the file when the client does not supply it) |

## core.file.image [#core-file-image]

Photos, screenshots, diagrams. Inherits all core.file fields.

| Field       | Kind      | Required | Description                                                                                    |
| ----------- | --------- | -------- | ---------------------------------------------------------------------------------------------- |
| `width`     | `integer` |          | Width in pixels (server enrichment: derived from the file when the client does not supply it)  |
| `height`    | `integer` |          | Height in pixels (server enrichment: derived from the file when the client does not supply it) |
| `latitude`  | `number`  |          | Subject latitude                                                                               |
| `longitude` | `number`  |          | Subject longitude                                                                              |
| `altitude`  | `number`  |          | Altitude in meters                                                                             |

## core.file.video [#core-file-video]

Video files. Inherits all core.file fields.

| Field       | Kind               | Required | Description                                                                                     |
| ----------- | ------------------ | -------- | ----------------------------------------------------------------------------------------------- |
| `language`  | `string` (`bcp47`) |          | BCP 47 language code (for spoken content)                                                       |
| `width`     | `integer`          |          | Width in pixels (server enrichment: derived from the file when the client does not supply it)   |
| `height`    | `integer`          |          | Height in pixels (server enrichment: derived from the file when the client does not supply it)  |
| `duration`  | `number`           |          | Length in seconds (server enrichment: derived from the file when the client does not supply it) |
| `latitude`  | `number`           |          | Subject latitude                                                                                |
| `longitude` | `number`           |          | Subject longitude                                                                               |
| `altitude`  | `number`           |          | Altitude in meters                                                                              |
