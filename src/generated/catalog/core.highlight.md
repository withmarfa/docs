## Fields

| Field            | Kind     | Required | Description                                                                                                  |
| ---------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| `text`           | `string` | Yes      | The highlighted passage                                                                                      |
| `note`           | `string` |          | User annotation on the highlight                                                                             |
| `color`          | `enum`   |          | Highlight color. Values: `yellow`, `blue`, `green`, `pink`, `orange`, `purple`.                              |
| `locator_type`   | `enum`   |          | How start_location / end_location are interpreted. Values: `offset`, `page`, `time`, `cfi`, `order`, `none`. |
| `start_location` | `string` |          | Start locator, typed by locator_type                                                                         |
| `end_location`   | `string` |          | End locator, typed by locator_type                                                                           |

## Settings

| Setting                                                | Value                                                                   |
| ------------------------------------------------------ | ----------------------------------------------------------------------- |
| [`title_field`](/catalog/your-own-types#fields)        | `text`                                                                  |
| [`body_field`](/catalog/your-own-types#fields)         | `note`                                                                  |
| [`merge_policy`](/catalog/your-own-types#merge-policy) | `keep_both_copies` for `note`; `last_writer_wins` for every other field |
