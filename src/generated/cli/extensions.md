An item's extension namespaces.

```text
marfa extensions [OPTIONS] <COMMAND>
```

### marfa extensions list

The extension namespaces an item carries.

```text
marfa extensions list [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item id. |

### marfa extensions get

One namespace's contents.

```text
marfa extensions get [OPTIONS] <ID> <NAMESPACE>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item id. |
| `<NAMESPACE>` | The namespace, such as `app.cursor`. |

### marfa extensions write

Write one namespace whole.

```text
marfa extensions write [OPTIONS] <ID> <NAMESPACE>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item id. |
| `<NAMESPACE>` | The namespace, such as `app.cursor`. |

| Option | Description |
| --- | --- |
| `--file <PATH>` | A file holding the JSON body; `-` reads stdin. |
| `--body <JSON>` | The JSON body inline. |

### marfa extensions delete

Remove one namespace.

```text
marfa extensions delete [OPTIONS] <ID> <NAMESPACE>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The item id. |
| `<NAMESPACE>` | The namespace, such as `app.cursor`. |
