## Fields

| Field               | Kind                | Description                                                                                                                                   |
| ------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`             | `string`, required  | The folder's name.                                                                                                                            |
| `query`             | `object`            | Which items the folder holds, chosen by type, tier, state, a filter or a position under an item.                                              |
| `defaults`          | `object`            | What a new file gets where its frontmatter leaves a blank: type, tier, properties, tags and edges. It is never applied to an edited file.     |
| `include`           | `array` of `string` | Paths the folder takes, as gitignore patterns relative to its root. Empty takes every path.                                                   |
| `ignore`            | `array` of `string` | Paths the folder leaves alone, as gitignore patterns relative to its root. It wins over `include`.                                            |
| `first_placement`   | `object`            | Where a new item of a type made elsewhere first appears: a map from type to a directory under the folder's root.                              |
| `removal_threshold` | `object`            | When removing files pauses for confirmation: more than `files` files and more than `fraction` of the folder at once. Defaults to 10 and 0.25. |
| `revoked_at`        | `datetime`          | When the folder was revoked.                                                                                                                  |

## Settings

| Setting  | Value   |
| -------- | ------- |
| `plural` | Folders |
