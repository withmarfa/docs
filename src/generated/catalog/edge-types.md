| Edge type       | Reverse name     | Cardinality    | On delete | Target types                       |
| --------------- | ---------------- | -------------- | --------- | ---------------------------------- |
| `about`         | None             | `many-to-many` | `orphan`  | Any type                           |
| `attached-to`   | `has-attachment` | `many-to-many` | `orphan`  | Any type                           |
| `authored-by`   | None             | `many-to-many` | `orphan`  | Any type                           |
| `derived-from`  | None             | `many-to-many` | `orphan`  | Any type                           |
| `in-collection` | None             | `many-to-many` | `orphan`  | Any type with the role `container` |
| `in-folder`     | None             | `many-to-many` | `orphan`  | `system.folder`                    |
| `in-thread`     | None             | `many-to-one`  | `orphan`  | Any type                           |
| `parent-of`     | `child-of`       | `one-to-many`  | `cascade` | Any type                           |
| `references`    | None             | `many-to-many` | `orphan`  | Any type                           |
| `supersedes`    | None             | `one-to-one`   | `orphan`  | Any type                           |
