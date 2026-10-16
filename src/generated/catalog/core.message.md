- **Type:** `core.message`
- **Required:** `body` and `from`
- **Body field:** `body`
- **[Merge policy](/catalog/your-own-types#merge-policy):** `body` `keep_both_copies`; every other field `last_writer_wins`

| Field  | Kind                | Required | Description                                                            |
| ------ | ------------------- | -------- | ---------------------------------------------------------------------- |
| `body` | `string`            | Yes      | The message text                                                       |
| `from` | `string`            | Yes      | Sender identifier: format-agnostic (phone number, email, handle, etc.) |
| `to`   | `array` of `string` |          | Recipient identifiers: same format-agnostic shape as from              |
