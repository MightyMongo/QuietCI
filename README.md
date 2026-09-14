# QuietCI

QuietCI is a self-hosted CI/CD notification optimizer. It reduces noisy build and deployment alerts by filtering irrelevant events, prioritizing critical signals, and routing clean notifications to Slack, Microsoft Teams, or email. QuietCI unifies GitHub Actions, GitLab CI/CD, Jenkins, CircleCI, and Azure DevOps into a single configurable workflow.

## Project Structure

```text
config/
  rules.yaml
  targets.yaml
migrations/
  001_init.sql
src/
  config/
  filter/
  normalizers/
  persistence/
  routing/
  scripts/
  summarizer/
  types/
tests/
  payloads/
```

## Features

- Express webhook receiver at `POST /api/events`
- Payload normalization for GitHub Actions, GitLab CI/CD, Jenkins, CircleCI, and Azure DevOps Pipelines
- Unified internal schema: `source`, `repo`, `branch`, `actor`, `event_type`, `timestamp`, `message`, `metadata`
- Rule-based filtering with YAML/JSON-compatible configuration
- Routing modules for Slack, Microsoft Teams, and email placeholders
- SQLite-backed audit storage for events, decisions, and deliveries
- Optional AI summarizer adapter driven by environment variables
- Local and Docker-based startup on port `8080`

## Configuration

Rules live in `config/rules.yaml` and targets live in `config/targets.yaml`.

Supported rule conditions:

- `source`
- `repo`
- `branch`
- `actor`
- `event_type`
- `message_regex`

Supported actions:

- `IGNORE`
- `ROUTE`
- `SUMMARY_ONLY`
- `SNOOZE`
- `severity`
- `rate_limit`
- `summary`

Secrets and runtime settings are read from environment variables such as:

- `PORT`
- `QUIETCI_DATABASE_PATH`
- `SLACK_WEBHOOK_URL`
- `TEAMS_WEBHOOK_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

QuietCI reads configuration directly from process environment variables. For
local `npm run dev` usage, export them in your shell before starting the app.
For Docker Compose, you can create a `.env` file from `.env.example` so Compose
injects the same values into the container.

## Webhook Setup

Point your CI/CD systems at `POST /api/events` and send their native webhook payloads:

- GitHub Actions: workflow/job webhooks
- GitLab CI/CD: pipeline hooks
- Jenkins: build notifications
- CircleCI: pipeline/job notifications
- Azure DevOps Pipelines: build completion hooks

QuietCI detects the source from headers or payload shape, normalizes the event, evaluates rules, stores an audit trail, and only routes alerts when the resulting decision requires it.

## Run Locally

```bash
npm install
# ensure config/rules.yaml and config/targets.yaml exist
npm run db:setup
npm run dev
```

The server starts on `http://localhost:8080`.

Useful commands:

```bash
npm run build
npm run lint
npm test
```

## Run with Docker

```bash
docker compose up --build
```

This uses SQLite at `.data/quietci.sqlite` and exposes QuietCI on port `8080`.

## Testing

Example payloads for each supported CI/CD source are in `tests/payloads/`.

Unit tests cover:

- Payload normalization
- Filter engine routing, snoozing, and rate limiting behavior

## License

MIT License
