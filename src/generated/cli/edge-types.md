The edge types an instance holds.

```text
marfa edge-types [OPTIONS] <COMMAND>
```

### marfa edge-types list

Every edge type the instance holds.

```text
marfa edge-types list [OPTIONS]
```

### marfa edge-types register

Register an edge type from its definition. Needs `metadata.edge_types:write` and write on its id and any reverse name in the key's edge map.

```text
marfa edge-types register [OPTIONS]
```

| Option | Description |
| --- | --- |
| `--file <PATH>` | A file holding the JSON body; `-` reads stdin. |
| `--body <JSON>` | The JSON body inline. |

### marfa edge-types delete

Remove a registered edge type. Needs `schema.write` and write on its id and any reverse name in the key's edge map.

```text
marfa edge-types delete [OPTIONS] <ID>
```

| Argument | Description |
| --- | --- |
| `<ID>` | The edge type id. |
