## Fields

| Field          | Kind                 | Description                                                                           |
| -------------- | -------------------- | ------------------------------------------------------------------------------------- |
| `kind`         | `enum`, required     | The kind of connection. Values: `app`.                                                |
| `client_id`    | `string`             | The app's OAuth client ID.                                                            |
| `name`         | `string`             | Your own name for this app's sign-in. Without one, the app's registered name is used. |
| `scopes`       | `array` of `string`  | The scopes you granted the app.                                                       |
| `status`       | `enum`, required     | Whether the sign-in is active or revoked. Values: `active`, `revoked`.                |
| `granted_at`   | `datetime`, required | When you approved the app.                                                            |
| `last_used_at` | `datetime`           | When the app last used the sign-in successfully.                                      |
| `revoked_at`   | `datetime`           | When you revoked the sign-in, if you did.                                             |

## Settings

| Setting  | Value       |
| -------- | ----------- |
| `plural` | Connections |
