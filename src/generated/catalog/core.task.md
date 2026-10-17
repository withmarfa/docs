## Fields

| Field          | Kind       | Required | Description                                                   |
| -------------- | ---------- | -------- | ------------------------------------------------------------- |
| `title`        | `string`   | Yes      | What needs doing                                              |
| `description`  | `string`   |          | Brief context                                                 |
| `body`         | `string`   |          | Detailed description                                          |
| `due_at`       | `datetime` |          | Deadline                                                      |
| `starts_at`    | `datetime` |          | When to start                                                 |
| `completed_at` | `datetime` |          | When completed                                                |
| `status`       | `string`   |          | Recommended values: pending, in_progress, completed, canceled |
| `priority`     | `enum`     |          | Task priority. Values: `low`, `medium`, `high`, `urgent`.     |
| `place`        | `string`   |          | Location                                                      |
| `precision`    | `enum`     |          | Temporal precision. Values: `year`, `month`, `day`, `time`.   |
| `url`          | `url`      |          | Related link                                                  |
| `notes`        | `string`   |          | Personal annotations                                          |

## Settings

| Setting                                                | Value                                                                               |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| [`title_field`](/catalog/your-own-types#fields)        | `title`                                                                             |
| [`body_field`](/catalog/your-own-types#fields)         | `body`                                                                              |
| [`merge_policy`](/catalog/your-own-types#merge-policy) | `keep_both_copies` for `body` and `notes`; `last_writer_wins` for every other field |
