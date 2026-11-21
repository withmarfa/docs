## about

Says that an item is about another item, such as a note about a book.

| Setting             | Value          |
| ------------------- | -------------- |
| `label`             | About          |
| `reverse_label`     | Subject of     |
| `cardinality`       | `many-to-many` |
| `cascade_on_delete` | `orphan`       |
| `written_from`      | `from`         |
| From types          | Any type       |
| To types            | Any type       |
| `flat`              | `false`        |
| `acyclic`           | `false`        |

## attached-to

Says that an item is attached to another item and exists for it, such as a scanned page attached to the document it was scanned for.

| Setting             | Value            |
| ------------------- | ---------------- |
| `label`             | Attached to      |
| `reverse_label`     | Attachments      |
| `reverse_name`      | `has-attachment` |
| `cardinality`       | `many-to-many`   |
| `cascade_on_delete` | `with-hosts`     |
| `written_from`      | `from`           |
| From types          | Any type         |
| To types            | Any type         |
| `flat`              | `false`          |
| `acyclic`           | `false`          |

| Property   | Kind     | Description                                                                                 |
| ---------- | -------- | ------------------------------------------------------------------------------------------- |
| `position` | `number` | Where the attachment comes among the item's attachments, such as the page number of a scan. |

## comments-on

Says that an item is a comment on another item, including a reply to another comment.

| Setting             | Value         |
| ------------------- | ------------- |
| `label`             | Comment on    |
| `reverse_label`     | Comments      |
| `cardinality`       | `many-to-one` |
| `cascade_on_delete` | `with-hosts`  |
| `written_from`      | `from`        |
| From types          | Any type      |
| To types            | Any type      |
| `flat`              | `false`       |
| `acyclic`           | `false`       |

## derived-from

Says that an item was made from another item, such as an imported copy or a summary generated from a note.

| Setting             | Value          |
| ------------------- | -------------- |
| `label`             | Derived from   |
| `reverse_label`     | Basis for      |
| `cardinality`       | `many-to-many` |
| `cascade_on_delete` | `orphan`       |
| `written_from`      | `from`         |
| From types          | Any type       |
| To types            | Any type       |
| `flat`              | `false`        |
| `acyclic`           | `false`        |

## excerpt-of

Says that an item is a highlight, quote or clip taken from another item, such as a quote from a book.

| Setting             | Value         |
| ------------------- | ------------- |
| `label`             | Excerpt from  |
| `reverse_label`     | Excerpts      |
| `cardinality`       | `many-to-one` |
| `cascade_on_delete` | `orphan`      |
| `written_from`      | `from`        |
| From types          | Any type      |
| To types            | Any type      |
| `flat`              | `false`       |
| `acyclic`           | `false`       |

## in-collection

Says that an item is a member of a container, such as a collection, a series or an album.

| Setting             | Value                              |
| ------------------- | ---------------------------------- |
| `label`             | In collection                      |
| `reverse_label`     | Contents                           |
| `cardinality`       | `many-to-many`                     |
| `cascade_on_delete` | `orphan`                           |
| `written_from`      | `from`                             |
| From types          | Any type                           |
| To types            | Any type with the role `container` |
| `flat`              | `true`                             |
| `acyclic`           | `false`                            |

| Property   | Kind     | Description                                         |
| ---------- | -------- | --------------------------------------------------- |
| `position` | `number` | Where the item comes among the container's members. |

## in-folder

Says where an item's file sits in a synced folder.

| Setting             | Value           |
| ------------------- | --------------- |
| `label`             | In folder       |
| `reverse_label`     | Folder contents |
| `cardinality`       | `many-to-many`  |
| `cascade_on_delete` | `orphan`        |
| `written_from`      | `none`          |
| From types          | Any type        |
| To types            | `system.folder` |
| `flat`              | `false`         |
| `acyclic`           | `false`         |

| Property | Kind     | Description                                                                                    |
| -------- | -------- | ---------------------------------------------------------------------------------------------- |
| `path`   | `string` | The file's path from the folder's root.                                                        |
| `form`   | `object` | How the file writes its frontmatter: its keys in order and each value's style, with no values. |

## in-thread

Says that an item is a message in a thread, such as a reply in a conversation.

| Setting             | Value         |
| ------------------- | ------------- |
| `label`             | In thread     |
| `reverse_label`     | Messages      |
| `cardinality`       | `many-to-one` |
| `cascade_on_delete` | `orphan`      |
| `written_from`      | `from`        |
| From types          | Any type      |
| To types            | Any type      |
| `flat`              | `false`       |
| `acyclic`           | `false`       |

| Property   | Kind     | Description                            |
| ---------- | -------- | -------------------------------------- |
| `position` | `number` | Where the message comes in the thread. |

## parent-of

Says that an item is the parent of another item, so that items form a hierarchy.

| Setting             | Value         |
| ------------------- | ------------- |
| `label`             | Children      |
| `reverse_label`     | Parent        |
| `reverse_name`      | `child-of`    |
| `cardinality`       | `one-to-many` |
| `cascade_on_delete` | `cascade`     |
| `written_from`      | `to`          |
| From types          | Any type      |
| To types            | Any type      |
| `flat`              | `false`       |
| `acyclic`           | `true`        |

## references

Says that an item mentions another item, such as a note that links to another note.

| Setting             | Value          |
| ------------------- | -------------- |
| `label`             | References     |
| `reverse_label`     | Referenced by  |
| `cardinality`       | `many-to-many` |
| `cascade_on_delete` | `orphan`       |
| `written_from`      | `from`         |
| From types          | Any type       |
| To types            | Any type       |
| `flat`              | `false`        |
| `acyclic`           | `false`        |

## supersedes

Says that an item replaces another item as the current version, such as a revised document that replaces its earlier draft.

| Setting             | Value         |
| ------------------- | ------------- |
| `label`             | Supersedes    |
| `reverse_label`     | Superseded by |
| `cardinality`       | `one-to-one`  |
| `cascade_on_delete` | `orphan`      |
| `written_from`      | `from`        |
| From types          | Any type      |
| To types            | Any type      |
| `flat`              | `false`       |
| `acyclic`           | `true`        |
