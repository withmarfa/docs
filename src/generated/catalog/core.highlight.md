## Guidance

**Use for**

- A passage highlighted in something you keep.

**Not for**

- The source itself. Writing of your own is a `core.note`. A web address to come back to is a `core.bookmark`.

**Body**

- `text` is the passage and is required. `note` is what you add about it.

**Edges**

- `excerpt-of` runs from this highlight to the item the passage came from. A highlight has one source.

## Fields

| Field            | Kind               | Description                                                                                                |
| ---------------- | ------------------ | ---------------------------------------------------------------------------------------------------------- |
| `text`           | `string`, required | The highlighted passage, as Markdown.                                                                      |
| `note`           | `string`           | Your note on the passage.                                                                                  |
| `color`          | `enum`             | The color of the highlight. Values: `yellow`, `blue`, `green`, `pink`, `orange`, `purple`.                 |
| `locator_type`   | `enum`             | How to read `start_location` and `end_location`. Values: `offset`, `page`, `time`, `cfi`, `order`, `none`. |
| `start_location` | `string`           | Where the highlight starts, read as `locator_type` says.                                                   |
| `end_location`   | `string`           | Where the highlight ends, read as `locator_type` says.                                                     |

## Settings

| Setting                                                    | Value                                                                   |
| ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| `plural`                                                   | Highlights                                                              |
| [`body_field`](/catalog/type-definition#display-hints)     | `text`                                                                  |
| [`name_from_body`](/catalog/type-definition#display-hints) | `false`                                                                 |
| [`icon`](/catalog/type-definition#display-hints)           | `lucide:highlighter`                                                    |
| [`merge_policy`](/catalog/type-definition#merge-policy)    | `keep_both_copies` for `note`; `last_writer_wins` for every other field |
