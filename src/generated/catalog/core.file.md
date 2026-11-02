## Fields

| Field            | Kind               | Description                                                                                               |
| ---------------- | ------------------ | --------------------------------------------------------------------------------------------------------- |
| `blob_ref`       | `string`, required | A reference to the file's contents, written as sha256: followed by the hex digest. Label: Blob Reference. |
| `mime_type`      | `string`, required | The file's MIME type, such as application/pdf. Label: MIME Type.                                          |
| `title`          | `string`           | The file's name or title.                                                                                 |
| `description`    | `string`           | What the file contains.                                                                                   |
| `url`            | `url`              | Web address. Label: URL.                                                                                  |
| `source_url`     | `url`              | Where the file came from. Label: Source URL.                                                              |
| `author`         | `string`           | Who made the file.                                                                                        |
| `language`       | `string` (`bcp47`) | BCP 47 language code.                                                                                     |
| `notes`          | `string`           | Your own comments, kept apart from the file's details.                                                    |
| `extracted_text` | `string`           | Text the server reads out of the file, such as document text or the words in an image.                    |
| `executable`     | `boolean`          | Whether the file may be run as a program. Absent means it may not.                                        |
| `size_bytes`     | `integer`          | The size of the file in bytes, set by the server once the instance holds the file's bytes. Label: Size.   |

## Settings

| Setting                                            | Value                              |
| -------------------------------------------------- | ---------------------------------- |
| `plural`                                           | Files                              |
| [`title_field`](/catalog/type-rules#display-hints) | `title`                            |
| [`icon`](/catalog/type-rules#display-hints)        | `lucide:file`                      |
| [`merge_policy`](/catalog/type-rules#merge-policy) | `last_writer_wins` for every field |

## Subtypes

### core.file.audio [#core-file-audio]

A recording, a music file or a voice memo.

| Setting                                     | Value               |
| ------------------------------------------- | ------------------- |
| `plural`                                    | Audio               |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:file-music` |

| Field      | Kind               | Description                                                                  |
| ---------- | ------------------ | ---------------------------------------------------------------------------- |
| `language` | `string` (`bcp47`) | BCP 47 language code of the speech.                                          |
| `duration` | `number`           | Length in seconds. The server fills it in from the file if you leave it out. |

### core.file.image [#core-file-image]

A photo, a screenshot or a diagram.

| Setting                                     | Value               |
| ------------------------------------------- | ------------------- |
| `plural`                                    | Images              |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:file-image` |

| Field       | Kind        | Description                                                                 |
| ----------- | ----------- | --------------------------------------------------------------------------- |
| `width`     | `integer`   | Width in pixels. The server fills it in from the file if you leave it out.  |
| `height`    | `integer`   | Height in pixels. The server fills it in from the file if you leave it out. |
| `latitude`  | `number`    | Latitude of what the image shows.                                           |
| `longitude` | `number`    | Longitude of what the image shows.                                          |
| `altitude`  | `number`    | The altitude of what the image shows, in meters.                            |
| `thumbnail` | `thumbnail` | A small preview of the image, supplied by whoever saved it.                 |

### core.file.video [#core-file-video]

A video file, such as a clip or a screen recording.

| Setting                                     | Value                      |
| ------------------------------------------- | -------------------------- |
| `plural`                                    | Videos                     |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:file-video-camera` |

| Field       | Kind               | Description                                                                  |
| ----------- | ------------------ | ---------------------------------------------------------------------------- |
| `language`  | `string` (`bcp47`) | BCP 47 language code of the speech.                                          |
| `width`     | `integer`          | Width in pixels. The server fills it in from the file if you leave it out.   |
| `height`    | `integer`          | Height in pixels. The server fills it in from the file if you leave it out.  |
| `duration`  | `number`           | Length in seconds. The server fills it in from the file if you leave it out. |
| `latitude`  | `number`           | Latitude of what the video shows.                                            |
| `longitude` | `number`           | Longitude of what the video shows.                                           |
| `altitude`  | `number`           | The altitude of what the video shows, in meters.                             |

### core.file.webpage [#core-file-webpage]

A web page saved as an HTML file, such as a report an agent wrote.

| Setting                                     | Value          |
| ------------------------------------------- | -------------- |
| `plural`                                    | Web Pages      |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:globe` |
