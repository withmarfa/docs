## Fields

| Field                        | Kind                | Description                                                                                                                                                                   |
| ---------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`                      | `string`, required  | The folder's name.                                                                                                                                                            |
| `query`                      | `object`            | Which items the folder holds, chosen by type, tier, state, a filter or a position under an item.                                                                              |
| `defaults`                   | `object`            | What a new file gets where its frontmatter leaves a blank: type, tier, properties, tags and edges. It is never applied to an edited file.                                     |
| `include`                    | `array` of `string` | Paths the folder takes, as gitignore patterns relative to its root. Empty takes every path.                                                                                   |
| `ignore`                     | `array` of `string` | Paths the folder leaves alone, as gitignore patterns relative to its root. It wins over `include`.                                                                            |
| `first_placement`            | `object`            | Where a new item of a type made elsewhere first appears: a map from type to a directory under the folder's root.                                                              |
| `removal_threshold`          | `object`            | When removing files pauses for confirmation: more than `files` files and more than `fraction` of the folder at once. Defaults to 10 and 0.25.                                 |
| `full_pass_interval_seconds` | `integer`           | Seconds between the watch's passes that read every file in the folder, from 60 to 86400. Defaults to 600.                                                                     |
| `addition_threshold`         | `object`            | When new files pause for confirmation: a scan that would add more than `files` files and more than `fraction` of the folder's files. Defaults to 50 and 0.25.                 |
| `outside_query`              | `enum`              | What the folder does with a new file its query would not hold: send it and keep it flagged unmatched, or hold it on disk, not sent. Defaults to send. Values: `send`, `hold`. |
| `revoked_at`                 | `datetime`          | When the folder was revoked.                                                                                                                                                  |

## Settings

| Setting  | Value   |
| -------- | ------- |
| `plural` | Folders |
