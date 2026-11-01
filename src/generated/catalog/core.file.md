## Fields

| Field            | Kind               | Description                                                                                                                                                              |
| ---------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `blob_ref`       | `string`, required | Reference to the binary content (sha256:\<hex>). Label: Blob Reference.                                                                                                  |
| `mime_type`      | `string`, required | MIME type. Label: MIME Type.                                                                                                                                             |
| `title`          | `string`           | Filename or title.                                                                                                                                                       |
| `description`    | `string`           | What the file contains.                                                                                                                                                  |
| `url`            | `url`              | Web address. Label: URL.                                                                                                                                                 |
| `source_url`     | `url`              | Where the file was sourced from. Label: Source URL.                                                                                                                      |
| `author`         | `string`           | Who created the file.                                                                                                                                                    |
| `language`       | `string` (`bcp47`) | BCP 47 language code.                                                                                                                                                    |
| `notes`          | `string`           | Personal annotations.                                                                                                                                                    |
| `extracted_text` | `string`           | Machine-extracted text content of the referenced blob (server enrichment: document text or image OCR).                                                                   |
| `executable`     | `boolean`          | Whether the file may be run as a program; absent means it may not.                                                                                                       |
| `size_bytes`     | `integer`          | Size in bytes of the referenced blob (set by the server from the bytes the instance holds; absent where whoever named blob_ref never proved it holds them). Label: Size. |

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

| Field      | Kind               | Description                                                                                      |
| ---------- | ------------------ | ------------------------------------------------------------------------------------------------ |
| `language` | `string` (`bcp47`) | BCP 47 language code (for spoken content).                                                       |
| `duration` | `number`           | Length in seconds (server enrichment: derived from the file when the client does not supply it). |

### core.file.image [#core-file-image]

Photos, screenshots, diagrams. Inherits all core.file fields.

| Setting                                     | Value               |
| ------------------------------------------- | ------------------- |
| `plural`                                    | Images              |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:file-image` |

| Field       | Kind        | Description                                                                                     |
| ----------- | ----------- | ----------------------------------------------------------------------------------------------- |
| `width`     | `integer`   | Width in pixels (server enrichment: derived from the file when the client does not supply it).  |
| `height`    | `integer`   | Height in pixels (server enrichment: derived from the file when the client does not supply it). |
| `latitude`  | `number`    | Subject latitude.                                                                               |
| `longitude` | `number`    | Subject longitude.                                                                              |
| `altitude`  | `number`    | Altitude in meters.                                                                             |
| `thumbnail` | `thumbnail` | A small preview of the image, supplied by the writer.                                           |

### core.file.video [#core-file-video]

Video files. Inherits all core.file fields.

| Setting                                     | Value                      |
| ------------------------------------------- | -------------------------- |
| `plural`                                    | Videos                     |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:file-video-camera` |

| Field       | Kind               | Description                                                                                      |
| ----------- | ------------------ | ------------------------------------------------------------------------------------------------ |
| `language`  | `string` (`bcp47`) | BCP 47 language code (for spoken content).                                                       |
| `width`     | `integer`          | Width in pixels (server enrichment: derived from the file when the client does not supply it).   |
| `height`    | `integer`          | Height in pixels (server enrichment: derived from the file when the client does not supply it).  |
| `duration`  | `number`           | Length in seconds (server enrichment: derived from the file when the client does not supply it). |
| `latitude`  | `number`           | Subject latitude.                                                                                |
| `longitude` | `number`           | Subject longitude.                                                                               |
| `altitude`  | `number`           | Altitude in meters.                                                                              |

### core.file.webpage [#core-file-webpage]

An HTML page held as a file, such as a report an agent wrote. Inherits all core.file fields.

| Setting                                     | Value          |
| ------------------------------------------- | -------------- |
| `plural`                                    | Web Pages      |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:globe` |
