| Code | Meaning |
| --- | --- |
| 0 | Done. |
| 1 | The request was refused, by the server (a wrong or spent setup code included), by the CLI before sending, for an answer on another contract, or for a docs page that does not exist, or the archive of an export or a restore lacks blobs it names; a retry does not change it. |
| 2 | The command line was wrong, or named no store or server. |
| 3 | The environment failed (unreachable, timed out, a 5xx, a 429, an answer naming no contract, full local storage, a docs site that cannot be read); try again. |
| 4 | The working copy or the queue refused under the device rules, or the keychain cannot be used (locked, missing, unreadable, or none on this system). |
| 5 | No credential, the credential was refused, or the sign-in ended; `marfa login` starts one. |
| 130 | A long-lived command (`folders watch`, `events`, `device changes`) was ended by Ctrl-C, or a second Ctrl-C ended a command that was still stopping. |

A device drain prints its complete report on stdout: 0 for a completed pass (including refused writes), 3 for undelivered writes or an unavailable pass, and 5 for a credential-stopped pass. A report exit prints no additional refusal on stderr. Refused verdicts have a separate plain-text count.

A device catch-up that fails says whether it had changed the catalog the copy holds, which the copy keeps; with --json, as "catalog_changed" beside "exit".

With --json a refusal is one JSON object on stderr:

```text
{"error":{"code":...,"message":...,"server":{"status":...,"code":...,"details":...}|null,"retry_after_seconds":...},"exit":N}
```

where error.code is one of: `not_found`, `unauthorized`, `forbidden`, `validation`, `unknown_type`, `rate_limited`, `server`, `io`, `network`, `unnamed_answer`, `decoding`, `store`, `storage_full`, `signed_out`, `no_keychain`, `redirect`, `no_server`, `no_cursor`, `hydration_incomplete`, `no_catalog`, `reading_handle`, `wrong_schema`, `copy_expired`, `stream_incomplete`, `wrong_server`, `bytes_absent`, `contract_mismatch`, `canceled`, `first_sync_waiting`, `invalid`, `not_held`, `watch`, `usage`, `no_store`, `no_credential`, `blobs_missing`, `docs_page_not_found`, `docs_unreachable`, `conflict`, `too_large`.
