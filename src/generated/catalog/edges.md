## about

Source item is about the target item. Topical connection between items across types.

## attached-to

Source is an attachment (a file or media item) belonging to the target. Many-to-many: a file may be attached to multiple hosts; a host may have multiple attachments. Deleting the host orphans the attachment (it may still be attached to other items). The attachment's own file writes the edge, saying what it was made for; where the attachment cannot carry frontmatter, such as an image, the host's file writes it under the reverse name, `has-attachment`.

## authored-by

Source was authored by the target (usually a core.entity.person).

## derived-from

Source was produced from the target (imports, AI generation, transformations). Both items remain valid in parallel.

## in-collection

Source item is a member of the target container. The target may be any type declaring the `container` role, such as a collection, an ongoing series, an album or a publisher's own container type, rather than a fixed list of type names, so a connector writing its own vocabulary can express containment without the platform naming its types first. An item may belong to any number of containers, and a container holds any number of members. A container may not itself be a member: containment here is flat, and `parent-of` is what hierarchy is for. Deleting the container leaves its members in place. Carries position for ordering within the container.

| Property   | Kind     | Description                               |
| ---------- | -------- | ----------------------------------------- |
| `position` | `number` | Ordering within the collection (1-based). |

## in-folder

Where an item's file sits in a folder: the source is the item, the target the folder's `system.folder`, and `path` the file's path relative to the folder's root. Placement only; a folder's query alone decides what it holds, and the edge is never written in a file's frontmatter. An item may sit in any number of folders. Revoking or removing the folder leaves its items in place, and a revoked folder takes no new placement.

**written_at:** `none`

| Property | Kind     | Description                                                                                                                                                |
| -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `path`   | `string` | The file's path relative to the folder's root, with `/` between names; required, and it may not climb out of the folder. The edge takes no other property. |

## in-thread

Source item is in the thread-target sequence. Each source is in at most one thread; the target is the thread item. Carries position for ordering.

| Property   | Kind     | Description                           |
| ---------- | -------- | ------------------------------------- |
| `position` | `number` | Ordering within the thread (1-based). |

## parent-of

Source is the parent of the target. Target has at most one parent. Deleting the parent cascades to children. A child's file writes the edge, naming its parent under the reverse name, `child-of`, so a parent's file does not list every child.

**written_at:** `target`

## references

Source explicitly references the target. Distinct from `about` (topical) and `derived-from` (provenance). Covers wikilink-style mentions and the highlight-on-a-book case.

## supersedes

Source replaces the target as the current version. Linear chain; no cycles. Deleting the head does not promote the predecessor (orphan).
