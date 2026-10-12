# @owobilum/styles

Design tokens and the Tailwind CSS v4 theme for the `@owobilum` design system.
Usually installed through `@owobilum/ui`; see its README for registry setup
(GitHub Packages).

```css
/* app.css */
@import 'tailwindcss';
@import '@owobilum/styles/tokens.css';
@import '@owobilum/styles/theme.css';
```

This enables semantic utilities such as `bg-primary`, `text-primary-foreground`,
`border-border` and `ring-ring`. Tokens are plain CSS variables on `:root`
(`tokens.css`), mapped to Tailwind utilities in `theme.css`, so a theme can be
swapped by redefining the variables.

The font stack expects [Inter](https://rsms.me/inter/); load it in your app.
