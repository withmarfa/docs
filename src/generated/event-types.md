| Event                | Sent to              | When it is sent                                                                                             |
| -------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------- |
| `item.created`       | Streams and webhooks | An item is created.                                                                                         |
| `item.updated`       | Streams and webhooks | An item is updated.                                                                                         |
| `item.deleted`       | Streams and webhooks | An item is moved to the bin.                                                                                |
| `item.restored`      | Streams and webhooks | An item in the bin is restored.                                                                             |
| `item.purged`        | Streams and webhooks | A trashed item is destroyed.                                                                                |
| `item.state_changed` | Streams and webhooks | An item moves to another lifecycle state.                                                                   |
| `metadata.changed`   | Streams and webhooks | An item's tags or extensions change.                                                                        |
| `edge.created`       | Streams and webhooks | An edge is created.                                                                                         |
| `edge.updated`       | Streams and webhooks | An edge's properties change.                                                                                |
| `edge.deleted`       | Streams and webhooks | An edge is deleted.                                                                                         |
| `stream_cursor`      | Streams              | First, when the stream read the log as it opened: where the log stood then.                                 |
| `stream_live`        | Streams              | Once the catch-up is over: everything up to its cursor has been sent or withheld, and what follows is live. |
| `stream_incomplete`  | Streams              | Last, when the stream can no longer deliver what it opened with.                                            |
| `catchup_too_old`    | Streams              | Last, when the log no longer holds the events after the `Last-Event-ID` the client sent.                    |
| `cursor_ahead`       | Streams              | Last, when the `Last-Event-ID` the client sent is past the latest event in the log.                         |
| `read_view_changed`  | Streams              | Last on a copy stream, when its read view changes.                                                          |
