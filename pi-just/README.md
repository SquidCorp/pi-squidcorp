# pi-just

A [Pi](https://pi.dev) package that turns a **project-local overlay catalog** into slash commands. Use it when you want personal recipes (including at work) without committing a `justfile` to the repo.

This package lives in [pi-squidcorp](https://github.com/SquidCorp/pi-squidcorp). Clone the monorepo and install **this subdirectory** (Pi loads the path in place; do not install the repo root):

```bash
git clone https://github.com/SquidCorp/pi-squidcorp.git
pi install /absolute/path/to/pi-squidcorp/pi-just
```

Then `/reload` or restart Pi in a trusted project.

## Overlay layout

```text
.pi/just/justfile.json
.pi/just/scripts/*.sh
```

Pi only reads this overlay after the project is trusted. The extension does **not** live-merge the repo `justfile`; import it once with `/just:merge`.

### `justfile.json`

```json
[
  {
    "name": "check-api",
    "description": "API fmt, lint, types, tests",
    "cmd": "just check-api",
    "prompt": "API checks failed. Fix the failures shown in the command output."
  },
  {
    "name": "dev-web",
    "description": "Start the Next.js dev server",
    "cmd": "script:start-dev-server",
    "prompt": "The web dev server is a blocking process. Start it in another terminal or with a detaching script; do not occupy this Pi session.",
    "blocking": true
  },
  {
    "name": "review",
    "description": "Review the current diff",
    "prompt": "Review the uncommitted diff and suggest fixes."
  }
]
```

Rules:

- `name` and `description` are required. Names are unique.
- Each recipe needs a `prompt` and/or a `cmd`.
- `cmd` is multiline bash, or `script:<file>` which resolves to `.pi/just/scripts/<file>` (then `<file>.sh`).
- `validate` and `merge` are reserved names.
- `blocking: true` requires a `prompt`.

## Commands

Typing `/just:` lists overlay recipes with their JSON `description` in Pi's autocomplete.

| Command | What it does |
|---|---|
| `/just` | List recipes |
| `/just:<name>` | Run or hand off that recipe. Extra args are appended to inline `cmd`, or passed as argv to scripts. |
| `/just:validate` | Schema-check, then start an agent to set `blocking: true` from recipe/script text (it does not spawn commands) |
| `/just:merge` | Import public recipes from the repo `justfile` / `Justfile` as `{ name, description, cmd: "just <name>" }`. Existing names are **not** overwritten; they are reported as duplicates. |

### Runtime

| Recipe | Behavior |
|---|---|
| `blocking: true` | **Prompt wins.** Inject the prompt (and the `cmd` as context). Do not run `cmd`. |
| `blocking` omitted/false, with `cmd` | Run `cmd` in the project cwd. Output is stored in the session. On failure, if `prompt` exists, start the agent with the prompt plus output. |
| `prompt` only | Inject the prompt and start the agent. |

A `cmd` still occupies the session until it exits or is cancelled. Do not put `just run-dev` in `cmd` unless the script detaches. Mark those recipes blocking (or let `/just:validate` do it) and give them a prompt.

After validate or a JSON edit, `/reload` refreshes autocomplete descriptions. Recipe bodies are re-read from disk on session start, after validate settles, and when you run `/just`.

## Agent

A short `just` system-prompt section lists overlay recipes so the model knows `/just:<name>` exists. Repo just recipes remain `just <name>` via bash.

## Develop

```bash
npm test
pi -e /absolute/path/to/pi-squidcorp/pi-just
```
