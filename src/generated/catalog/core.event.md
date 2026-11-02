## Fields

| Field                  | Kind                | Description                                                                                                                                                      |
| ---------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`                | `string`, required  | The name of the event.                                                                                                                                           |
| `description`          | `string`            | A short description of the event.                                                                                                                                |
| `starts_at`            | `datetime`          | When the event starts, as an ISO 8601 instant. `timezone` says which local time it means. Label: Starts.                                                         |
| `ends_at`              | `datetime`          | When the event ends, as an ISO 8601 instant. Label: Ends.                                                                                                        |
| `duration`             | `number`            | How long the event lasts, in seconds. For a repeating event with no `ends_at`, it is the length of each occurrence.                                              |
| `place`                | `string`            | Where the event happens, as a name or an address.                                                                                                                |
| `latitude`             | `number`            | Venue latitude.                                                                                                                                                  |
| `longitude`            | `number`            | Venue longitude.                                                                                                                                                 |
| `url`                  | `url`               | A web page about the event. Label: URL.                                                                                                                          |
| `precision`            | `enum`              | How much of the start is known, such as only the year, for an event dated from memory. Values: `year`, `month`, `day`, `time`.                                   |
| `status`               | `enum`              | Whether the event will happen. Values: `tentative`, `confirmed`, `canceled`.                                                                                     |
| `notes`                | `string`            | Your own comments, kept apart from the event's details.                                                                                                          |
| `recurrence`           | `array` of `string` | RFC 5545 recurrence lines (RRULE, RDATE, EXDATE) that make the event repeat. Marfa works out the occurrences when they are read instead of storing them.         |
| `all_day`              | `boolean`           | True when the event lasts whole days rather than a span of time. Read the date from `starts_at` in the event's `timezone`.                                       |
| `timezone`             | `string`            | The IANA time zone the event keeps its local hour in, such as Europe/Berlin. A repeating event keeps that hour across daylight saving changes. Label: Time Zone. |
| `end_timezone`         | `string`            | The IANA time zone the event ends in, when it differs from `timezone`, such as a flight that lands in another zone. Label: End Time Zone.                        |
| `attendees`            | `array` of `object` | The people invited, one entry each. An entry has a name, an email or both, and the person's reply.                                                               |
| `attendees[].name`     | `string`            | The attendee's name as the source gives it.                                                                                                                      |
| `attendees[].email`    | `email`             | The attendee's email address.                                                                                                                                    |
| `attendees[].response` | `enum`              | The attendee's reply to the invitation. Values: `needs_action`, `accepted`, `declined`, `tentative`.                                                             |
| `original_starts_at`   | `datetime`          | For an event that replaces one occurrence of a repeating event, the start of the occurrence it replaces. Label: Original Start.                                  |

## Settings

| Setting                                            | Value                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| `plural`                                           | Events                                                                   |
| [`title_field`](/catalog/type-rules#display-hints) | `title`                                                                  |
| [`body_field`](/catalog/type-rules#display-hints)  | `description`                                                            |
| [`icon`](/catalog/type-rules#display-hints)        | `lucide:calendar`                                                        |
| [`merge_policy`](/catalog/type-rules#merge-policy) | `keep_both_copies` for `notes`; `last_writer_wins` for every other field |
