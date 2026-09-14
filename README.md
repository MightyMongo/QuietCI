# QuietCI

QuietCI is a self-hosted CI/CD notification optimizer. It reduces noisy build and deployment alerts by filtering irrelevant events, prioritizing critical signals, and routing clean notifications to Slack, Microsoft Teams, or email. QuietCI unifies GitHub Actions, GitLab CI/CD, Jenkins, CircleCI, and Azure DevOps into a single configurable workflow.

## Features

- Unified webhook receiver for multiple CI/CD systems  
- Rule-based filtering (ignore, prioritize, summarize, rate-limit)  
- Routing to Slack, Teams, and email  
- Optional AI-powered summaries  
- Self-hosted deployment via Docker  
- SQLite persistence for events and audit logs  

## Getting Started

QuietCI will provide:

- A `/api/events` endpoint for CI/CD webhooks  
- YAML/JSON configuration for rules and routing  
- Dockerfile and docker-compose setup  
- Example payloads and test cases  

Once the initial project structure is generated, you can run QuietCI locally using Node.js or Docker.

## Status

This project is currently in early development.  
Core architecture, configuration format, and routing modules are being implemented.

## License

MIT License
