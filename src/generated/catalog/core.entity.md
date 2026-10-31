## Fields

| Field                        | Label         | Kind                | Required | Description                                                                                                 |
| ---------------------------- | ------------- | ------------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| `name`                       |               | `string`            | Yes      | Display name                                                                                                |
| `url`                        | URL           | `url`               | No       | Web address                                                                                                 |
| `description`                |               | `string`            | No       | What the entity is                                                                                          |
| `emails`                     |               | `array` of `object` | No       | Email addresses. The first entry is the main one, and an entry's label is free text, such as work or home.  |
| `emails[].value`             | Email         | `email`             | Yes      | The email address                                                                                           |
| `emails[].label`             |               | `string`            | No       | What the entry is for, such as work or home                                                                 |
| `phones`                     | Phone Numbers | `array` of `object` | No       | Phone numbers. The first entry is the main one, and an entry's label is free text, such as work or home.    |
| `phones[].value`             | Number        | `string` (`phone`)  | Yes      | The phone number, in E.164 form where known                                                                 |
| `phones[].label`             |               | `string`            | No       | What the entry is for, such as work or home                                                                 |
| `addresses`                  |               | `array` of `object` | No       | Postal addresses. The first entry is the main one, and an entry's label is free text, such as work or home. |
| `addresses[].label`          |               | `string`            | No       | What the entry is for, such as work or home                                                                 |
| `addresses[].street_address` |               | `string`            | No       | Street line                                                                                                 |
| `addresses[].locality`       |               | `string`            | No       | City or town                                                                                                |
| `addresses[].region`         |               | `string`            | No       | State, province, or county                                                                                  |
| `addresses[].postal_code`    |               | `string`            | No       | Postcode or ZIP code                                                                                        |
| `addresses[].country`        |               | `string`            | No       | Country name or code                                                                                        |
| `image_url`                  | Image URL     | `url`               | No       | Logo or brand image                                                                                         |
| `legal_name`                 |               | `string`            | No       | Official registered name                                                                                    |
| `founded`                    |               | `date`              | No       | Founding date (ISO 8601)                                                                                    |
| `notes`                      |               | `string`            | No       | Personal annotations                                                                                        |

## Settings

| Setting                                                | Value                              |
| ------------------------------------------------------ | ---------------------------------- |
| `plural`                                               | Entities                           |
| [`title_field`](/catalog/your-own-types#display-hints) | `name`                             |
| [`icon`](/catalog/your-own-types#display-hints)        | `lucide:shapes`                    |
| [`merge_policy`](/catalog/your-own-types#merge-policy) | `last_writer_wins` for every field |

## Subtypes

### core.entity.person [#core-entity-person]

Contact information for an individual. Inherits all core.entity fields.

| Setting                                         | Value         |
| ----------------------------------------------- | ------------- |
| `plural`                                        | People        |
| [`icon`](/catalog/your-own-types#display-hints) | `lucide:user` |

| Field          | Kind     | Required | Description                        |
| -------------- | -------- | -------- | ---------------------------------- |
| `given_name`   | `string` | No       | Given (first) name                 |
| `family_name`  | `string` | No       | Family (last) name                 |
| `middle_name`  | `string` | No       | Middle or additional name          |
| `prefix`       | `string` | No       | Honorific prefix (Dr, Mr, Prof)    |
| `suffix`       | `string` | No       | Honorific suffix (PhD, Jr, OBE)    |
| `nickname`     | `string` | No       | Familiar name or alias             |
| `organization` | `string` | No       | Associated organization            |
| `job_title`    | `string` | No       | Position or job title              |
| `department`   | `string` | No       | Department within the organization |
| `birthday`     | `date`   | No       | Date of birth (ISO 8601)           |
| `pronouns`     | `string` | No       | Pronouns                           |

### core.entity.place [#core-entity-place]

A location or venue. Inherits all core.entity fields.

| Setting                                         | Value            |
| ----------------------------------------------- | ---------------- |
| `plural`                                        | Places           |
| [`icon`](/catalog/your-own-types#display-hints) | `lucide:map-pin` |

| Field            | Label     | Kind                 | Required | Description                        |
| ---------------- | --------- | -------------------- | -------- | ---------------------------------- |
| `street_address` |           | `string`             | No       | Street line                        |
| `locality`       |           | `string`             | No       | City or town                       |
| `region`         |           | `string`             | No       | State, province, or county         |
| `postal_code`    |           | `string`             | No       | Postcode or ZIP code               |
| `country`        |           | `string` (`iso3166`) | No       | ISO 3166-1 alpha-2 country code    |
| `timezone`       | Time Zone | `string`             | No       | IANA timezone                      |
| `latitude`       |           | `number`             | No       | Subject latitude                   |
| `longitude`      |           | `number`             | No       | Subject longitude                  |
| `altitude`       |           | `number`             | No       | Altitude in meters above sea level |
