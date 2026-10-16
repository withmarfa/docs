- **Type:** `core.task`
- **Required:** `title`
- **Title field:** `title`
- **Body field:** `body`
- **[Merge policy](/catalog/your-own-types#merge-policy):** `body` and `notes` `keep_both_copies`; every other field `last_writer_wins`

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
