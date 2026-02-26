---
title: Local AI via Ollama
status: planned
priority: medium
complexity: L
competitors:
  greenhouse: poor
  lever: poor
  ashby: poor
  workable: poor
  opencats: poor
---

Run AI models locally using [Ollama](https://ollama.ai) so candidate data never leaves your network. No cloud API keys, no data sharing, no usage fees.

## What it solves

Every cloud-based AI service (OpenAI, Anthropic, Google) requires sending candidate PII to external servers. For companies in regulated industries (healthcare, finance, government) or privacy-conscious organizations, this is a non-starter. Local AI via Ollama keeps everything on your infrastructure.

## Planned implementation

- Ollama as a Docker Compose service alongside the existing stack
- Model selection configurable (e.g., Llama 3, Mistral) via environment variables
- Used for resume parsing and candidate ranking
- Fallback to cloud APIs for users who prefer speed over privacy
- No usage-based fees — run as many inferences as your hardware supports

## Why this is unique

No commercial ATS offers local AI inference. This is a genuine differentiator for Applirank — the only ATS where sensitive candidate data can be processed by AI without ever touching a third-party server.
