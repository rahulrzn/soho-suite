# Soho Suite Studio

Frontend creation for Codex integration

This project is a visual frontend prototype for Soho Suite, which will later be imported into my existing local codebase using OpenAI Codex.

Build with React, TypeScript, and Vite.

Prioritize excellent UI/UX, visual consistency, responsive layouts, polished interactions, and reusable components.

Keep the code modular and readable so Codex can understand and integrate it into an existing application.

Use realistic mock data only for the visual prototype. Keep mock data clearly separated from UI components.

Do not build a replacement backend or authentication system.

Do not assume that mock data, routes, API endpoints, or business operations are implemented in the existing application.

Avoid unnecessary dependencies and features that require the Lovable environment to function.

Preserve the complete frontend source code, styling, assets, and dependency information needed to reproduce the design locally.

Important: This is a UI handoff project. The goal is for Codex to reproduce the generated visual design in the existing Soho Suite application while preserving its Firebase authentication, Spring Boot backend integration, and working business functionality.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cc83ce17-bd53-4af3-ada2-c278498aca6d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
