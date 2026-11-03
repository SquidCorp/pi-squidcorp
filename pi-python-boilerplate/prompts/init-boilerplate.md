---
description: Scaffold an agent-first Python project (uv, Ruff, ty, pytest, AGENTS.md)
argument-hint: "[directory] [package-name]"
---

Initialize a **code-quality + agent-first** Python boilerplate in `${1:-the current working directory}`.

Python import package name: `${2:-infer from the directory / project name, snake_case}`.

If the target is not empty and already looks like a Python project, stop and ask before overwriting. If the name is ambiguous, ask once, then proceed. Do not invent extra frameworks (FastAPI, SQLAlchemy, Turso, etc.) unless the user already asked for them in this conversation.

## Goal

Create a repo an agent can extend without guessing. Quality is a mechanical loop, not a suggestion. Architecture is written down. Typed contracts live at boundaries.

Reuse this stack (from the smart-todo quality kernel, minus app-specific deps):

- **uv** + `uv.lock` + `.python-version`
- **src layout** + Hatchling
- **one `pyproject.toml`** for project metadata, Ruff, ty, pytest
- **Ruff** lint + format
- **ty** typecheck
- **pytest** with at least one real test
- **Pydantic** models as contracts (even if only a tiny example)
- **pydantic-settings** + root `.env.example`
- layers: `api` → `services` → `db` + `models`
- **AGENTS.md** as the agent contract
- **justfile** with the same command names CI will run
- **GitHub Actions CI** running format check, lint, types, tests
- **no stray root `main.py`**, no empty files, no secrets

Default Python: **3.13**. `requires-python`, `.python-version`, and `tool.ruff.target-version` must match (`py313`).

## File tree to create

```text
.
├── AGENTS.md
├── README.md
├── .python-version
├── .gitignore
├── .env.example
├── pyproject.toml
├── justfile
├── .github/workflows/ci.yml
├── src/<pkg>/
│   ├── __init__.py
│   ├── main.py
│   ├── api/
│   │   └── __init__.py
│   ├── services/
│   │   └── __init__.py
│   ├── db/
│   │   └── __init__.py
│   └── models/
│       ├── __init__.py
│       └── env.py
└── tests/
    ├── conftest.py
    └── test_health.py
```

Replace `<pkg>` with the import package name. Every `__init__.py` may be empty only if it is a package marker; every other file must have real content.

## `pyproject.toml` requirements

```toml
[project]
name = "<pkg>"
version = "0.1.0"
description = "Add your description here"
readme = "README.md"
requires-python = ">=3.13"
dependencies = [
    "pydantic-settings>=2.15.0",
    "python-dotenv>=1.2.3",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[dependency-groups]
dev = [
    "pytest>=8",
    "ruff>=0.16",
    "ty>=0.0.84",
]

[tool.ruff]
target-version = "py313"
line-length = 88

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "SIM", "RUF"]

[tool.ruff.format]
quote-style = "double"

[tool.pytest.ini_options]
testpaths = ["tests"]
```

Do not add unused runtime deps. Keep Hatchling; keep src layout.

## Tooling files

**`.python-version`**: `3.13`

**`.gitignore`**: `.env`, `.env.*` with `!.env.example`, `.venv/`, `__pycache__/`, `*.py[cod]`, `*.egg-info/`, `dist/`, `build/`, `.ruff_cache/`, `.pytest_cache/`, `.coverage`, `htmlcov/`, `.tycache/`, `*.db`, `*.sqlite3`, `.DS_Store`

**`.env.example`**: placeholder keys only, no real URLs or tokens. Example:

```text
APP_ENV=dev
```

**`justfile`** (or a Makefile if `just` is unavailable — prefer `justfile`):

```just
check:
    uv run ruff format --check .
    uv run ruff check .
    uv run ty check
    uv run pytest

fmt:
    uv run ruff format .
    uv run ruff check --fix .

test:
    uv run pytest

run:
    uv run python -m <pkg>.main
```

**CI** (`.github/workflows/ci.yml`): on push and pull_request, install uv, `uv sync --frozen --all-groups` once a lockfile exists (first run: `uv sync --all-groups` then commit `uv.lock`), then the same four checks as `just check`. Pin a Python 3.13 toolchain.

## Application skeleton (keep tiny)

Layer rules (also write these into `AGENTS.md`):

- `models/` — Pydantic schemas and settings only. No I/O.
- `db/` — persistence only. No HTTP, no business rules.
- `services/` — business rules. No FastAPI/router details, no SQL strings if a db module exists.
- `api/` — HTTP or CLI adapters only. Validate with Pydantic, call services, map errors.
- `main.py` — process entry (app factory or `main()`). No business logic.

Implement a minimal **health** path so layers are real, not empty folders:

- `models/env.py`: `pydantic-settings` `BaseSettings`, load `.env` from repo root, `extra="ignore"`, at least `APP_ENV: str = "dev"`. Export a module-level `env`.
- `services/` health helper returning a small Pydantic model, e.g. `{ "status": "ok", "env": env.APP_ENV }`.
- `main.py`: `main()` that prints that health payload (JSON) so `uv run python -m <pkg>.main` works with zero extra servers.
- Leave `api/` and `db/` as documented packages with a one-line module docstring stating their future role. Do not add FastAPI/SQLAlchemy unless requested.

`tests/test_health.py` must import the health helper (or `main`) and assert `status == "ok"`. Tests must not need network or secrets.

## `AGENTS.md` (required, agent contract)

Write a short, imperative doc. Include:

1. What this repo is and how to set it up (`uv sync`, copy `.env.example` → `.env`).
2. Layout map: `api` / `services` / `db` / `models`.
3. Commands: `just fmt`, `just check`, `just test`, `just run` (and the raw `uv run …` equivalents).
4. **Done criteria:** do not consider a change finished until `ruff format`, `ruff check`, `ty check`, and `pytest` all pass.
5. Conventions: type everything, no `Any`, Pydantic at boundaries, no logic in adapters, no I/O in models, no empty files, never commit `.env`.
6. How to add a feature: model → db (if persistence) → service → adapter → test.
7. Out of scope: do not add frameworks unless asked; do not hand-edit `uv.lock` except via `uv lock` / `uv add` / `uv sync`.

## `README.md`

Human-facing: one-paragraph description, setup (`uv sync`), how to run, how to check, and “agents: read `AGENTS.md`”.

## Procedure

1. Resolve target directory and package name. Create the directory if needed.
2. Write all files above. No placeholders like `TODO` in executable code.
3. From the project root: `uv sync --all-groups` (creates `.venv` + `uv.lock`).
4. `uv run ruff format .` then `uv run ruff check --fix .` then `uv run ty check` then `uv run pytest`.
5. Fix anything that fails before stopping.
6. Reply with: created path, package name, commands to run, and that `AGENTS.md` is the agent contract.

Do not initialize git unless the user asked. Do not commit. Do not add pre-commit unless asked.
