## Fields

| Field          | Kind               | Description                                                                                                                                                                                                                                           |
| -------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`        | `string`, required | Name of the work.                                                                                                                                                                                                                                     |
| `body`         | `string`           | Text content or description.                                                                                                                                                                                                                          |
| `author`       | `string`           | Who created the work.                                                                                                                                                                                                                                 |
| `url`          | `url`              | Web address. Label: URL.                                                                                                                                                                                                                              |
| `description`  | `string`           | Summary or blurb.                                                                                                                                                                                                                                     |
| `publisher`    | `string`           | Who published the work.                                                                                                                                                                                                                               |
| `published_at` | `datetime`         | When originally published or released. Label: Published.                                                                                                                                                                                              |
| `image_url`    | `url`              | Cover art, poster, or thumbnail. Label: Image URL.                                                                                                                                                                                                    |
| `language`     | `string` (`bcp47`) | BCP 47 language code.                                                                                                                                                                                                                                 |
| `progress`     | `status`           | Where the owner is with the work: want to read, watch, listen to or play it, started, finished, or gave up. Values: `planned` (group `not_started`), `started` (group `in_progress`), `finished` (group `completed`), `abandoned` (group `canceled`). |
| `rating`       | `integer` (1 to 5) | The owner's overall view of the work, from 1 (lowest) to 5 (highest).                                                                                                                                                                                 |
| `notes`        | `string`           | Personal annotations.                                                                                                                                                                                                                                 |
| `thumbnail`    | `thumbnail`        | A small preview of the work, supplied by the writer.                                                                                                                                                                                                  |

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

| Field          | Kind      | Description                            |
| -------------- | --------- | -------------------------------------- |
| `release_type` | `string`  | Recommended values: album, ep, single. |
| `num_tracks`   | `integer` | Total track count. Label: Tracks.      |

### core.media.article [#core-media-article]

An article. Inherits all core.media fields.

| Setting                                     | Value              |
| ------------------------------------------- | ------------------ |
| `plural`                                    | Articles           |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:newspaper` |

| Field        | Kind      | Description                                        |
| ------------ | --------- | -------------------------------------------------- |
| `body`       | `string`  | The article text.                                  |
| `doi`        | `string`  | Digital Object Identifier (ISO 26324). Label: DOI. |
| `section`    | `string`  | Section of the publication.                        |
| `word_count` | `integer` | Word count. Label: Words.                          |

### core.media.book [#core-media-book]

A book. Inherits all core.media fields.

| Setting                                     | Value              |
| ------------------------------------------- | ------------------ |
| `plural`                                    | Books              |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:book-open` |

| Field        | Kind      | Description                                                 |
| ------------ | --------- | ----------------------------------------------------------- |
| `isbn`       | `string`  | International Standard Book Number (ISO 2108). Label: ISBN. |
| `page_count` | `integer` | Number of pages. Label: Pages.                              |
| `edition`    | `string`  | Edition designation.                                        |

### core.media.episode [#core-media-episode]

Any member of an ongoing series: a TV episode, a podcast episode, one part of a serial. Inherits all core.media fields. Joins its series through the in-collection edge, so one episode can belong to several series and outlives any of them.

| Setting                                     | Value                |
| ------------------------------------------- | -------------------- |
| `plural`                                    | Episodes             |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:circle-play` |

| Field            | Kind      | Description                                                                                                                                                                                       |
| ---------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `medium`         | `enum`    | What the episode is made of. Values: `tv`, `podcast`, `radio`, `video`, `mixed`.                                                                                                                  |
| `season_number`  | `integer` | Which season, where the series has them.                                                                                                                                                          |
| `episode_number` | `integer` | Position within the season, or within the series when unseasoned.                                                                                                                                 |
| `duration`       | `number`  | Runtime in seconds.                                                                                                                                                                               |
| `media_url`      | `url`     | Direct address of the media file itself: an episode's audio or video enclosure, a track's audio file, a film's stream. Distinct from url, which is the web page about the work. Label: Media URL. |
| `mime_type`      | `string`  | MIME type of the resource at media_url, such as audio/mpeg or video/mp4. Describes what media_url points at, not what this item is. Label: MIME Type.                                             |

### core.media.film [#core-media-film]

A film. Inherits all core.media fields.

| Setting                                     | Value         |
| ------------------------------------------- | ------------- |
| `plural`                                    | Films         |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:film` |

| Field            | Kind     | Description                                                                                                                                                                                       |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `duration`       | `number` | Runtime in seconds.                                                                                                                                                                               |
| `director`       | `string` | Primary director.                                                                                                                                                                                 |
| `content_rating` | `string` | Age or content classification.                                                                                                                                                                    |
| `media_url`      | `url`    | Direct address of the media file itself: an episode's audio or video enclosure, a track's audio file, a film's stream. Distinct from url, which is the web page about the work. Label: Media URL. |
| `mime_type`      | `string` | MIME type of the resource at media_url, such as audio/mpeg or video/mp4. Describes what media_url points at, not what this item is. Label: MIME Type.                                             |

### core.media.game [#core-media-game]

A video, board or card game. Inherits all core.media fields.

| Setting                                     | Value              |
| ------------------------------------------- | ------------------ |
| `plural`                                    | Games              |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:gamepad-2` |

| Field         | Kind                   | Description                                                          |
| ------------- | ---------------------- | -------------------------------------------------------------------- |
| `platforms`   | `array` of `string`    | What the game is played on, such as Nintendo Switch, PC or Tabletop. |
| `min_players` | `integer` (at least 1) | Fewest players the game supports. Label: Minimum Players.            |
| `max_players` | `integer` (at least 1) | Most players the game supports. Label: Maximum Players.              |

### core.media.series [#core-media-series]

Any ongoing media container: a TV show, a podcast, a radio serial, a video series. Inherits all core.media fields. Episodes join it through the in-collection edge; containment is never part of a type name.

| Setting                                     | Value       |
| ------------------------------------------- | ----------- |
| `plural`                                    | Series      |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:tv` |
| [`roles`](/catalog/type-rules#roles)        | `container` |

| Field    | Kind   | Description                                                                                |
| -------- | ------ | ------------------------------------------------------------------------------------------ |
| `medium` | `enum` | What the series is made of. Values: `tv`, `podcast`, `radio`, `video`, `mixed`.            |
| `status` | `enum` | Whether the series is still producing new members. Values: `ongoing`, `ended`, `canceled`. |

### core.media.song [#core-media-song]

A song. Inherits all core.media fields.

| Setting                                     | Value                |
| ------------------------------------------- | -------------------- |
| `plural`                                    | Songs                |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:audio-lines` |

| Field          | Kind      | Description                                                                                                                                                                                       |
| -------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `duration`     | `number`  | Track length in seconds.                                                                                                                                                                          |
| `isrc`         | `string`  | International Standard Recording Code (ISO 3901). Label: ISRC.                                                                                                                                    |
| `album`        | `string`  | Containing album name.                                                                                                                                                                            |
| `track_number` | `integer` | Position within the album.                                                                                                                                                                        |
| `media_url`    | `url`     | Direct address of the media file itself: an episode's audio or video enclosure, a track's audio file, a film's stream. Distinct from url, which is the web page about the work. Label: Media URL. |
| `mime_type`    | `string`  | MIME type of the resource at media_url, such as audio/mpeg or video/mp4. Describes what media_url points at, not what this item is. Label: MIME Type.                                             |
