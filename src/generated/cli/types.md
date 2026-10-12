The types an instance holds, and the shipped ones it has outgrown.

```text
marfa types [OPTIONS] <COMMAND>
```

### marfa types list

Every type the instance holds.

```text
marfa types list [OPTIONS]
```

### marfa types get

One type by id, with its schema.

```text
marfa types get [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The type id, such as `core.note` or `user.recipe`. |

### marfa types register

Register a type from its definition. Needs `metadata.types:write` and write on the type in the key's type map.

```text
marfa types register [OPTIONS]
```

| Option | Description |
| --- | --- |
| `--file <PATH>` | A file holding the JSON body; `-` reads stdin. |
| `--body <JSON>` | The JSON body inline. |

### marfa types normalize

Normalize a definition and compare it with the registered type. Any authenticated key can use this command.

```text
marfa types normalize [OPTIONS]
```

| Option | Description |
| --- | --- |
| `--file <PATH>` | A file holding the JSON body; `-` reads stdin. |
| `--body <JSON>` | The JSON body inline. |

### marfa types replace

Replace a registered type's definition. Needs write on the type in the key's type map and `schema.write` or `metadata.types:write`.

`metadata.types:write` alone covers adding optional fields that no stored row holds a value under, and changing the label, description, display hints and version. Any other change, removing a field included, needs `schema.write`.

```text
marfa types replace [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The type id. |

| Option | Description |
| --- | --- |
| `--file <PATH>` | A file holding the JSON body; `-` reads stdin. |
| `--body <JSON>` | The JSON body inline. |

### marfa types delete

Remove a registered type. Needs `schema.write` and write on the type in the key's type map.

```text
marfa types delete [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The type id. |

| Option | Description |
| --- | --- |
| `--force` | Remove it even where items of the type exist. |

### marfa types drift

Shipped types this instance carries that the build no longer does. Requires `instance.read`.

```text
marfa types drift [OPTIONS]
```

### marfa types prune

Remove one shipped type the build no longer carries. Requires `instance.maintain`.

```text
marfa types prune [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The type id. |
