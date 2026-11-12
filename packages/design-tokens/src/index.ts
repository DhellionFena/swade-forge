export const colorTokens = [
  '--color-bg-base',
  '--color-bg-surface',
  '--color-bg-elevated',
  '--color-bg-hover',
  '--color-bg-input',
  '--color-text-primary',
  '--color-text-secondary',
  '--color-text-disabled',
  '--color-border',
  '--color-border-strong',
  '--color-accent',
  '--color-accent-hover',
  '--color-accent-dim',
  '--color-success',
  '--color-danger',
  '--color-warning',
  '--color-info',
  '--color-focus-ring',
] as const;

export const spacingTokens = [
  '--space-1',
  '--space-2',
  '--space-3',
  '--space-4',
  '--space-5',
  '--space-6',
  '--space-8',
  '--space-10',
  '--space-12',
  '--space-16',
] as const;

export type ColorToken = (typeof colorTokens)[number];
export type SpacingToken = (typeof spacingTokens)[number];
