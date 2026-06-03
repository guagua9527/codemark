# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CodeMark is an **AI + Annotation-Driven Development Framework**. Users annotate elements on a running web page (like Word comments), and an AI agent automatically maps those annotations to source code and applies fixes with hot-reload.

## Current State

**Spec-only.** No source code, build system, or dependencies exist yet. The single source of truth is `.spec/requirements.md` (Chinese). All acceptance criteria are unchecked.

## Planned Architecture

Monorepo with these packages:

| Package | Purpose |
|---|---|
| `packages/core` | Core logic, annotation data model, DOM-to-source mapping |
| `packages/frontend` | Annotation UI overlay (selection, bubbles, comment panel) |
| `packages/vite-plugin` | Vite plugin — injects annotation UI in dev, stripped in prod |
| `packages/webpack-plugin` | Webpack plugin — same role as vite-plugin |
| `packages/server-middleware` | Express/Koa middleware for backend error capture and API |
| `packages/ai-agent` | LLM integration — parses annotations, generates code fixes |
| `examples/vue-app` | Vue 3 example project |
| `examples/react-app` | React 18+ example project |

## Key Design Constraints

- **Dev-only:** CodeMark must be completely removable from production builds. It injects via bundler plugins and server middleware — never modifies user project structure.
- **Annotation ↔ Code binding:** Annotations must link to specific source locations via DOM element → component → source file mapping.
- **Hot-reload cycle:** After AI applies a fix, the page must hot-reload so the user can verify immediately.
- **Error → Annotation:** Runtime errors (frontend and backend) should auto-generate annotations at the relevant code location.

## Tech Stack (candidates, not yet decided)

Frontend annotation UI, Vite/Webpack plugins, Express/Koa/Fastify middleware, OpenAI/Claude API for AI, WebSocket for real-time sync.

## Language

The requirements spec and primary communication are in Chinese (简体中文).
