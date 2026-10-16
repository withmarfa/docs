- **Type:** `core.highlight`
- **Required:** `text`
- **Title field:** `text`
- **Body field:** `note`
- **[Merge policy](/catalog/your-own-types#merge-policy):** `note` `keep_both_copies`; every other field `last_writer_wins`

| Field            | Kind                                                            | Required | Description                                       |
| ---------------- | --------------------------------------------------------------- | -------- | ------------------------------------------------- |
| `text`           | `string`                                                        | Yes      | The highlighted passage                           |
| `note`           | `string`                                                        |          | User annotation on the highlight                  |
| `color`          | `enum` of `yellow`, `blue`, `green`, `pink`, `orange`, `purple` |          | Highlight color                                   |
| `locator_type`   | `enum` of `offset`, `page`, `time`, `cfi`, `order`, `none`      |          | How start_location / end_location are interpreted |
| `start_location` | `string`                                                        |          | Start locator, typed by locator_type              |
| `end_location`   | `string`                                                        |          | End locator, typed by locator_type                |
