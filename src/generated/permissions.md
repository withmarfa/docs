| Permission          | What it lets a credential do                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `audit.read`        | Reading the audit log.                                                                                                                                  |
| `blobs.manage`      | Managing blob bytes and locations across the instance, without granting item content access.                                                            |
| `config.manage`     | Reading and replacing the instance configuration at `/config`: the enforcement levers and the cleanup-job retention overrides.                          |
| `connectors.manage` | Reading and administering connector registrations, their runs and their endpoints, deleting registrations and clearing a registration's retained state. |
| `grants.manage`     | Listing and revoking other apps' access.                                                                                                                |
| `instance.maintain` | Running housekeeping, resetting platform type definitions and cancelling bulk jobs.                                                                     |
| `instance.read`     | Reading detailed health, metrics, housekeeping status, platform drift, blob storage diagnostics and bulk job status.                                    |
| `items.purge`       | Destroying a trashed row irrecoverably, through the single-row operation and the bulk one alike.                                                        |
| `keys.manage`       | Listing and revoking keys across the instance, and changing their metadata or narrowing access.                                                         |
| `keys.mint`         | Minting keys within the caller's current access, and listing, changing and revoking keys within that access.                                            |
| `schema.write`      | Removing type and edge type definitions that already exist, and replacing them, only those the credential's type or edge map grants write on.           |
| `webhooks.manage`   | Reading, registering, changing and removing the outbound subscriptions that send an instance's events out, and redelivering what they sent.             |
