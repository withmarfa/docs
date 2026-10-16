- **Type:** `core.media`
- **Required:** `title`
- **Title field:** `title`
- **Body field:** `body`
- **[Merge policy](/catalog/your-own-types#merge-policy):** `body` and `notes` `keep_both_copies`; every other field `last_writer_wins`

| Field          | Kind               | Required | Description                           |
| -------------- | ------------------ | -------- | ------------------------------------- |
| `title`        | `string`           | Yes      | Name of the work                      |
| `body`         | `string`           |          | Text content or description           |
| `author`       | `string`           |          | Who created the work                  |
| `url`          | `url`              |          | Web address                           |
| `description`  | `string`           |          | Summary or blurb                      |
| `publisher`    | `string`           |          | Who published the work                |
| `published_at` | `datetime`         |          | When originally published or released |
| `image_url`    | `url`              |          | Cover art, poster, or thumbnail       |
| `language`     | `string` (`bcp47`) |          | BCP 47 language code                  |
| `notes`        | `string`           |          | Personal annotations                  |

## core.media.album [#core-media-album]

An album. Inherits all core.media fields.

- **[Roles](/catalog/your-own-types#roles):** `container`

| Field          | Kind      | Required | Description                           |
| -------------- | --------- | -------- | ------------------------------------- |
| `release_type` | `string`  |          | Recommended values: album, ep, single |
| `num_tracks`   | `integer` |          | Total track count                     |

## core.media.article [#core-media-article]

An article. Inherits all core.media fields.

- **Also required:** `body`

| Field        | Kind      | Required | Description                |
| ------------ | --------- | -------- | -------------------------- |
| `body`       | `string`  | Yes      | The article text           |
| `section`    | `string`  |          | Section of the publication |
| `word_count` | `integer` |          | Word count                 |

## core.media.book [#core-media-book]

A book. Inherits all core.media fields.

| Field        | Kind      | Required | Description                                   |
| ------------ | --------- | -------- | --------------------------------------------- |
| `isbn`       | `string`  |          | International Standard Book Number (ISO 2108) |
| `page_count` | `integer` |          | Number of pages                               |
| `edition`    | `string`  |          | Edition designation                           |

## core.media.episode [#core-media-episode]

Any member of an ongoing series: a TV episode, a podcast episode, one part of a serial. Inherits all core.media fields. Joins its series through the in-collection edge, so one episode can belong to several series and outlives any of them.

| Field            | Kind                                                 | Required | Description                                                                                                                                                                     |
| ---------------- | ---------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `medium`         | `enum` of `tv`, `podcast`, `radio`, `video`, `mixed` |          | What the episode is made of.                                                                                                                                                    |
| `season_number`  | `integer`                                            |          | Which season, where the series has them                                                                                                                                         |
| `episode_number` | `integer`                                            |          | Position within the season, or within the series when unseasoned                                                                                                                |
| `duration`       | `number`                                             |          | Runtime in seconds                                                                                                                                                              |
| `media_url`      | `url`                                                |          | Direct address of the media file itself: an episode's audio or video enclosure, a track's audio file, a film's stream. Distinct from url, which is the web page about the work. |
| `mime_type`      | `string`                                             |          | MIME type of the resource at media_url, such as audio/mpeg or video/mp4. Describes what media_url points at, not what this item is.                                             |

## core.media.film [#core-media-film]

A film. Inherits all core.media fields.

| Field            | Kind     | Required | Description                                                                                                                                                                     |
| ---------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `duration`       | `number` |          | Runtime in seconds                                                                                                                                                              |
| `director`       | `string` |          | Primary director                                                                                                                                                                |
| `content_rating` | `string` |          | Age or content classification                                                                                                                                                   |
| `media_url`      | `url`    |          | Direct address of the media file itself: an episode's audio or video enclosure, a track's audio file, a film's stream. Distinct from url, which is the web page about the work. |
| `mime_type`      | `string` |          | MIME type of the resource at media_url, such as audio/mpeg or video/mp4. Describes what media_url points at, not what this item is.                                             |

## core.media.series [#core-media-series]

Any ongoing media container: a TV show, a podcast, a radio serial, a video series. Inherits all core.media fields. Episodes join it through the in-collection edge; containment is never part of a type name.

- **[Roles](/catalog/your-own-types#roles):** `container`

| Field    | Kind                                                 | Required | Description                                        |
| -------- | ---------------------------------------------------- | -------- | -------------------------------------------------- |
| `medium` | `enum` of `tv`, `podcast`, `radio`, `video`, `mixed` |          | What the series is made of.                        |
| `status` | `enum` of `ongoing`, `ended`, `canceled`             |          | Whether the series is still producing new members. |

## core.media.song [#core-media-song]

A song. Inherits all core.media fields.

| Field          | Kind      | Required | Description                                                                                                                                                                     |
| -------------- | --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `duration`     | `number`  |          | Track length in seconds                                                                                                                                                         |
| `isrc`         | `string`  |          | International Standard Recording Code (ISO 3901)                                                                                                                                |
| `album`        | `string`  |          | Containing album name                                                                                                                                                           |
| `track_number` | `integer` |          | Position within the album                                                                                                                                                       |
| `media_url`    | `url`     |          | Direct address of the media file itself: an episode's audio or video enclosure, a track's audio file, a film's stream. Distinct from url, which is the web page about the work. |
| `mime_type`    | `string`  |          | MIME type of the resource at media_url, such as audio/mpeg or video/mp4. Describes what media_url points at, not what this item is.                                             |
