## Fields

| Field  | Kind                | Description                                                             |
| ------ | ------------------- | ----------------------------------------------------------------------- |
| `body` | `string`            | The message text.                                                       |
| `from` | `string`, required  | Sender identifier: format-agnostic (phone number, email, handle, etc.). |
| `to`   | `array` of `string` | Recipient identifiers: same format-agnostic shape as from.              |

## Settings

| Setting                                            | Value                                                                   |
| -------------------------------------------------- | ----------------------------------------------------------------------- |
| `plural`                                           | Messages                                                                |
| [`body_field`](/catalog/type-rules#display-hints)  | `body`                                                                  |
| [`icon`](/catalog/type-rules#display-hints)        | `lucide:message-square`                                                 |
| [`merge_policy`](/catalog/type-rules#merge-policy) | `keep_both_copies` for `body`; `last_writer_wins` for every other field |
