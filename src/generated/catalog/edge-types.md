| Edge type       | Label         | Reverse label   | Reverse name     | Cardinality    | `cascade_on_delete` | `written_from` | To types                           |
| --------------- | ------------- | --------------- | ---------------- | -------------- | ------------------- | -------------- | ---------------------------------- |
| `about`         | About         | Subject of      | None             | `many-to-many` | `orphan`            | `from`         | Any type                           |
| `attached-to`   | Attached to   | Attachments     | `has-attachment` | `many-to-many` | `with-hosts`        | `from`         | Any type                           |
| `comments-on`   | Comment on    | Comments        | None             | `many-to-one`  | `with-hosts`        | `from`         | Any type                           |
| `derived-from`  | Derived from  | Basis for       | None             | `many-to-many` | `orphan`            | `from`         | Any type                           |
| `excerpt-of`    | Excerpt from  | Excerpts        | None             | `many-to-one`  | `orphan`            | `from`         | Any type                           |
| `in-collection` | In collection | Contents        | None             | `many-to-many` | `orphan`            | `from`         | Any type with the role `container` |
| `in-folder`     | In folder     | Folder contents | None             | `many-to-many` | `orphan`            | `none`         | `system.folder`                    |
| `in-thread`     | In thread     | Messages        | None             | `many-to-one`  | `orphan`            | `from`         | Any type                           |
| `parent-of`     | Children      | Parent          | `child-of`       | `one-to-many`  | `cascade`           | `to`           | Any type                           |
| `references`    | References    | Referenced by   | None             | `many-to-many` | `orphan`            | `from`         | Any type                           |
| `supersedes`    | Supersedes    | Superseded by   | None             | `one-to-one`   | `orphan`            | `from`         | Any type                           |
