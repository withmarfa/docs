## Fields

| Field      | Kind               | Required | Description          |
| ---------- | ------------------ | -------- | -------------------- |
| `body`     | `string`           | No       | The note text        |
| `title`    | `string`           | No       | Heading or title     |
| `language` | `string` (`bcp47`) | No       | BCP 47 language code |
| `notes`    | `string`           | No       | Personal annotations |

## Settings

| Setting                                            | Value                                                                               |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `plural`                                           | Notes                                                                               |
| [`title_field`](/catalog/type-rules#display-hints) | `title`                                                                             |
| [`body_field`](/catalog/type-rules#display-hints)  | `body`                                                                              |
| [`icon`](/catalog/type-rules#display-hints)        | `lucide:sticky-note`                                                                |
| [`merge_policy`](/catalog/type-rules#merge-policy) | `keep_both_copies` for `body` and `notes`; `last_writer_wins` for every other field |
