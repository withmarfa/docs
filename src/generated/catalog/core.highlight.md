## Fields

| Field            | Kind     | Required | Description                                                                                                  |
| ---------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| `text`           | `string` | Yes      | The highlighted passage                                                                                      |
| `note`           | `string` | No       | User annotation on the highlight                                                                             |
| `color`          | `enum`   | No       | Highlight color. Values: `yellow`, `blue`, `green`, `pink`, `orange`, `purple`.                              |
| `locator_type`   | `enum`   | No       | How start_location / end_location are interpreted. Values: `offset`, `page`, `time`, `cfi`, `order`, `none`. |
| `start_location` | `string` | No       | Start locator, typed by locator_type                                                                         |
| `end_location`   | `string` | No       | End locator, typed by locator_type                                                                           |

## Settings

| Setting                                                | Value                                                                   |
| ------------------------------------------------------ | ----------------------------------------------------------------------- |
| [`title_field`](/catalog/your-own-types#display-hints) | `text`                                                                  |
| [`body_field`](/catalog/your-own-types#display-hints)  | `note`                                                                  |
| [`icon`](/catalog/your-own-types#display-hints)        | `highlighter`                                                           |
| [`merge_policy`](/catalog/your-own-types#merge-policy) | `keep_both_copies` for `note`; `last_writer_wins` for every other field |
