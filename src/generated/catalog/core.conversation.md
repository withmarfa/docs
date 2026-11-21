## Fields

| Field   | Kind     | Description              |
| ------- | -------- | ------------------------ |
| `title` | `string` | The conversation's name. |

## Settings

| Setting                                                 | Value                              |
| ------------------------------------------------------- | ---------------------------------- |
| `plural`                                                | Conversations                      |
| [`title_field`](/catalog/type-definition#display-hints) | `title`                            |
| [`icon`](/catalog/type-definition#display-hints)        | `lucide:messages-square`           |
| [`merge_policy`](/catalog/type-definition#merge-policy) | `last_writer_wins` for every field |

## Tables

### messages [#core-conversation-table-messages]

The messages of the conversation, kept in the order they were sent.

**order:** `sent_at`

| Column       | Kind                 | Description                                                               |
| ------------ | -------------------- | ------------------------------------------------------------------------- |
| `author`     | `string`, required   | Who wrote the message, such as a name, a handle or `assistant`.           |
| `text`       | `string`, searchable | What the message says. A message may have no text and only an attachment. |
| `sent_at`    | `datetime`, required | When the message was sent.                                                |
| `attachment` | `item`               | A picture or other file the message carries. Types: `core.file`.          |
