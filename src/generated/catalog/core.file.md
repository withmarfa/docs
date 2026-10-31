## Fields

| Field            | Label          | Kind               | Required | Description                                                                                                                                                |
| ---------------- | -------------- | ------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `blob_ref`       | Blob Reference | `string`           | Yes      | Reference to the binary content (sha256:\<hex>)                                                                                                            |
| `mime_type`      | MIME Type      | `string`           | Yes      | MIME type                                                                                                                                                  |
| `title`          |                | `string`           | No       | Filename or title                                                                                                                                          |
| `description`    |                | `string`           | No       | What the file contains                                                                                                                                     |
| `url`            | URL            | `url`              | No       | Web address                                                                                                                                                |
| `source_url`     | Source URL     | `url`              | No       | Where the file was sourced from                                                                                                                            |
| `author`         |                | `string`           | No       | Who created the file                                                                                                                                       |
| `language`       |                | `string` (`bcp47`) | No       | BCP 47 language code                                                                                                                                       |
| `notes`          |                | `string`           | No       | Personal annotations                                                                                                                                       |
| `extracted_text` |                | `string`           | No       | Machine-extracted text content of the referenced blob (server enrichment: document text or image OCR)                                                      |
| `executable`     |                | `boolean`          | No       | Whether the file may be run as a program; absent means it may not                                                                                          |
| `size_bytes`     | Size           | `integer`          | No       | Size in bytes of the referenced blob (set by the server from the bytes the instance holds; absent where whoever named blob_ref never proved it holds them) |

## Settings

| Setting                                            | Value                              |
| -------------------------------------------------- | ---------------------------------- |
| `plural`                                           | Files                              |
| [`title_field`](/catalog/type-rules#display-hints) | `title`                            |
| [`icon`](/catalog/type-rules#display-hints)        | `lucide:file`                      |
| [`merge_policy`](/catalog/type-rules#merge-policy) | `last_writer_wins` for every field |

## Subtypes

### core.file.audio [#core-file-audio]

Recordings, music files, voice memos. Inherits all core.file fields.

| Setting                                     | Value               |
| ------------------------------------------- | ------------------- |
| `plural`                                    | Audio               |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:file-music` |

| Field      | Kind               | Required | Description                                                                                     |
| ---------- | ------------------ | -------- | ----------------------------------------------------------------------------------------------- |
| `language` | `string` (`bcp47`) | No       | BCP 47 language code (for spoken content)                                                       |
| `duration` | `number`           | No       | Length in seconds (server enrichment: derived from the file when the client does not supply it) |

### core.file.image [#core-file-image]

Photos, screenshots, diagrams. Inherits all core.file fields.

| Setting                                     | Value               |
| ------------------------------------------- | ------------------- |
| `plural`                                    | Images              |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:file-image` |

| Field       | Kind        | Required | Description                                                                                    |
| ----------- | ----------- | -------- | ---------------------------------------------------------------------------------------------- |
| `width`     | `integer`   | No       | Width in pixels (server enrichment: derived from the file when the client does not supply it)  |
| `height`    | `integer`   | No       | Height in pixels (server enrichment: derived from the file when the client does not supply it) |
| `latitude`  | `number`    | No       | Subject latitude                                                                               |
| `longitude` | `number`    | No       | Subject longitude                                                                              |
| `altitude`  | `number`    | No       | Altitude in meters                                                                             |
| `thumbnail` | `thumbnail` | No       | A small preview of the image, supplied by the writer                                           |

### core.file.video [#core-file-video]

Video files. Inherits all core.file fields.

| Setting                                     | Value                      |
| ------------------------------------------- | -------------------------- |
| `plural`                                    | Videos                     |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:file-video-camera` |

| Field       | Kind               | Required | Description                                                                                     |
| ----------- | ------------------ | -------- | ----------------------------------------------------------------------------------------------- |
| `language`  | `string` (`bcp47`) | No       | BCP 47 language code (for spoken content)                                                       |
| `width`     | `integer`          | No       | Width in pixels (server enrichment: derived from the file when the client does not supply it)   |
| `height`    | `integer`          | No       | Height in pixels (server enrichment: derived from the file when the client does not supply it)  |
| `duration`  | `number`           | No       | Length in seconds (server enrichment: derived from the file when the client does not supply it) |
| `latitude`  | `number`           | No       | Subject latitude                                                                                |
| `longitude` | `number`           | No       | Subject longitude                                                                               |
| `altitude`  | `number`           | No       | Altitude in meters                                                                              |

### core.file.webpage [#core-file-webpage]

An HTML page held as a file, such as a report an agent wrote. Inherits all core.file fields.

| Setting                                     | Value          |
| ------------------------------------------- | -------------- |
| `plural`                                    | Web Pages      |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:globe` |
