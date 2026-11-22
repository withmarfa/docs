## about

Runs from the item to what it is about. When saving an item, about names that subject.

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

Runs from the attachment to the item it belongs to. When saving an attachment, attached-to names that item.

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

Runs from the comment to the item it comments on. When saving a comment, comments-on names that item. A comment has one subject.

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

Runs from the derived item to its source. When saving an item, derived-from names that source.

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

Runs from the excerpt to the item it was taken from. When saving a highlight or quote, excerpt-of names that item. An excerpt has one source.

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

Runs from the member to its container, such as a collection, a series or an album. When saving a member, in-collection names the container. A container does not nest inside another.

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

Runs from the item to the system.folder its file sits in. Saving an item cannot set this edge, because the edge needs the file's path.

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

Runs from the message to its thread. When saving a message, in-thread names the thread. A message has one thread.

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

Runs from the parent to the child. Each child has one parent. When saving an item, parent-of names its children. To give this item a parent, save the parent and name this item.

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

Runs from the item to the item it mentions. When saving an item, references names what it mentions.

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

Runs from the newer item to the item it replaces. Each end holds one item. When saving the current item, supersedes names the one it replaces.

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
