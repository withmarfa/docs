- **Type:** `core.note`
- **Required:** `body`
- **Title field:** `title`
- **Body field:** `body`
- **[Merge policy](/catalog/your-own-types#merge-policy):** `body` and `notes` `keep_both_copies`; every other field `last_writer_wins`

| Field      | Kind               | Required | Description          |
| ---------- | ------------------ | -------- | -------------------- |
| `body`     | `string`           | Yes      | The note text        |
| `title`    | `string`           |          | Heading or title     |
| `language` | `string` (`bcp47`) |          | BCP 47 language code |
| `notes`    | `string`           |          | Personal annotations |
