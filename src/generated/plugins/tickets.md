- **Family:** Tickets (`tickets`)
- **Version:** none
- **Mark:** `lucide:ticket`
- **Maker:** WithMarfa
- **Oldest Marfa:** 0.0.92
- **Description:** Track work and questions as tickets, from backlog to done, with epics, features, spikes and tasks.

## Types

| Type                    | Label   | Kind or group | Parent                       | Mark                   | Description                                                                                                       |
| ----------------------- | ------- | ------------- | ---------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `common.ticket`         | Ticket  | group         | [`core.task`](/catalog/task) | `lucide:ticket`        | Groups the ticket kinds: work someone wants done, or a question they want answered, tracked from backlog to done. |
| `common.ticket.epic`    | Epic    | kind          | `common.ticket`              | `lucide:flag`          | An outcome that finishes, made of several tickets: the one kind of ticket that has tickets beneath it.            |
| `common.ticket.feature` | Feature | kind          | `common.ticket`              | `lucide:sparkles`      | A change that people using a product or service would notice, such as something new they can do.                  |
| `common.ticket.spike`   | Spike   | kind          | `common.ticket`              | `lucide:flask-conical` | A question to answer before deciding or building, with the answer kept on the ticket.                             |
| `common.ticket.task`    | Task    | kind          | `common.ticket`              | `lucide:wrench`        | Work that is neither a feature nor a question, such as upkeep, setup or a fix.                                    |

## Fields

| Type            | Field    | Kind     | Description                                                     |
| --------------- | -------- | -------- | --------------------------------------------------------------- |
| `common.ticket` | `status` | `status` | Where the ticket stands, from backlog to completed or canceled. |

## Status words

| Type            | Word      | Group         | Description                       |
| --------------- | --------- | ------------- | --------------------------------- |
| `common.ticket` | `backlog` | `not_started` | Wanted, but not yet committed to. |

## Display hints

| Type                    | Hint          | Value   |
| ----------------------- | ------------- | ------- |
| `common.ticket`         | `title_field` | `title` |
| `common.ticket`         | `body_field`  | `body`  |
| `common.ticket.epic`    | `title_field` | `title` |
| `common.ticket.epic`    | `body_field`  | `body`  |
| `common.ticket.feature` | `title_field` | `title` |
| `common.ticket.feature` | `body_field`  | `body`  |
| `common.ticket.spike`   | `title_field` | `title` |
| `common.ticket.spike`   | `body_field`  | `body`  |
| `common.ticket.task`    | `title_field` | `title` |
| `common.ticket.task`    | `body_field`  | `body`  |

## Guidance

### `common.ticket`

**Use for:** asking for every ticket at once. A ticket is work someone wants done, or a question they want answered, tracked until it is finished or dropped. Write each one as a kind, never as a plain ticket: `common.ticket.epic`, `.feature`, `.spike` or `.task`.

**Not for:** a personal to-do or reminder, which is a `core.task`; a record of work already done, which is a note; an issue another tracker holds, which its connector brings in under its own type.

**Body:** `title` names the work, `description` is the line a board shows, and `body` holds the detail. A ticket's steps are a list in its body, not more tickets. `status` is `backlog` while parked, `not_started` once committed, then `in_progress`, `completed` or `canceled`; keep finished tickets. `assignees` names who is doing it.

**Edges:** `parent-of` runs from an epic to each of its tickets, and a ticket has at most one parent. `derived-from` runs from the ticket to what it was made from, such as a note, a message or a spike.

### `common.ticket.epic`

**Use for:** an outcome that needs several tickets and is worth following as a whole. It is `completed` when the outcome is reached.

**Not for:** one piece of work, which is a feature or a task; an area that never finishes, which is a collection.

**Body:** `description` says the outcome in plain words. `body` says what will be different and how to tell it is done. Do not list its tickets in the body: the edges hold them.

**Edges:** `parent-of` runs from the epic to each of its tickets; from a ticket it reads as `child-of`. Moving an epic to the bin moves its tickets too.

### `common.ticket.feature`

**Use for:** a change that people using a product or service would notice: something new they can do, or a change to something they already do.

**Not for:** a question to answer first, which is a spike; a fix to something that should already work, or work nobody using it would notice, which is a task; an outcome made of several pieces, which is an epic.

**Body:** `description` says what will be different for the person using it. `body` says why it matters, what it must do and how to tell it is done.

### `common.ticket.spike`

**Use for:** something to find out before deciding or building, such as research, a trial or a comparison.

**Not for:** the work the answer leads to, which is a feature or a task of its own.

**Body:** `description` is the question, asked so that it can be answered. `body` says why it matters now, and holds the answer once it is found. The spike is `completed` when the question is answered, even when the answer is no.

**Edges:** work the answer leads to points back at the spike with `derived-from`.

### `common.ticket.task`

**Use for:** work that needs doing and is neither a feature nor a question, such as upkeep, setup, cleanup or a fix to something that should already work.

**Not for:** a personal to-do or reminder, which is a `core.task`.

**Body:** `description` says what is true once it is done. `body` says why it is needed and anything the person doing it must know.
