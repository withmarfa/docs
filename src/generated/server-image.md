```bash
docker pull ghcr.io/withmarfa/marfa-server:0.0.40
docker run --name marfa -d --restart unless-stopped -p 127.0.0.1:8600:8600 \
  -v marfa-data:/data --env-file marfa.env ghcr.io/withmarfa/marfa-server:0.0.40
```
