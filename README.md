# pi-squidcorp

Monorepo for SquidCorp [Pi](https://pi.dev) packages. Each subdirectory is its own Pi package. There is **no** root package: do not run `pi install` on this repo root (including `git:github.com/SquidCorp/pi-squidcorp`).

| Package | What it is |
| --- | --- |
| [pi-profile](./pi-profile) | Independent agent profiles (directory overlay, `--profile` / `/profile`) |
| [pi-just](./pi-just) | Project-local overlay catalog as `/just:<recipe>` commands |
| [pi-python-boilerplate](./pi-python-boilerplate) | `/init-boilerplate` prompt for agent-first Python projects |

## Install

Clone (or use this checkout), then install **only the packages you want**:

```bash
git clone https://github.com/SquidCorp/pi-squidcorp.git
cd pi-squidcorp

pi install "$PWD/pi-profile"
pi install "$PWD/pi-just"
pi install "$PWD/pi-python-boilerplate"
```

Local paths are loaded in place, not copied. Restart Pi or `/reload` after install.

`pi-profile` has an npm dependency (`jiti`). From that package directory run `npm install` once if you have not already.

npm publishing is deferred; each package can still be published on its own later.
