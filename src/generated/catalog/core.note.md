## Guidance

**Use for**

- A thought, a meeting note, or other writing that belongs together.

**Not for**

- A list of separate things to keep. A reading list is a `core.collection`, and each book or link is its own item linked with `in-collection`.
- Several unrelated files or documents as one note. Each file is a `core.file`.
- Something to do. That is a `core.task`.
- A web address to come back to. That is a `core.bookmark`.

**Body**

- `body` is the note. `title` is its heading. `notes` holds your own comments, apart from the note.

**Edges**

- `in-collection` runs from this note to the `core.collection` it belongs to.

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
