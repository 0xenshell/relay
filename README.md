# ENShell Relay

Temporary encrypted payload relay for **ENShell**. Stores encrypted instruction payloads so the Chainlink CRE can fetch them after an `ActionSubmitted` event. The relay never decrypts data - it's a dumb key-value store with TTL-based expiry.

## How it works

1. SDK encrypts an instruction and `PUT`s it to the relay keyed by `instructionHash`
2. CRE fetches the encrypted payload via `GET` after an on-chain event triggers
3. CRE decrypts inside its TEE, runs analysis, discards plaintext
4. Relay auto-deletes the payload after TTL expires

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
npm start
```

## Test

```bash
npm test
```

## API

### `GET /health`
Returns relay status and entry count.

### `PUT /relay/:hash`
Store an encrypted payload. Hash must be a bytes32 hex string (`0x` + 64 chars).

```json
{ "encryptedPayload": "0x..." }
```

### `GET /relay/:hash`
Retrieve an encrypted payload by hash. Returns 404 if not found or expired.

## Configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3100` | Server port |
| `TTL_MS` | `86400000` | Payload TTL in milliseconds (default 24h) |

## Self-hosting

The relay is fully open source and self-hostable. Deploy it on any Node.js host, configure your SDK and CRE workflow to point at your relay URL, and you're set.

## License

MIT
