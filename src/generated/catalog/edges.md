## about

Source item is about the target item. Topical connection between items across types. For a passage taken from the target use `excerpt-of`; for a mention in the source's text use `references`.

## attached-to

Source exists only for the item or items it is attached to, whoever or whatever made it: a file, a scan, a page of a scan, a clip. Many-to-many: a part may be attached to several hosts; a host may have several attachments. The source goes to the trash with its hosts once all of them are in the trash, and comes back when any of them is restored; removing the edge never trashes it. Carries an optional position for ordered parts, such as the pages of a scan. The attachment's own file writes the edge, saying what it was made for; where the attachment cannot carry frontmatter, such as an image, the host's file writes it under the reverse name, `has-attachment`.

| Property   | Kind     | Description                                                                  |
| ---------- | -------- | ---------------------------------------------------------------------------- |
| `position` | `number` | Ordering among the host's attachments, such as the page of a scan (1-based). |

## comments-on

Source is a comment on the target: a comment, a reply to another comment, a review comment, a suggestion or a review verdict. Many-to-one: a comment is on one item; an item may have many comments. A reply is a comment on the comment it answers. The source goes to the trash with its target and comes back when the target is restored; removing the edge never trashes it.

## derived-from

Source was produced from the target (imports, AI generation, transformations). Both items remain valid in parallel.

## excerpt-of

Source is a highlight, quote or clip taken from the target. Each excerpt is taken from one item; an item can have many excerpts. The excerpt carries its own text, stays in lists and stays when its source is binned or purged (orphan). Use it for a passage taken from an item, `about` for a topical link and `references` for a mention in text.

## in-collection

Source item is a member of the target container. The target may be any type declaring the `container` role, such as a collection, an ongoing series, an album or a publisher's own container type, rather than a fixed list of type names, so a connector writing its own vocabulary can express containment without the platform naming its types first. An item may belong to any number of containers, and a container holds any number of members. A container may not itself be a member: containment here is flat, and `parent-of` is what hierarchy is for. Deleting the container leaves its members in place. Carries position for ordering within the container.

**flat:** `true`

| Property   | Kind     | Description                               |
| ---------- | -------- | ----------------------------------------- |
| `position` | `number` | Ordering within the collection (1-based). |

## in-folder

Where an item's file sits in a folder: the source is the item, the target the folder's `system.folder`, and `path` the file's path relative to the folder's root. Placement only; a folder's query alone decides what it holds, and the edge is never written in a file's frontmatter. An item may sit in any number of folders. Revoking or removing the folder leaves its items in place, and a revoked folder takes no new placement.

**written_at:** `none`

| Property | Kind     | Description                                                                                                                           |
| -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `path`   | `string` | The file's path relative to the folder's root, with `/` between names; required, with no `..` name. The edge takes no other property. |

## in-thread

Source item is in the thread-target sequence. Each source is in at most one thread; the target is the thread item. Carries position for ordering.

| Property   | Kind     | Description                           |
| ---------- | -------- | ------------------------------------- |
| `position` | `number` | Ordering within the thread (1-based). |

## parent-of

Source is the parent of the target. Target has at most one parent. Deleting the parent cascades to children. A child's file writes the edge, naming its parent under the reverse name, `child-of`, so a parent's file does not list every child.

**written_at:** `target`

**acyclic:** `true`

## references

Source mentions the target: a link or embed in the source's text, or a system's own link from one item to another. Nothing else. Distinct from `about` (topical), `derived-from` (provenance) and `excerpt-of` (a passage taken from the target).

## supersedes

Source replaces the target as the current version. Linear chain; no cycles. Deleting the head does not promote the predecessor (orphan).

**acyclic:** `true`
