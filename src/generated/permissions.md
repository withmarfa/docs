| Permission          | What it lets a credential do                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `audit.read`        | Reading the audit log.                                                                                                                                  |
| `backups.manage`    | Listing the backups, taking one now and adopting the backup folder.                                                                                     |
| `blobs.manage`      | Managing blob bytes and copies across the instance, without granting item content access.                                                               |
| `config.manage`     | Reading and replacing the instance configuration at `/config`: the enforcement levers and the cleanup-job retention overrides.                          |
| `connectors.manage` | Reading and administering connector registrations, their runs and their endpoints, deleting registrations and clearing a registration's retained state. |
| `grants.manage`     | Listing, narrowing and revoking other apps' access.                                                                                                     |
| `instance.maintain` | Running housekeeping, canceling bulk jobs and confirming the server's clock.                                                                            |
| `instance.read`     | Reading detailed health, what needs the owner's attention, metrics, housekeeping status, blob storage diagnostics and bulk job status.                  |
| `items.purge`       | Destroying a trashed item irrecoverably, through the single-item operation and the bulk one alike, and listing and emptying the trash.                  |
| `keys.manage`       | Listing and revoking keys across the instance, changing their metadata or narrowing access, and setting the name and mark of any source.                |
| `keys.mint`         | Minting keys within the caller's current access, and listing, changing and revoking keys within that access.                                            |
| `schema.write`      | Removing type and edge type definitions that already exist, and replacing them, only those the credential's type or edge map grants write on.           |
| `sign_ins.manage`   | Listing, renaming and ending the owner's sign-ins, and listing, renaming and removing the owner's passkeys and getting the link that adds one.          |
| `webhooks.manage`   | Reading, registering, changing and removing the outbound subscriptions that send an instance's events out, and redelivering what they sent.             |
