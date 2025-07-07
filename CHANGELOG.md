## [1.2.1](https://github.com/M-logique/black-betty/compare/v1.2.0...v1.2.1) (2025-07-07)

### 🐛 Bug Fixes

* Trim whitespace from Telegram bot token to prevent potential issues ([188e287](https://github.com/M-logique/black-betty/commit/188e28719d8206d773c80c09a65897cb6396f60f))

## [1.2.0](https://github.com/M-logique/black-betty/compare/v1.1.4...v1.2.0) (2025-07-07)

### 🚀 Features

* Extend TelegramUpdate interface to include channel_post for improved message handling ([4ea19af](https://github.com/M-logique/black-betty/commit/4ea19afa2d93b845239833b8f52c3107db0251ee))

## [1.1.4](https://github.com/M-logique/black-betty/compare/v1.1.3...v1.1.4) (2025-07-06)

### 🐛 Bug Fixes

* Remove unnecessary newline in asset message formatting for GitHub webhook handler ([2467cf9](https://github.com/M-logique/black-betty/commit/2467cf90b4d94540e7cb2df13d1211aad0375ac5))
* Update import paths for inline handlers to ensure correct module resolution ([efe1c5f](https://github.com/M-logique/black-betty/commit/efe1c5fa7f212ede53129c6c8d1d47948bb76552))

## [1.1.3](https://github.com/M-logique/black-betty/compare/v1.1.2...v1.1.3) (2025-07-06)

### 🚧 Refactors

* Simplify message handling in GitHub webhook by consolidating message variable usage and ensuring consistent formatting across event types ([f47c69f](https://github.com/M-logique/black-betty/commit/f47c69f3c96f4fcaecb1f8d8eb831fe0a35ec287))

## [1.1.2](https://github.com/M-logique/black-betty/compare/v1.1.1...v1.1.2) (2025-07-06)

### 🚧 Refactors

* Restructure GitHub webhook handling by removing inline calculator and default inline handlers, and updating import paths for main bot handlers ([1bcb954](https://github.com/M-logique/black-betty/commit/1bcb954be51b88e4b370657c9a50acc01d0353c0))

## [1.1.1](https://github.com/M-logique/black-betty/compare/v1.1.0...v1.1.1) (2025-07-06)

### 🐛 Bug Fixes

* Update asset message formatting in GitHub webhook handler to use bullet points for improved readability ([93dc0c9](https://github.com/M-logique/black-betty/commit/93dc0c94bff5c91032d4c1a188fbd8a23b046d92))

## [1.1.0](https://github.com/M-logique/black-betty/compare/v1.0.1...v1.1.0) (2025-07-06)

### 🚀 Features

* Expand GitHub webhook event handling in Telegram bot to support additional events including workflow runs, job statuses, pull request reviews, discussions, and deployments, enhancing message formatting and user interaction ([a4a1649](https://github.com/M-logique/black-betty/commit/a4a16494a3d8f10dfb293feef8bb4c857c8b9ae0))

## [1.0.1](https://github.com/M-logique/black-betty/compare/v1.0.0...v1.0.1) (2025-07-05)

### 🚧 Refactors

* Refactor GitHub webhook message formatting to use HTML instead of Markdown, enhancing message clarity and presentation ([73bc116](https://github.com/M-logique/black-betty/commit/73bc116a0721c3d50efc87f562758e40898f50f9))

## 1.0.0 (2025-07-05)

### 🚀 Features

* Add requiredAuth property to inline calculator handler for improved access control ([0c6d66c](https://github.com/M-logique/black-betty/commit/0c6d66c603da96ad329cda22a8ce5592d43253a4))
* Add support for callback queries and improve error handling in Telegram bot ([6487e84](https://github.com/M-logique/black-betty/commit/6487e84867a0480ce50c836093d39fbddef670bb))
* Add Telegram bot configuration to deployment workflow for enhanced integration ([6c132d0](https://github.com/M-logique/black-betty/commit/6c132d06bcc930c78f746a8d4a0b7f3a96c7cdf3))
* Enhance Telegram bot with user authentication and update configuration for KV namespaces ([1b75255](https://github.com/M-logique/black-betty/commit/1b752552dfe9f92af76dfccfe98b462f8182a50b))
* Expand GitHub event handling in Telegram bot to support star, delete, pull request, fork, issue, and comment events with enhanced message formatting ([5ee2fbc](https://github.com/M-logique/black-betty/commit/5ee2fbca48e64e91b36cf428be6a848b747f6790))
* Implement handling for GitHub issue events in Telegram bot, improving user interaction and message clarity ([a27bace](https://github.com/M-logique/black-betty/commit/a27bacea0d8ba7ea256eed3bf8f6cd3ec25e4168))
* Integrate GitHub push event handling into Telegram bot, enhancing message formatting and response capabilities ([ca3362c](https://github.com/M-logique/black-betty/commit/ca3362c80766e7c5620a55221eb9925d6b6388cf))

### 🚧 Refactors

* Remove notes handling from Telegram bot and update configuration; add GitHub-related types ([d26069d](https://github.com/M-logique/black-betty/commit/d26069d62d591bf2a230389e630b9a5436455824))
* Update import paths for Telegram types and add new Cloudflare bindings and Telegram types for improved structure and organization ([aa00f5c](https://github.com/M-logique/black-betty/commit/aa00f5cb8790fd2c08e5dda983f1e660be90d56b))
