## Fields

| Field      | Kind               | Description           |
| ---------- | ------------------ | --------------------- |
| `body`     | `string`           | The note text.        |
| `title`    | `string`           | Heading or title.     |
| `language` | `string` (`bcp47`) | BCP 47 language code. |
| `notes`    | `string`           | Personal annotations. |

## Settings

| Setting                                            | Value                                                                               |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `plural`                                           | Notes                                                                               |
| [`title_field`](/catalog/type-rules#display-hints) | `title`                                                                             |
| [`body_field`](/catalog/type-rules#display-hints)  | `body`                                                                              |
| [`icon`](/catalog/type-rules#display-hints)        | `lucide:sticky-note`                                                                |
| [`merge_policy`](/catalog/type-rules#merge-policy) | `keep_both_copies` for `body` and `notes`; `last_writer_wins` for every other field |
