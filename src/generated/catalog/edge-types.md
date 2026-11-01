| Edge type       | Label         | Reverse label   | Reverse name     | Cardinality    | On delete    | Target types                       |
| --------------- | ------------- | --------------- | ---------------- | -------------- | ------------ | ---------------------------------- |
| `about`         | About         | Subject of      | None             | `many-to-many` | `orphan`     | Any type                           |
| `attached-to`   | Attached to   | Attachments     | `has-attachment` | `many-to-many` | `with-hosts` | Any type                           |
| `comments-on`   | Comment on    | Comments        | None             | `many-to-one`  | `with-hosts` | Any type                           |
| `derived-from`  | Derived from  | Basis for       | None             | `many-to-many` | `orphan`     | Any type                           |
| `excerpt-of`    | Excerpt of    | Excerpts        | None             | `many-to-one`  | `orphan`     | Any type                           |
| `in-collection` | In collection | Contents        | None             | `many-to-many` | `orphan`     | Any type with the role `container` |
| `in-folder`     | In folder     | Folder contents | None             | `many-to-many` | `orphan`     | `system.folder`                    |
| `in-thread`     | In thread     | Messages        | None             | `many-to-one`  | `orphan`     | Any type                           |
| `parent-of`     | Children      | Parent          | `child-of`       | `one-to-many`  | `cascade`    | Any type                           |
| `references`    | References    | Referenced by   | None             | `many-to-many` | `orphan`     | Any type                           |
| `supersedes`    | Supersedes    | Superseded by   | None             | `one-to-one`   | `orphan`     | Any type                           |
