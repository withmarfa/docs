Marfa stores typed records, called items, and the edges between them. This reference describes its HTTP API.

### Authentication

Send a credential in the `Authorization` header as `Bearer <token>`: an API key (`marfa_k1_…`) or the access token of an app someone signed in to (`marfa_at_…`). In this reference, *you* means the credential that sends the request.

### Recent sign-in

Restoring an archive or a backup, moving the sign-in address and changing `allow_private_addresses` also need the owner to have signed in within the last five minutes. An app's access token whose owner signed in longer ago is answered `401 insufficient_user_authentication` with `WWW-Authenticate: Bearer error="insufficient_user_authentication", max_age="300"`, as RFC 9470 describes. Send the owner through `GET /oauth/authorize` with `max_age=300`: Marfa asks them to sign in again, and the tokens the code leads to carry the new sign-in. A refreshed token keeps the time of the sign-in it came from. An API key has no sign-in to renew, so it is refused these acts with `403 app_sign_in_required`, and the private local command makes them without one.

### Local command

An operation marked `x-marfa-local-command` also answers the private local listener: a Unix socket that only the account running the instance can open. The connection is the proof, so the request carries no credential, and no security scheme here describes it. The `marfa` command line reaches it with `--socket`.

### Permissions

Your credential reads and writes only the types its permissions reach. If you ask by ID for an item whose type you can't read, Marfa answers as if the item doesn't exist. An edge appears in a response only if you can read both its edge type and the type of the item it starts from.

### Pagination

A list returns one page at a time, as `{ "data": [...], "next_cursor": "..." }`. To get the next page, send `next_cursor` back as `cursor`. The last page has `next_cursor: null`. A page can be short or empty and still have more after it, so stop only when `next_cursor` is `null`. A list that can't page answers `{ "data": [...] }` alone.

### Answers

An operation that returns one object returns it bare, and wraps it only where the answer holds more than the object. A delete answers `200` with `{ "ok": true }` once the thing is gone, and `200` with the object where the object stays in a new state. No operation answers `204`.

### Query parameters

Every operation refuses a query parameter it doesn't recognize with `400 validation_error`, so a misspelled filter can't silently return everything. A boolean parameter is `true` or `false`, and anything else, `1` and `yes` included, is a `400 validation_error`. The `edge[<type>]` and `backref[<type>]` filters on `GET /items` and `GET /items/stats` are recognized for any type. Marfa ignores any parameter that starts with `_`, so use that prefix for a parameter of your own, such as a cache buster. The OAuth operations `GET /oauth/authorize`, `POST /oauth/token`, `POST /oauth/revoke` and `POST /oauth/device-authorization` ignore a parameter they don't recognize, as RFC 6749 requires.

### Errors

An error answers `{ "error": { "code": "...", "message": "...", "details": {} } }`. Use `code` in your logic: each operation lists the codes it can return, and the `X-Error-Code` header repeats it. `message` is for people and can change. A version conflict also carries the item or edge as it stands now, in `current`, so you can merge and try again.

The OAuth operations under `/oauth/` answer their own errors in the shape their RFCs define, `{ "error": "...", "error_description": "..." }`, with no `X-Error-Code`. A refusal every operation shares, such as `412` or `429`, keeps the shape above.

### Idempotency

A write that takes an `Idempotency-Key` header is safe to retry. Send the same request with the same key, and Marfa returns the first response, with `Idempotency-Replayed: true`, and doesn't write again. A key belongs to the credential that sends it. While the first request with a key is still running, a repeat returns `409 idempotency_key_in_flight` and writes nothing, so retry it. Reusing a key for a different request returns `422 idempotency_key_reused`. Repeating a request after Marfa moves to another contract version returns `422 idempotency_contract_changed`, with the first response's status in `details.original_status`, and doesn't write again.

### Request bodies

A body is JSON, sent with `Content-Type: application/json`. A request that doesn't send its body as JSON returns `400 validation_error` and changes nothing, even if it has no body at all. The exceptions are `POST /blobs`, which takes the bytes of a blob, and `POST /restore`, which takes an archive. `POST /oauth/token`, `POST /oauth/revoke` and `POST /oauth/device-authorization` take a form (`application/x-www-form-urlencoded`), as their RFCs define. `POST /oauth/register` takes JSON, and answers a request that isn't JSON with `400 invalid_client_metadata`.

### Time

Every time is UTC, written as `2026-10-03T09:30:00.000Z`. A time field is named for what happened, such as `created_at`. A filter on a time field pairs `_after` and `_before`, and both leave out the time you give, except `updated_after`, which includes it so that nothing changed at the same moment is skipped. `GET /occurrences` takes a window, `from` and `to`, instead.

### Event stream

`GET /events` sends each change as a frame whose `id:` is its event ID, in the order Marfa made the changes. To resume, reconnect with the last ID you received as `Last-Event-ID`, under any `type` or `edges` filter: Marfa replays what you missed, then sends `stream_live`. Marfa reads your credential again before each batch of frames and every 30 seconds: you receive only what it can read now, and a credential that's revoked or expired ends the stream, so reconnect with a current one. Ignore lines that start with `:`.

### Web pages

A web page can connect from a browser with no setup. `POST /oauth/register` and the discovery documents answer any origin, so the page registers itself, then opens the authorization endpoint in a window for the owner to approve. Once the owner approves it, the origin of each redirect URI it registered may call every operation from a browser. Send the access token in `Authorization`: no response allows a browser's credentials.

### Every response

Every response carries `X-Marfa-Contract`, the version of this contract, which is also this document's version. Every response also carries `X-Request-ID`, which identifies the request if you report a problem. Send `X-Marfa-Contract` on every request but a read of `/` and of `/health`, naming the contract version your client was built for. A request that names another version, or a value that is not a whole number, returns `412 contract_mismatch` and changes nothing. A request that names none is served.
