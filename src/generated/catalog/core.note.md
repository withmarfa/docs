- **Type:** `core.note`
- **Required:** `body`
- **Title field:** `title`
- **Body field:** `body`
- **Collisions:** `body` and `notes` [keep both copies](/guides/write-safely#let-marfa-resolve-it): the item keeps its value and the other writer's value goes to a new item tagged `conflicted-copy`. Every other field takes the last writer's value.

| Field      | Kind               | Required | Description          |
| ---------- | ------------------ | -------- | -------------------- |
| `body`     | `string`           | Yes      | The note text        |
| `title`    | `string`           |          | Heading or title     |
| `language` | `string` (`bcp47`) |          | BCP 47 language code |
| `notes`    | `string`           |          | Personal annotations |
