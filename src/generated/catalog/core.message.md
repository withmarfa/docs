## Fields

| Field  | Kind                | Required | Description                                                            |
| ------ | ------------------- | -------- | ---------------------------------------------------------------------- |
| `body` | `string`            | No       | The message text                                                       |
| `from` | `string`            | Yes      | Sender identifier: format-agnostic (phone number, email, handle, etc.) |
| `to`   | `array` of `string` | No       | Recipient identifiers: same format-agnostic shape as from              |

## Settings

| Setting                                                | Value                                                                   |
| ------------------------------------------------------ | ----------------------------------------------------------------------- |
| `plural`                                               | Messages                                                                |
| [`body_field`](/catalog/your-own-types#display-hints)  | `body`                                                                  |
| [`icon`](/catalog/your-own-types#display-hints)        | `lucide:message-square`                                                 |
| [`merge_policy`](/catalog/your-own-types#merge-policy) | `keep_both_copies` for `body`; `last_writer_wins` for every other field |
