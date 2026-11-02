## Fields

| Field          | Kind               | Description                                                                                                                                                                                                             |
| -------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`        | `string`, required | The name of the work.                                                                                                                                                                                                   |
| `body`         | `string`           | The text of the work, or a longer write-up of it.                                                                                                                                                                       |
| `author`       | `string`           | Who made the work.                                                                                                                                                                                                      |
| `url`          | `url`              | Web address. Label: URL.                                                                                                                                                                                                |
| `description`  | `string`           | A short summary or blurb.                                                                                                                                                                                               |
| `publisher`    | `string`           | Who published the work.                                                                                                                                                                                                 |
| `published_at` | `datetime`         | When originally published or released. Label: Published.                                                                                                                                                                |
| `image_url`    | `url`              | Cover art, poster, or thumbnail. Label: Image URL.                                                                                                                                                                      |
| `language`     | `string` (`bcp47`) | BCP 47 language code.                                                                                                                                                                                                   |
| `progress`     | `status`           | Where you are with the work, such as whether you have started or finished it. Values: `planned` (group `not_started`), `started` (group `in_progress`), `finished` (group `completed`), `abandoned` (group `canceled`). |
| `rating`       | `integer` (1 to 5) | Your overall view of the work, from 1 (lowest) to 5 (highest).                                                                                                                                                          |
| `notes`        | `string`           | Your own comments, kept apart from the work's details.                                                                                                                                                                  |
| `thumbnail`    | `thumbnail`        | A small preview of the work, supplied by whoever saved it.                                                                                                                                                              |

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

A music album, EP or single.

| Setting                                     | Value           |
| ------------------------------------------- | --------------- |
| `plural`                                    | Albums          |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:disc-3` |
| [`roles`](/catalog/type-rules#roles)        | `container`     |

| Field          | Kind      | Description                                       |
| -------------- | --------- | ------------------------------------------------- |
| `release_type` | `string`  | The kind of release, such as album, ep or single. |
| `num_tracks`   | `integer` | Total track count. Label: Tracks.                 |

### core.media.article [#core-media-article]

An article, such as a blog post or a news story.

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

A book, with details such as its ISBN and page count.

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

One episode of a TV show, a podcast or another series.

| Setting                                     | Value                |
| ------------------------------------------- | -------------------- |
| `plural`                                    | Episodes             |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:circle-play` |

| Field            | Kind      | Description                                                                                                                                           |
| ---------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `medium`         | `enum`    | What kind of episode it is. Values: `tv`, `podcast`, `radio`, `video`, `mixed`.                                                                       |
| `season_number`  | `integer` | Which season, where the series has them.                                                                                                              |
| `episode_number` | `integer` | Position within the season, or within the series when unseasoned.                                                                                     |
| `duration`       | `number`  | Runtime in seconds.                                                                                                                                   |
| `media_url`      | `url`     | The address of the media file itself, such as an audio file or a video stream. Unlike `url`, it is not the web page about the work. Label: Media URL. |
| `mime_type`      | `string`  | The MIME type of the file at `media_url`, such as audio/mpeg or video/mp4. Label: MIME Type.                                                          |

### core.media.film [#core-media-film]

A film.

| Setting                                     | Value         |
| ------------------------------------------- | ------------- |
| `plural`                                    | Films         |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:film` |

| Field            | Kind     | Description                                                                                                                                           |
| ---------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `duration`       | `number` | Runtime in seconds.                                                                                                                                   |
| `director`       | `string` | Primary director.                                                                                                                                     |
| `content_rating` | `string` | Age or content classification.                                                                                                                        |
| `media_url`      | `url`    | The address of the media file itself, such as an audio file or a video stream. Unlike `url`, it is not the web page about the work. Label: Media URL. |
| `mime_type`      | `string` | The MIME type of the file at `media_url`, such as audio/mpeg or video/mp4. Label: MIME Type.                                                          |

### core.media.game [#core-media-game]

A video game, board game or card game.

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

A TV show, podcast, radio serial or video series that is made of episodes.

| Setting                                     | Value       |
| ------------------------------------------- | ----------- |
| `plural`                                    | Series      |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:tv` |
| [`roles`](/catalog/type-rules#roles)        | `container` |

| Field    | Kind   | Description                                                                                 |
| -------- | ------ | ------------------------------------------------------------------------------------------- |
| `medium` | `enum` | What kind of series it is. Values: `tv`, `podcast`, `radio`, `video`, `mixed`.              |
| `status` | `enum` | Whether the series is still producing new episodes. Values: `ongoing`, `ended`, `canceled`. |

### core.media.song [#core-media-song]

A song.

| Setting                                     | Value                |
| ------------------------------------------- | -------------------- |
| `plural`                                    | Songs                |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:audio-lines` |

| Field          | Kind      | Description                                                                                                                                           |
| -------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `duration`     | `number`  | Track length in seconds.                                                                                                                              |
| `isrc`         | `string`  | International Standard Recording Code (ISO 3901). Label: ISRC.                                                                                        |
| `album`        | `string`  | Containing album name.                                                                                                                                |
| `track_number` | `integer` | Position within the album.                                                                                                                            |
| `media_url`    | `url`     | The address of the media file itself, such as an audio file or a video stream. Unlike `url`, it is not the web page about the work. Label: Media URL. |
| `mime_type`    | `string`  | The MIME type of the file at `media_url`, such as audio/mpeg or video/mp4. Label: MIME Type.                                                          |
