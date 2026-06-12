# Time Locked CLI

Terminal companion for Time Locked.

## Development

```bash
npm install
npm test -w cli
npm run build -w cli
npm run dev -w cli -- --help
```

## Commands

```bash
time-locked login --api-url http://localhost:3001
time-locked logout
time-locked whoami
time-locked decisions list --active
time-locked decisions create
time-locked decisions show <id>
time-locked decisions pause <id>
time-locked decisions resume <id>
time-locked decisions stop <id>
time-locked decisions outcome <id> --text "Decision text"
time-locked notes add <decision-id> --text "New thought"
```

The CLI is an API client. It never accesses the database directly.
