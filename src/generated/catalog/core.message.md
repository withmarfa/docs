## Fields

| Field  | Kind                | Description                                                                 |
| ------ | ------------------- | --------------------------------------------------------------------------- |
| `body` | `string`            | The text of the message.                                                    |
| `from` | `string`, required  | Who sent the message, such as a phone number, an email address or a handle. |
| `to`   | `array` of `string` | Who received the message, written the same way as `from`.                   |

## Settings

| Setting                                            | Value                                                                   |
| -------------------------------------------------- | ----------------------------------------------------------------------- |
| `plural`                                           | Messages                                                                |
| [`body_field`](/catalog/type-rules#display-hints)  | `body`                                                                  |
| [`icon`](/catalog/type-rules#display-hints)        | `lucide:message-square`                                                 |
| [`merge_policy`](/catalog/type-rules#merge-policy) | `keep_both_copies` for `body`; `last_writer_wins` for every other field |
