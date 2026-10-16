- **Type:** `core.highlight`
- **Required:** `text`
- **Title field:** `text`
- **Body field:** `note`
- **Collisions:** `note` [keeps both copies](/guides/write-safely#let-marfa-resolve-it): the item keeps its value and the other writer's value goes to a new item tagged `conflicted-copy`. Every other field takes the last writer's value.

| Field            | Kind                                                            | Required | Description                                       |
| ---------------- | --------------------------------------------------------------- | -------- | ------------------------------------------------- |
| `text`           | `string`                                                        | Yes      | The highlighted passage                           |
| `note`           | `string`                                                        |          | User annotation on the highlight                  |
| `color`          | `enum` of `yellow`, `blue`, `green`, `pink`, `orange`, `purple` |          | Highlight color                                   |
| `locator_type`   | `enum` of `offset`, `page`, `time`, `cfi`, `order`, `none`      |          | How start_location / end_location are interpreted |
| `start_location` | `string`                                                        |          | Start locator, typed by locator_type              |
| `end_location`   | `string`                                                        |          | End locator, typed by locator_type                |
