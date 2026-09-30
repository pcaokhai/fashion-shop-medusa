# ADR-011 AI workflow and token budget rules
Status: Accepted · Date: 2026-09-29 · Deciders: Khai · Related: docs/11, .claude/

## Context
Superpowers skills and parallel lanes multiply context usage; long sessions degrade accuracy and cost more.

## Decision
Adopt docs/11: deny-list for generated/vendor files, find-then-read, tailed outputs, one story per session with file
handoff (plan + PROGRESS), compact plans, short subagent briefs, small-model subagents for mechanical work.

## Consequences
Sessions stay focused; requires discipline in briefs; tokens per story tracked and reviewed in retro.
