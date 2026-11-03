# pi-python-boilerplate

Pi package with a `/init-boilerplate` prompt that scaffolds an agent-first Python project.

The generated repo is built around a closed quality loop: **format → lint → types → tests**, plus `AGENTS.md` so coding agents do not invent a second layout.

## Install

This package lives in [pi-squidcorp](https://github.com/SquidCorp/pi-squidcorp). Clone the monorepo and install **this subdirectory** (Pi loads the path in place; do not install the repo root):

```bash
git clone https://github.com/SquidCorp/pi-squidcorp.git
pi install /absolute/path/to/pi-squidcorp/pi-python-boilerplate
```

Restart Pi or run `/reload`. Update a git install with `pi update --extensions`.

## Usage

Inside Pi, in the directory that should become the project (or pass a path):

```text
/init-boilerplate
/init-boilerplate ./my-app
/init-boilerplate ./my-app my_app
```

Arguments:

1. Target directory (optional, default: current working directory)
2. Python import package name (optional, inferred from the directory)

## What the prompt creates

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
│   ├── services/
│   ├── db/
│   └── models/
└── tests/
```

Tooling: **uv**, **Ruff**, **ty**, **pytest**. A change is done only when `ruff format`, `ruff check`, `ty check`, and `pytest` all pass.
