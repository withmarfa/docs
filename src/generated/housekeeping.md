| Job                           | What it does                                                                     |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `event-log-cleanup`           | Removes expired event log entries and idempotency records.                       |
| `audit-cleanup`               | Removes expired audit entries and outbound webhook delivery history.             |
| `webhook-schedule`            | Schedules outbound webhook deliveries for new events.                            |
| `webhook-poll`                | Sends pending outbound webhook deliveries and retries failures.                  |
| `heartbeat`                   | Pings the configured liveness receiver.                                          |
| `version-thinning`            | Thins item versions according to the configured retention policy.                |
| `feed-expiry`                 | Moves expired feed items to the trash.                                           |
| `trash-purge`                 | Permanently removes items whose trash retention has elapsed.                     |
| `revoked-grant-purge`         | Removes revoked application grants after their retention window.                 |
| `grant-inactivity-retirement` | Revokes application grants that have not been used within the inactivity window. |
| `revoked-key-reap`            | Removes revoked or expired keys after the retention window.                      |
| `auth-session-cleanup`        | Removes expired authentication sessions.                                         |
| `rate-limit-cleanup`          | Removes expired rate limit windows.                                              |
| `inbound-delivery-cleanup`    | Removes inbound deliveries after their handled or pending retention window.      |
| `dcr-client-cleanup`          | Removes OAuth clients with no remaining grant after their retention window.      |
| `blob-replicate`              | Copies blobs to satisfy each attached store's replication policy.                |
| `blob-integrity`              | Checks blob copies and removes copies whose bytes are missing or altered.        |
| `blob-orphans`                | Reports unreferenced blobs and purges them after the grace period.               |
| `enrichment-sweep`            | Extracts searchable text and image dimensions from uploaded files.               |
| `bulk-action-gc`              | Removes completed bulk action jobs after their retention window.                 |
