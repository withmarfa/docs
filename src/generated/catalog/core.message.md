- **Type:** `core.message`
- **Required:** `body` and `from`
- **Body field:** `body`
- **Collisions:** `body` [keeps both copies](/guides/write-safely#let-marfa-resolve-it): the item keeps its value and the other writer's value goes to a new item tagged `conflicted-copy`. Every other field takes the last writer's value.

| Field  | Kind                | Required | Description                                                            |
| ------ | ------------------- | -------- | ---------------------------------------------------------------------- |
| `body` | `string`            | Yes      | The message text                                                       |
| `from` | `string`            | Yes      | Sender identifier: format-agnostic (phone number, email, handle, etc.) |
| `to`   | `array` of `string` |          | Recipient identifiers: same format-agnostic shape as from              |
