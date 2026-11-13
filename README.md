# Trust Desk AI

Node.js backend with 48 department agents, local Ollama generation, task approvals and optional HTTPS webhook dispatch.

## Local setup
Install Node.js 20+ and Ollama, pull `qwen2.5:1.5b`, set `TRUSTDESK_ADMIN_TOKEN` to a long random secret, then run `npm start`. Visit http://127.0.0.1:3000.

## Hosting
This is not a GitHub Pages app: it needs a running Node.js server and an Ollama endpoint. For remote iPhone access, configure authenticated HTTPS tunneling or approved hosting. Never expose Ollama publicly. Do not commit `.env` or `data/`.
