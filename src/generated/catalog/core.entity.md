## Fields

| Field                        | Kind                         | Description                                                                                                                    |
| ---------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `name`                       | `string`, required           | Display name.                                                                                                                  |
| `url`                        | `url`                        | Web address. Label: URL.                                                                                                       |
| `description`                | `string`                     | What the entity is.                                                                                                            |
| `emails`                     | `array` of `object`          | Email addresses. The first entry is the main one, and an entry's label is free text, such as work or home.                     |
| `emails[].value`             | `email`, required            | The email address. Label: Email.                                                                                               |
| `emails[].label`             | `string`                     | What the entry is for, such as work or home.                                                                                   |
| `phones`                     | `array` of `object`          | Phone numbers. The first entry is the main one, and an entry's label is free text, such as work or home. Label: Phone Numbers. |
| `phones[].value`             | `string` (`phone`), required | The phone number, in E.164 form where known. Label: Number.                                                                    |
| `phones[].label`             | `string`                     | What the entry is for, such as work or home.                                                                                   |
| `addresses`                  | `array` of `object`          | Postal addresses. The first entry is the main one, and an entry's label is free text, such as work or home.                    |
| `addresses[].label`          | `string`                     | What the entry is for, such as work or home.                                                                                   |
| `addresses[].street_address` | `string`                     | Street line.                                                                                                                   |
| `addresses[].locality`       | `string`                     | City or town.                                                                                                                  |
| `addresses[].region`         | `string`                     | State, province, or county.                                                                                                    |
| `addresses[].postal_code`    | `string`                     | Postcode or ZIP code.                                                                                                          |
| `addresses[].country`        | `string`                     | Country name or code.                                                                                                          |
| `image_url`                  | `url`                        | Logo or brand image. Label: Image URL.                                                                                         |
| `legal_name`                 | `string`                     | Official registered name.                                                                                                      |
| `founded`                    | `date`                       | Founding date (ISO 8601).                                                                                                      |
| `notes`                      | `string`                     | Personal annotations.                                                                                                          |

## Settings

| Setting                                            | Value                              |
| -------------------------------------------------- | ---------------------------------- |
| `plural`                                           | Entities                           |
| [`title_field`](/catalog/type-rules#display-hints) | `name`                             |
| [`icon`](/catalog/type-rules#display-hints)        | `lucide:shapes`                    |
| [`merge_policy`](/catalog/type-rules#merge-policy) | `last_writer_wins` for every field |

## Subtypes

### core.entity.person [#core-entity-person]

Contact information for an individual. Inherits all core.entity fields.

| Setting                                     | Value         |
| ------------------------------------------- | ------------- |
| `plural`                                    | People        |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:user` |

| Field          | Kind     | Description                         |
| -------------- | -------- | ----------------------------------- |
| `given_name`   | `string` | Given (first) name.                 |
| `family_name`  | `string` | Family (last) name.                 |
| `middle_name`  | `string` | Middle or additional name.          |
| `prefix`       | `string` | Honorific prefix (Dr, Mr, Prof).    |
| `suffix`       | `string` | Honorific suffix (PhD, Jr, OBE).    |
| `nickname`     | `string` | Familiar name or alias.             |
| `organization` | `string` | Associated organization.            |
| `job_title`    | `string` | Position or job title.              |
| `department`   | `string` | Department within the organization. |
| `birthday`     | `date`   | Date of birth (ISO 8601).           |
| `pronouns`     | `string` | Pronouns.                           |

### core.entity.place [#core-entity-place]

A location or venue. Inherits all core.entity fields.

| Setting                                     | Value            |
| ------------------------------------------- | ---------------- |
| `plural`                                    | Places           |
| [`icon`](/catalog/type-rules#display-hints) | `lucide:map-pin` |

| Field            | Kind                 | Description                         |
| ---------------- | -------------------- | ----------------------------------- |
| `street_address` | `string`             | Street line.                        |
| `locality`       | `string`             | City or town.                       |
| `region`         | `string`             | State, province, or county.         |
| `postal_code`    | `string`             | Postcode or ZIP code.               |
| `country`        | `string` (`iso3166`) | ISO 3166-1 alpha-2 country code.    |
| `timezone`       | `string`             | IANA timezone. Label: Time Zone.    |
| `latitude`       | `number`             | Subject latitude.                   |
| `longitude`      | `number`             | Subject longitude.                  |
| `altitude`       | `number`             | Altitude in meters above sea level. |
