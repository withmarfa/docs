## Fields

| Field            | Kind               | Description                                                                                                  |
| ---------------- | ------------------ | ------------------------------------------------------------------------------------------------------------ |
| `text`           | `string`, required | The highlighted passage.                                                                                     |
| `note`           | `string`           | User annotation on the highlight.                                                                            |
| `color`          | `enum`             | Highlight color. Values: `yellow`, `blue`, `green`, `pink`, `orange`, `purple`.                              |
| `locator_type`   | `enum`             | How start_location / end_location are interpreted. Values: `offset`, `page`, `time`, `cfi`, `order`, `none`. |
| `start_location` | `string`           | Start locator, typed by locator_type.                                                                        |
| `end_location`   | `string`           | End locator, typed by locator_type.                                                                          |

## Settings

| Setting                                            | Value                                                                   |
| -------------------------------------------------- | ----------------------------------------------------------------------- |
| `plural`                                           | Highlights                                                              |
| [`title_field`](/catalog/type-rules#display-hints) | `text`                                                                  |
| [`body_field`](/catalog/type-rules#display-hints)  | `note`                                                                  |
| [`icon`](/catalog/type-rules#display-hints)        | `lucide:highlighter`                                                    |
| [`merge_policy`](/catalog/type-rules#merge-policy) | `keep_both_copies` for `note`; `last_writer_wins` for every other field |
