## Fields

| Field      | Kind               | Description                                         |
| ---------- | ------------------ | --------------------------------------------------- |
| `body`     | `string`           | The text of the note.                               |
| `title`    | `string`           | The note's heading.                                 |
| `language` | `string` (`bcp47`) | BCP 47 language code.                               |
| `notes`    | `string`           | Your own comments, kept apart from the note's text. |

## Settings

| Setting                                                 | Value                                                                               |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `plural`                                                | Notes                                                                               |
| [`title_field`](/catalog/type-definition#display-hints) | `title`                                                                             |
| [`body_field`](/catalog/type-definition#display-hints)  | `body`                                                                              |
| [`icon`](/catalog/type-definition#display-hints)        | `lucide:sticky-note`                                                                |
| [`merge_policy`](/catalog/type-definition#merge-policy) | `keep_both_copies` for `body` and `notes`; `last_writer_wins` for every other field |
