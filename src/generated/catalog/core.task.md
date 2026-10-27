## Fields

| Field          | Kind       | Required | Description                                                   |
| -------------- | ---------- | -------- | ------------------------------------------------------------- |
| `title`        | `string`   | Yes      | What needs doing                                              |
| `description`  | `string`   | No       | Brief context                                                 |
| `body`         | `string`   | No       | Detailed description                                          |
| `due_at`       | `datetime` | No       | Deadline                                                      |
| `starts_at`    | `datetime` | No       | When to start                                                 |
| `completed_at` | `datetime` | No       | When completed                                                |
| `status`       | `string`   | No       | Recommended values: pending, in_progress, completed, canceled |
| `priority`     | `enum`     | No       | Task priority. Values: `low`, `medium`, `high`, `urgent`.     |
| `place`        | `string`   | No       | Location                                                      |
| `precision`    | `enum`     | No       | Temporal precision. Values: `year`, `month`, `day`, `time`.   |
| `url`          | `url`      | No       | Related link                                                  |
| `notes`        | `string`   | No       | Personal annotations                                          |

## Settings

| Setting                                                | Value                                                                               |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| [`title_field`](/catalog/your-own-types#display-hints) | `title`                                                                             |
| [`body_field`](/catalog/your-own-types#display-hints)  | `body`                                                                              |
| [`icon`](/catalog/your-own-types#display-hints)        | `square-check-big`                                                                  |
| [`merge_policy`](/catalog/your-own-types#merge-policy) | `keep_both_copies` for `body` and `notes`; `last_writer_wins` for every other field |
