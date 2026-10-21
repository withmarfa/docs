## Fields

| Field            | Kind               | Required | Description                                                                                                                                                |
| ---------------- | ------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `blob_ref`       | `string`           | Yes      | Reference to the binary content (sha256:\<hex>)                                                                                                            |
| `mime_type`      | `string`           | Yes      | MIME type                                                                                                                                                  |
| `title`          | `string`           | No       | Filename or title                                                                                                                                          |
| `description`    | `string`           | No       | What the file contains                                                                                                                                     |
| `url`            | `url`              | No       | Web address                                                                                                                                                |
| `source_url`     | `url`              | No       | Where the file was sourced from                                                                                                                            |
| `author`         | `string`           | No       | Who created the file                                                                                                                                       |
| `language`       | `string` (`bcp47`) | No       | BCP 47 language code                                                                                                                                       |
| `notes`          | `string`           | No       | Personal annotations                                                                                                                                       |
| `extracted_text` | `string`           | No       | Machine-extracted text content of the referenced blob (server enrichment: document text or image OCR)                                                      |
| `executable`     | `boolean`          | No       | Whether the file may be run as a program; absent means it may not                                                                                          |
| `size_bytes`     | `integer`          | No       | Size in bytes of the referenced blob (set by the server from the bytes the instance holds; absent where whoever named blob_ref never proved it holds them) |

## Settings

| Setting                                                | Value                              |
| ------------------------------------------------------ | ---------------------------------- |
| [`title_field`](/catalog/your-own-types#fields)        | `title`                            |
| [`merge_policy`](/catalog/your-own-types#merge-policy) | `last_writer_wins` for every field |

## Subtypes

### core.file.audio [#core-file-audio]

Recordings, music files, voice memos. Inherits all core.file fields.

| Field      | Kind               | Required | Description                                                                                     |
| ---------- | ------------------ | -------- | ----------------------------------------------------------------------------------------------- |
| `language` | `string` (`bcp47`) | No       | BCP 47 language code (for spoken content)                                                       |
| `duration` | `number`           | No       | Length in seconds (server enrichment: derived from the file when the client does not supply it) |

### core.file.image [#core-file-image]

Photos, screenshots, diagrams. Inherits all core.file fields.

| Field       | Kind      | Required | Description                                                                                    |
| ----------- | --------- | -------- | ---------------------------------------------------------------------------------------------- |
| `width`     | `integer` | No       | Width in pixels (server enrichment: derived from the file when the client does not supply it)  |
| `height`    | `integer` | No       | Height in pixels (server enrichment: derived from the file when the client does not supply it) |
| `latitude`  | `number`  | No       | Subject latitude                                                                               |
| `longitude` | `number`  | No       | Subject longitude                                                                              |
| `altitude`  | `number`  | No       | Altitude in meters                                                                             |

### core.file.video [#core-file-video]

Video files. Inherits all core.file fields.

| Field       | Kind               | Required | Description                                                                                     |
| ----------- | ------------------ | -------- | ----------------------------------------------------------------------------------------------- |
| `language`  | `string` (`bcp47`) | No       | BCP 47 language code (for spoken content)                                                       |
| `width`     | `integer`          | No       | Width in pixels (server enrichment: derived from the file when the client does not supply it)   |
| `height`    | `integer`          | No       | Height in pixels (server enrichment: derived from the file when the client does not supply it)  |
| `duration`  | `number`           | No       | Length in seconds (server enrichment: derived from the file when the client does not supply it) |
| `latitude`  | `number`           | No       | Subject latitude                                                                                |
| `longitude` | `number`           | No       | Subject longitude                                                                               |
| `altitude`  | `number`           | No       | Altitude in meters                                                                              |
