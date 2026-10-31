## Fields

| Field          | Label     | Kind               | Required | Description                                                                                                                                                                                                                       |
| -------------- | --------- | ------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`        |           | `string`           | Yes      | Name of the work                                                                                                                                                                                                                  |
| `body`         |           | `string`           | No       | Text content or description                                                                                                                                                                                                       |
| `author`       |           | `string`           | No       | Who created the work                                                                                                                                                                                                              |
| `url`          | URL       | `url`              | No       | Web address                                                                                                                                                                                                                       |
| `description`  |           | `string`           | No       | Summary or blurb                                                                                                                                                                                                                  |
| `publisher`    |           | `string`           | No       | Who published the work                                                                                                                                                                                                            |
| `published_at` | Published | `datetime`         | No       | When originally published or released                                                                                                                                                                                             |
| `image_url`    | Image URL | `url`              | No       | Cover art, poster, or thumbnail                                                                                                                                                                                                   |
| `language`     |           | `string` (`bcp47`) | No       | BCP 47 language code                                                                                                                                                                                                              |
| `progress`     |           | `status`           | No       | Where the owner is with the work: want to read, watch, listen to or play it, started, finished, or gave up. Values: `planned` in `not_started`, `started` in `in_progress`, `finished` in `completed`, `abandoned` in `canceled`. |
| `rating`       |           | `integer` (1 to 5) | No       | The owner's overall view of the work, from 1 (lowest) to 5 (highest)                                                                                                                                                              |
| `notes`        |           | `string`           | No       | Personal annotations                                                                                                                                                                                                              |
| `thumbnail`    |           | `thumbnail`        | No       | A small preview of the work, supplied by the writer                                                                                                                                                                               |

## Settings

| Setting                                            | Value                                                                               |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `plural`                                           | Media                                                                               |
| [`title_field`](/catalog/type-rules#display-hints) | `title`                                                                             |
| [`body_field`](/catalog/type-rules#display-hints)  | `body`                                                                              |
| [`icon`](/catalog/type-rules#display-hints)        | `lucide:library-big`                                                                |
| [`merge_policy`](/catalog/type-rules#merge-policy) | `keep_both_copies` for `body` and `notes`; `last_writer_wins` for every other field |

## Subtypes

### core.media.album [#core-media-album]

An album. Inherits all core.media fields.

| Setting                                     | Value           |
| ------------------------------------------- | --------------- |
| `plural`                                    | Albums          |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:disc-3` |
| [`roles`](/catalog/type-rules#roles)        | `container`     |

| Field          | Label  | Kind      | Required | Description                           |
| -------------- | ------ | --------- | -------- | ------------------------------------- |
| `release_type` |        | `string`  | No       | Recommended values: album, ep, single |
| `num_tracks`   | Tracks | `integer` | No       | Total track count                     |

### core.media.article [#core-media-article]

An article. Inherits all core.media fields.

| Setting                                     | Value              |
| ------------------------------------------- | ------------------ |
| `plural`                                    | Articles           |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:newspaper` |

| Field        | Label | Kind      | Required | Description                           |
| ------------ | ----- | --------- | -------- | ------------------------------------- |
| `body`       |       | `string`  | No       | The article text                      |
| `doi`        | DOI   | `string`  | No       | Digital Object Identifier (ISO 26324) |
| `section`    |       | `string`  | No       | Section of the publication            |
| `word_count` | Words | `integer` | No       | Word count                            |

### core.media.book [#core-media-book]

A book. Inherits all core.media fields.

| Setting                                     | Value              |
| ------------------------------------------- | ------------------ |
| `plural`                                    | Books              |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:book-open` |

| Field        | Label | Kind      | Required | Description                                   |
| ------------ | ----- | --------- | -------- | --------------------------------------------- |
| `isbn`       | ISBN  | `string`  | No       | International Standard Book Number (ISO 2108) |
| `page_count` | Pages | `integer` | No       | Number of pages                               |
| `edition`    |       | `string`  | No       | Edition designation                           |

### core.media.episode [#core-media-episode]

Any member of an ongoing series: a TV episode, a podcast episode, one part of a serial. Inherits all core.media fields. Joins its series through the in-collection edge, so one episode can belong to several series and outlives any of them.

| Setting                                     | Value                |
| ------------------------------------------- | -------------------- |
| `plural`                                    | Episodes             |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:circle-play` |

| Field            | Label     | Kind      | Required | Description                                                                                                                                                                     |
| ---------------- | --------- | --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `medium`         |           | `enum`    | No       | What the episode is made of. Values: `tv`, `podcast`, `radio`, `video`, `mixed`.                                                                                                |
| `season_number`  |           | `integer` | No       | Which season, where the series has them                                                                                                                                         |
| `episode_number` |           | `integer` | No       | Position within the season, or within the series when unseasoned                                                                                                                |
| `duration`       |           | `number`  | No       | Runtime in seconds                                                                                                                                                              |
| `media_url`      | Media URL | `url`     | No       | Direct address of the media file itself: an episode's audio or video enclosure, a track's audio file, a film's stream. Distinct from url, which is the web page about the work. |
| `mime_type`      | MIME Type | `string`  | No       | MIME type of the resource at media_url, such as audio/mpeg or video/mp4. Describes what media_url points at, not what this item is.                                             |

### core.media.film [#core-media-film]

A film. Inherits all core.media fields.

| Setting                                     | Value         |
| ------------------------------------------- | ------------- |
| `plural`                                    | Films         |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:film` |

| Field            | Label     | Kind     | Required | Description                                                                                                                                                                     |
| ---------------- | --------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `duration`       |           | `number` | No       | Runtime in seconds                                                                                                                                                              |
| `director`       |           | `string` | No       | Primary director                                                                                                                                                                |
| `content_rating` |           | `string` | No       | Age or content classification                                                                                                                                                   |
| `media_url`      | Media URL | `url`    | No       | Direct address of the media file itself: an episode's audio or video enclosure, a track's audio file, a film's stream. Distinct from url, which is the web page about the work. |
| `mime_type`      | MIME Type | `string` | No       | MIME type of the resource at media_url, such as audio/mpeg or video/mp4. Describes what media_url points at, not what this item is.                                             |

### core.media.game [#core-media-game]

A video, board or card game. Inherits all core.media fields.

| Setting                                     | Value              |
| ------------------------------------------- | ------------------ |
| `plural`                                    | Games              |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:gamepad-2` |

| Field         | Label           | Kind                   | Required | Description                                                         |
| ------------- | --------------- | ---------------------- | -------- | ------------------------------------------------------------------- |
| `platforms`   |                 | `array` of `string`    | No       | What the game is played on, such as Nintendo Switch, PC or Tabletop |
| `min_players` | Minimum Players | `integer` (at least 1) | No       | Fewest players the game supports                                    |
| `max_players` | Maximum Players | `integer` (at least 1) | No       | Most players the game supports                                      |

### core.media.series [#core-media-series]

Any ongoing media container: a TV show, a podcast, a radio serial, a video series. Inherits all core.media fields. Episodes join it through the in-collection edge; containment is never part of a type name.

| Setting                                     | Value       |
| ------------------------------------------- | ----------- |
| `plural`                                    | Series      |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:tv` |
| [`roles`](/catalog/type-rules#roles)        | `container` |

| Field    | Kind   | Required | Description                                                                                |
| -------- | ------ | -------- | ------------------------------------------------------------------------------------------ |
| `medium` | `enum` | No       | What the series is made of. Values: `tv`, `podcast`, `radio`, `video`, `mixed`.            |
| `status` | `enum` | No       | Whether the series is still producing new members. Values: `ongoing`, `ended`, `canceled`. |

### core.media.song [#core-media-song]

A song. Inherits all core.media fields.

| Setting                                     | Value                |
| ------------------------------------------- | -------------------- |
| `plural`                                    | Songs                |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:audio-lines` |

| Field          | Label     | Kind      | Required | Description                                                                                                                                                                     |
| -------------- | --------- | --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `duration`     |           | `number`  | No       | Track length in seconds                                                                                                                                                         |
| `isrc`         | ISRC      | `string`  | No       | International Standard Recording Code (ISO 3901)                                                                                                                                |
| `album`        |           | `string`  | No       | Containing album name                                                                                                                                                           |
| `track_number` |           | `integer` | No       | Position within the album                                                                                                                                                       |
| `media_url`    | Media URL | `url`     | No       | Direct address of the media file itself: an episode's audio or video enclosure, a track's audio file, a film's stream. Distinct from url, which is the web page about the work. |
| `mime_type`    | MIME Type | `string`  | No       | MIME type of the resource at media_url, such as audio/mpeg or video/mp4. Describes what media_url points at, not what this item is.                                             |
