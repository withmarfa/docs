The instance configuration.

```text
marfa config [OPTIONS] <COMMAND>
```

### marfa config get

The instance configuration: the enforcement levers and the retention overrides. Needs `config.manage`.

```text
marfa config get [OPTIONS]
```

### marfa config replace

Replace the instance configuration whole. Needs `config.manage`.

```text
marfa config replace [OPTIONS]
```

| Option | Description |
| --- | --- |
| `--file <PATH>` | A file holding the JSON body; `-` reads stdin. |
| `--body <JSON>` | The JSON body inline. |
