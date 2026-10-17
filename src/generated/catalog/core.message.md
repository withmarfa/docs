## Fields

| Field  | Kind                | Required | Description                                                            |
| ------ | ------------------- | -------- | ---------------------------------------------------------------------- |
| `body` | `string`            | Yes      | The message text                                                       |
| `from` | `string`            | Yes      | Sender identifier: format-agnostic (phone number, email, handle, etc.) |
| `to`   | `array` of `string` |          | Recipient identifiers: same format-agnostic shape as from              |

## Settings

| Setting                                                | Value                                                                   |
| ------------------------------------------------------ | ----------------------------------------------------------------------- |
| [`body_field`](/catalog/your-own-types#fields)         | `body`                                                                  |
| [`merge_policy`](/catalog/your-own-types#merge-policy) | `keep_both_copies` for `body`; `last_writer_wins` for every other field |
