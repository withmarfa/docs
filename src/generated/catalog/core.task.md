## Fields

| Field               | Kind                | Description                                                                                                                          |
| ------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `title`             | `string`, required  | What needs doing.                                                                                                                    |
| `description`       | `string`            | A line or two of context.                                                                                                            |
| `body`              | `string`            | The full details, as long as you need.                                                                                               |
| `due_at`            | `datetime`          | When the task is due. Label: Due.                                                                                                    |
| `starts_at`         | `datetime`          | When you plan to start the task. Label: Starts.                                                                                      |
| `completed_at`      | `datetime`          | When you finished the task. Label: Completed.                                                                                        |
| `status`            | `status`            | Where the task stands. Values: `not_started`, `in_progress`, `completed`, `canceled`, each in the group of the same name.            |
| `priority`          | `enum`              | How important the task is. Values: `low`, `medium`, `high`, `urgent`.                                                                |
| `place`             | `string`            | Where the task is done.                                                                                                              |
| `precision`         | `enum`              | How much of the task's date is known, such as only the year or the month. Values: `year`, `month`, `day`, `time`.                    |
| `url`               | `url`               | A web page related to the task. Label: URL.                                                                                          |
| `assignees`         | `array` of `object` | The people the task is assigned to, one entry each. An entry has a name, an email or both.                                           |
| `assignees[].name`  | `string`            | The assignee's name as the source gives it, such as a login.                                                                         |
| `assignees[].email` | `email`             | The assignee's email address.                                                                                                        |
| `notes`             | `string`            | Your own comments, kept apart from the task's details.                                                                               |
| `recurrence`        | `array` of `string` | RFC 5545 recurrence lines (RRULE, RDATE, EXDATE) that make the task repeat, counted from `due_at` or, without one, from `starts_at`. |

## Settings

| Setting                                            | Value                                                                               |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `plural`                                           | Tasks                                                                               |
| [`title_field`](/catalog/type-rules#display-hints) | `title`                                                                             |
| [`body_field`](/catalog/type-rules#display-hints)  | `body`                                                                              |
| [`icon`](/catalog/type-rules#display-hints)        | `lucide:square-check-big`                                                           |
| [`merge_policy`](/catalog/type-rules#merge-policy) | `keep_both_copies` for `body` and `notes`; `last_writer_wins` for every other field |
