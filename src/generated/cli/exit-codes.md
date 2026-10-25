| Code | Meaning |
| --- | --- |
| 0 | Done. |
| 1 | The server refused the request (a wrong or spent setup code included), the CLI refused it before sending, the answer came from another contract, a docs page does not exist, or the archive of an export or a restore lacks blobs it names; a retry does not change it. |
| 2 | The command line or the profile file was wrong, or named no store or server. |
| 3 | The environment failed (unreachable, timed out, a 5xx, a 429, an answer naming no contract, full local storage, a docs site that cannot be read); try again. |
| 4 | The working copy or the queue refused under the device rules, or the keychain cannot be used (locked, missing, unreadable, or none on this system). |
| 5 | There is no credential, a profile's key command gave none, the credential was refused, or the sign-in ended; run `marfa login` to start one. |
| 130 | You ended a long-lived command (`folders watch`, `events`, `device changes`) with Ctrl-C, or ended one that was still stopping with a second Ctrl-C. |

`marfa device drain` prints its complete report on stdout and sets the exit code from it: 0 when the pass completed (refused writes included), 3 when writes went undelivered or the pass could not run, and 5 when a credential stopped the pass. These exits print no additional refusal on stderr. The report counts refused verdicts separately, in plain text.

When `marfa device catch-up` fails, the refusal says whether the catch-up had already changed the catalog the copy holds; the copy keeps that change. With --json, the refusal carries this as "catalog_changed" beside "exit".

With --json a refusal is the last line of stderr, one JSON object, after any plain lines such as a warning or the write line:

```text
{"error":{"code":...,"message":...,"server":{"status":...,"code":...,"details":...}|null,"retry_after_seconds":...},"exit":N}
```

where error.code is one of: `not_found`, `unauthorized`, `forbidden`, `validation`, `unknown_type`, `rate_limited`, `server`, `io`, `network`, `unnamed_answer`, `decoding`, `store`, `storage_full`, `signed_out`, `no_keychain`, `redirect`, `no_server`, `no_cursor`, `hydration_incomplete`, `no_catalog`, `reading_handle`, `wrong_schema`, `unsent_differs`, `copy_expired`, `stream_incomplete`, `wrong_server`, `bytes_absent`, `no_room`, `contract_mismatch`, `canceled`, `first_sync_waiting`, `invalid`, `not_held`, `watch`, `usage`, `install`, `no_store`, `no_credential`, `key_command`, `blobs_missing`, `docs_page_not_found`, `docs_section_not_found`, `docs_unreachable`, `conflict`, `too_large`.
