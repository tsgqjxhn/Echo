# Clash Verge Dev IPRoyal Chain Overrides

Use `dialer-proxy`, not `relay`.

Current upstream group name on this machine:

`RioLU.443 精靈學院`

## Recommended first pass

Use a test-only merge override first. That keeps normal traffic unchanged and only routes IP check domains through the IPRoyal chain.

Paste this into the current RioLU subscription's `Merge` editor:

```yaml
prepend-rules:
  - DOMAIN,api.ipify.org,IPRoyal_Chain_Test
  - DOMAIN,ipv4.icanhazip.com,IPRoyal_Chain_Test

prepend-proxies: []
prepend-proxy-groups: []

append-rules: []

append-proxies:
  - name: IPRoyal_Chain_Node
    type: http
    server: <IPROYAL_SERVER>
    port: <IPROYAL_PORT>
    username: <IPROYAL_USERNAME>
    password: <IPROYAL_PASSWORD>
    dialer-proxy: "RioLU.443 精靈學院"

append-proxy-groups:
  - name: IPRoyal_Chain_Test
    type: select
    proxies:
      - IPRoyal_Chain_Node
      - DIRECT
```

## What this does

`IPRoyal_Chain_Node` is the final static residential exit.

`RioLU.443 精靈學院` is only the jump proxy.

Only `api.ipify.org` and `ipv4.icanhazip.com` will go through the IPRoyal chain, so this is safe for validation.

## After validation

If the test passes and you want all traffic to go through the residential exit, change the rules to:

```yaml
prepend-rules:
  - MATCH,IPRoyal_Chain_Test
```

If you only want certain sites to use the residential exit, keep targeted rules instead of `MATCH`.

## Important notes

- Do not use `type: relay`. Current Mihomo removed relay groups and requires `dialer-proxy`.
- Keep the upstream group name exactly as `RioLU.443 精靈學院`.
- Do not add `udp: true` to this `http` IPRoyal node unless you specifically need it.
