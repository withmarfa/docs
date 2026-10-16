- **Type:** `core.task`
- **Required:** `title`
- **Title field:** `title`
- **Body field:** `body`
- **Collisions:** `body` and `notes` [keep both copies](/guides/write-safely#let-marfa-resolve-it): the item keeps its value and the other writer's value goes to a new item tagged `conflicted-copy`. Every other field takes the last writer's value.

| Field          | Kind                                        | Required | Description                                                   |
| -------------- | ------------------------------------------- | -------- | ------------------------------------------------------------- |
| `title`        | `string`                                    | Yes      | What needs doing                                              |
| `description`  | `string`                                    |          | Brief context                                                 |
| `body`         | `string`                                    |          | Detailed description                                          |
| `due_at`       | `datetime`                                  |          | Deadline                                                      |
| `starts_at`    | `datetime`                                  |          | When to start                                                 |
| `completed_at` | `datetime`                                  |          | When completed                                                |
| `status`       | `string`                                    |          | Recommended values: pending, in_progress, completed, canceled |
| `priority`     | `enum` of `low`, `medium`, `high`, `urgent` |          | Task priority                                                 |
| `place`        | `string`                                    |          | Location                                                      |
| `precision`    | `enum` of `year`, `month`, `day`, `time`    |          | Temporal precision                                            |
| `url`          | `url`                                       |          | Related link                                                  |
| `notes`        | `string`                                    |          | Personal annotations                                          |
