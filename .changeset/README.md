# Changesets

This folder holds [changesets](https://github.com/changesets/changesets):
small Markdown files that describe a change to a published package
(`@owobilum/ui`, `@owobilum/styles`) and the semver bump it needs.

Add one in any PR that changes a package's published code:

```bash
npx changeset
```

On merge to `main`, the release workflow collects pending changesets into a
"Version Packages" PR (version bumps + CHANGELOG entries). Merging that PR
publishes the new versions to npm.
