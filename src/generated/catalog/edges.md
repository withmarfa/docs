## about

Says that an item is about another item, such as a note about a book.

## attached-to

Says that an item is attached to another item and exists for it, such as a scanned page attached to the document it was scanned for.

| Property   | Kind     | Description                                                                                 |
| ---------- | -------- | ------------------------------------------------------------------------------------------- |
| `position` | `number` | Where the attachment comes among the item's attachments, such as the page number of a scan. |

## comments-on

Says that an item is a comment on another item, including a reply to another comment.

## derived-from

Says that an item was made from another item, such as an imported copy or a summary generated from a note.

## excerpt-of

Says that an item is a highlight, quote or clip taken from another item, such as a quote from a book.

## in-collection

Says that an item is a member of a container, such as a collection, a series or an album.

**flat:** `true`

| Property   | Kind     | Description                                         |
| ---------- | -------- | --------------------------------------------------- |
| `position` | `number` | Where the item comes among the container's members. |

## in-folder

Says where an item's file sits in a synced folder.

**written_at:** `none`

| Property | Kind     | Description                             |
| -------- | -------- | --------------------------------------- |
| `path`   | `string` | The file's path from the folder's root. |

## in-thread

Says that an item is a message in a thread, such as a reply in a conversation.

| Property   | Kind     | Description                            |
| ---------- | -------- | -------------------------------------- |
| `position` | `number` | Where the message comes in the thread. |

## parent-of

Says that an item is the parent of another item, so that items form a hierarchy.

**written_at:** `target`

**acyclic:** `true`

## references

Says that an item mentions another item, such as a note that links to another note.

## supersedes

Says that an item replaces another item as the current version, such as a revised document that replaces its earlier draft.

**acyclic:** `true`
