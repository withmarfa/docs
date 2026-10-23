## Fields

| Field          | Kind               | Required | Description                                         |
| -------------- | ------------------ | -------- | --------------------------------------------------- |
| `title`        | `string`           | Yes      | Name of the work                                    |
| `body`         | `string`           | No       | Text content or description                         |
| `author`       | `string`           | No       | Who created the work                                |
| `url`          | `url`              | No       | Web address                                         |
| `description`  | `string`           | No       | Summary or blurb                                    |
| `publisher`    | `string`           | No       | Who published the work                              |
| `published_at` | `datetime`         | No       | When originally published or released               |
| `image_url`    | `url`              | No       | Cover art, poster, or thumbnail                     |
| `language`     | `string` (`bcp47`) | No       | BCP 47 language code                                |
| `notes`        | `string`           | No       | Personal annotations                                |
| `thumbnail`    | `thumbnail`        | No       | A small preview of the work, supplied by the writer |

## Settings

| Setting                                                | Value                                                                               |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| [`title_field`](/catalog/your-own-types#fields)        | `title`                                                                             |
| [`body_field`](/catalog/your-own-types#fields)         | `body`                                                                              |
| [`merge_policy`](/catalog/your-own-types#merge-policy) | `keep_both_copies` for `body` and `notes`; `last_writer_wins` for every other field |

## Subtypes

### core.media.album [#core-media-album]

An album. Inherits all core.media fields.

| Setting                                  | Value       |
| ---------------------------------------- | ----------- |
| [`roles`](/catalog/your-own-types#roles) | `container` |

| Field          | Kind      | Required | Description                           |
| -------------- | --------- | -------- | ------------------------------------- |
| `release_type` | `string`  | No       | Recommended values: album, ep, single |
| `num_tracks`   | `integer` | No       | Total track count                     |

### core.media.article [#core-media-article]

An article. Inherits all core.media fields.

| Field        | Kind      | Required | Description                |
| ------------ | --------- | -------- | -------------------------- |
| `body`       | `string`  | Yes      | The article text           |
| `section`    | `string`  | No       | Section of the publication |
| `word_count` | `integer` | No       | Word count                 |

### core.media.book [#core-media-book]

A book. Inherits all core.media fields.

| Field        | Kind      | Required | Description                                   |
| ------------ | --------- | -------- | --------------------------------------------- |
| `isbn`       | `string`  | No       | International Standard Book Number (ISO 2108) |
| `page_count` | `integer` | No       | Number of pages                               |
| `edition`    | `string`  | No       | Edition designation                           |

### core.media.episode [#core-media-episode]

Any member of an ongoing series: a TV episode, a podcast episode, one part of a serial. Inherits all core.media fields. Joins its series through the in-collection edge, so one episode can belong to several series and outlives any of them.

| Field            | Kind      | Required | Description                                                                                                                                                                     |
| ---------------- | --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `medium`         | `enum`    | No       | What the episode is made of. Values: `tv`, `podcast`, `radio`, `video`, `mixed`.                                                                                                |
| `season_number`  | `integer` | No       | Which season, where the series has them                                                                                                                                         |
| `episode_number` | `integer` | No       | Position within the season, or within the series when unseasoned                                                                                                                |
| `duration`       | `number`  | No       | Runtime in seconds                                                                                                                                                              |
| `media_url`      | `url`     | No       | Direct address of the media file itself: an episode's audio or video enclosure, a track's audio file, a film's stream. Distinct from url, which is the web page about the work. |
| `mime_type`      | `string`  | No       | MIME type of the resource at media_url, such as audio/mpeg or video/mp4. Describes what media_url points at, not what this item is.                                             |

### core.media.film [#core-media-film]

A film. Inherits all core.media fields.

| Field            | Kind     | Required | Description                                                                                                                                                                     |
| ---------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `duration`       | `number` | No       | Runtime in seconds                                                                                                                                                              |
| `director`       | `string` | No       | Primary director                                                                                                                                                                |
| `content_rating` | `string` | No       | Age or content classification                                                                                                                                                   |
| `media_url`      | `url`    | No       | Direct address of the media file itself: an episode's audio or video enclosure, a track's audio file, a film's stream. Distinct from url, which is the web page about the work. |
| `mime_type`      | `string` | No       | MIME type of the resource at media_url, such as audio/mpeg or video/mp4. Describes what media_url points at, not what this item is.                                             |

### core.media.series [#core-media-series]

Any ongoing media container: a TV show, a podcast, a radio serial, a video series. Inherits all core.media fields. Episodes join it through the in-collection edge; containment is never part of a type name.

| Setting                                  | Value       |
| ---------------------------------------- | ----------- |
| [`roles`](/catalog/your-own-types#roles) | `container` |

| Field    | Kind   | Required | Description                                                                                |
| -------- | ------ | -------- | ------------------------------------------------------------------------------------------ |
| `medium` | `enum` | No       | What the series is made of. Values: `tv`, `podcast`, `radio`, `video`, `mixed`.            |
| `status` | `enum` | No       | Whether the series is still producing new members. Values: `ongoing`, `ended`, `canceled`. |

### core.media.song [#core-media-song]

A song. Inherits all core.media fields.

| Field          | Kind      | Required | Description                                                                                                                                                                     |
| -------------- | --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `duration`     | `number`  | No       | Track length in seconds                                                                                                                                                         |
| `isrc`         | `string`  | No       | International Standard Recording Code (ISO 3901)                                                                                                                                |
| `album`        | `string`  | No       | Containing album name                                                                                                                                                           |
| `track_number` | `integer` | No       | Position within the album                                                                                                                                                       |
| `media_url`    | `url`     | No       | Direct address of the media file itself: an episode's audio or video enclosure, a track's audio file, a film's stream. Distinct from url, which is the web page about the work. |
| `mime_type`    | `string`  | No       | MIME type of the resource at media_url, such as audio/mpeg or video/mp4. Describes what media_url points at, not what this item is.                                             |
