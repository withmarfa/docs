Marfa stores typed records, called items, and the edges between them. This reference describes its HTTP API.

### Authentication

Send a credential in the `Authorization` header as `Bearer <token>`: an API key (`marfa_k1_…`) or the access token of an app someone signed in to (`marfa_at_…`). In this reference, *you* means the credential that sends the request.

### Permissions

Your credential reads and writes only the types its permissions reach. If you ask by ID for an item whose type you can't read, Marfa answers as if the item doesn't exist. An edge appears in a response only if you can read both its edge type and the type of the item it starts from.

### Pagination

A list returns one page at a time, as `{ "data": [...], "next_cursor": "..." }`. To get the next page, send `next_cursor` back as `cursor`. The last page has `next_cursor: null`. A page can be short or empty and still have more after it, so stop only when `next_cursor` is `null`.

### Query parameters

Every operation refuses a query parameter it doesn't recognize with `400 validation_error`, so a misspelled filter can't silently return everything. The `edge[<type>]` and `backref[<type>]` filters on `GET /items` and `GET /items/stats` are recognized for any type. Marfa ignores any parameter that starts with `_`, so use that prefix for a parameter of your own, such as a cache buster.

### Errors

An error answers `{ "error": { "code": "...", "message": "...", "details": {} } }`. Use `code` in your logic: each operation lists the codes it can return, and the `X-Error-Code` header repeats it. `message` is for people and can change. A version conflict also carries the item or edge as it stands now, in `current`, so you can merge and try again.

### Idempotency

A write that takes an `Idempotency-Key` header is safe to retry. Send the same request with the same key, and Marfa returns the first response, with `Idempotency-Replayed: true`, and doesn't write again. A key belongs to the credential that sends it. While the first request with a key is still running, a repeat returns `409 idempotency_key_in_flight` and writes nothing, so retry it. Reusing a key for a different request returns `422 idempotency_key_reused`.

### Request bodies

A body is JSON, sent with `Content-Type: application/json`. A request that doesn't send its body as JSON returns `400 validation_error` and changes nothing, even if it has no body at all. The exceptions are `POST /blobs`, which takes the bytes of a blob, and `POST /restore`, which takes an archive. `POST /auth/oauth2/register` takes JSON too, but answers a request that isn't JSON with its own error, not this one.

### Time

Every time is UTC, written as `2026-10-03T09:30:00.000Z`. A time field is named for what happened, such as `created_at`. A filter on a time field pairs `_after` and `_before`, and both leave out the time you give, except `updated_after`, which includes it so that nothing changed at the same moment is skipped. `GET /occurrences` takes a window, `from` and `to`, instead.

### Event stream

`GET /events` sends each change as a frame whose `id:` is its event ID, in the order Marfa made the changes. To resume, reconnect with the last ID you received as `Last-Event-ID`, under any `type` or `edges` filter: Marfa replays what you missed, then sends `stream_live`. Marfa reads your credential again before each batch of frames and every 30 seconds: you receive only what it can read now, and a credential that's revoked or expired ends the stream, so reconnect with a current one. Ignore lines that start with `:`.

### Every response

Every response carries `X-Marfa-Contract`, the version of this contract, which is also this document's version. Every response outside `/auth/` and `/.well-known/`, and every response to `POST /auth/oauth2/register`, also carries `X-Request-ID`, which identifies the request if you report a problem.
