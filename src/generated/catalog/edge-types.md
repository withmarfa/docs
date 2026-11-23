| Edge type       | Label         | Reverse label   | Reverse name     | Cardinality    | `cascade_on_delete` | `written_from` | To types                           |
| --------------- | ------------- | --------------- | ---------------- | -------------- | ------------------- | -------------- | ---------------------------------- |
| `about`         | About         | Subject Of      | None             | `many-to-many` | `orphan`            | `from`         | Any type                           |
| `attached-to`   | Attached To   | Attachments     | `has-attachment` | `many-to-many` | `with-hosts`        | `from`         | Any type                           |
| `comments-on`   | Comment On    | Comments        | None             | `many-to-one`  | `with-hosts`        | `from`         | Any type                           |
| `derived-from`  | Derived From  | Basis For       | None             | `many-to-many` | `orphan`            | `from`         | Any type                           |
| `excerpt-of`    | Excerpt From  | Excerpts        | None             | `many-to-one`  | `orphan`            | `from`         | Any type                           |
| `in-collection` | In Collection | Contents        | None             | `many-to-many` | `orphan`            | `from`         | Any type with the role `container` |
| `in-folder`     | In Folder     | Folder Contents | None             | `many-to-many` | `orphan`            | `none`         | `system.folder`                    |
| `in-thread`     | In Thread     | Messages        | None             | `many-to-one`  | `orphan`            | `from`         | Any type                           |
| `parent-of`     | Children      | Parent          | `child-of`       | `one-to-many`  | `cascade`           | `to`           | Any type                           |
| `references`    | References    | Referenced By   | None             | `many-to-many` | `orphan`            | `from`         | Any type                           |
| `supersedes`    | Supersedes    | Superseded By   | None             | `one-to-one`   | `orphan`            | `from`         | Any type                           |
