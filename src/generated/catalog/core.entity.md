## Fields

| Field         | Kind     | Required | Description                       |
| ------------- | -------- | -------- | --------------------------------- |
| `name`        | `string` | Yes      | Display name                      |
| `url`         | `url`    |          | Web address                       |
| `description` | `string` |          | What the entity is                |
| `email`       | `email`  |          | Contact email                     |
| `phone`       | `string` |          | Contact phone (E.164 recommended) |
| `place`       | `string` |          | Location (human-readable address) |
| `image_url`   | `url`    |          | Logo or brand image               |
| `legal_name`  | `string` |          | Official registered name          |
| `founded`     | `date`   |          | Founding date (ISO 8601)          |
| `notes`       | `string` |          | Personal annotations              |

## Settings

| Setting                                                | Value                              |
| ------------------------------------------------------ | ---------------------------------- |
| [`title_field`](/catalog/your-own-types#fields)        | `name`                             |
| [`merge_policy`](/catalog/your-own-types#merge-policy) | `last_writer_wins` for every field |

## Subtypes

### core.entity.person [#core-entity-person]

Contact information for an individual. Inherits all core.entity fields.

| Field          | Kind     | Required | Description                        |
| -------------- | -------- | -------- | ---------------------------------- |
| `given_name`   | `string` |          | Given (first) name                 |
| `family_name`  | `string` |          | Family (last) name                 |
| `middle_name`  | `string` |          | Middle or additional name          |
| `prefix`       | `string` |          | Honorific prefix (Dr, Mr, Prof)    |
| `suffix`       | `string` |          | Honorific suffix (PhD, Jr, OBE)    |
| `nickname`     | `string` |          | Familiar name or alias             |
| `organization` | `string` |          | Associated organization            |
| `job_title`    | `string` |          | Position or job title              |
| `department`   | `string` |          | Department within the organization |
| `birthday`     | `date`   |          | Date of birth (ISO 8601)           |
| `pronouns`     | `string` |          | Pronouns                           |

### core.entity.place [#core-entity-place]

A location or venue. Inherits all core.entity fields.

| Field            | Kind                 | Required | Description                        |
| ---------------- | -------------------- | -------- | ---------------------------------- |
| `street_address` | `string`             |          | Street line                        |
| `locality`       | `string`             |          | City or town                       |
| `region`         | `string`             |          | State, province, or county         |
| `postal_code`    | `string`             |          | Postcode or ZIP code               |
| `country`        | `string` (`iso3166`) |          | ISO 3166-1 alpha-2 country code    |
| `timezone`       | `string`             |          | IANA timezone                      |
| `latitude`       | `number`             |          | Subject latitude                   |
| `longitude`      | `number`             |          | Subject longitude                  |
| `altitude`       | `number`             |          | Altitude in meters above sea level |
