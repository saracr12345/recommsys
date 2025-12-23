// src/ui/styles.ts
import type { CSSProperties } from 'react'

// 60 / 30 / 10 palette
export const colors = {
  white: '#ffffff',

  // emerald family
  emerald: '#00674F',
  emeraldDark: '#004737',
  emeraldSoft: '#E1F3ED',
  emeraldBorder: '#B2D9CC',

  // baby blue accent
  blue: '#89cff0',
  blueSoft: '#E4F6FF',
  blueBorder: '#B3E1F8',

  // neutrals
  bg: '#f3f7f5', // soft, slightly green-tinted background
  textMain: '#022C22',
  textMuted: '#49615A',
  borderSubtle: '#d3e3db',
  borderStrong: '#9fbfb2',

  // status
  danger: '#b91c1c',
  dangerSoft: '#fee2e2',
  dangerBorder: '#fecaca',
}

// Shared page shell for auth/advisor/welcome/etc
export const pageShell: CSSProperties = {
  background: colors.bg,
  minHeight: 'calc(100vh - 56px)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-start',
  padding: '32px 16px',
}

// Generic elevated card
export const card: CSSProperties = {
  background: colors.white,
  borderRadius: 16,
  border: `1px solid ${colors.borderSubtle}`,
  boxShadow: '0 12px 30px rgba(0,0,0,0.04)',
  padding: 24,
  maxWidth: '100%',
  display: 'grid',
  gap: 12,
}

// Input field
export const input: CSSProperties = {
  padding: '8px 10px',
  borderRadius: 8,
  border: `1px solid ${colors.borderSubtle}`,
  background: colors.white,
  color: colors.textMain,
  width: '100%',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}

// Primary button (emerald)
export const primaryButton: CSSProperties = {
  padding: '10px 12px',
  borderRadius: 999,
  border: `1px solid ${colors.emeraldDark}`,
  background: colors.emerald,
  color: colors.white,
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 500,
  boxShadow: '0 10px 24px rgba(0,103,79,0.25)',
}

// Optional: subtle secondary button
export const secondaryButton: CSSProperties = {
  padding: '10px 12px',
  borderRadius: 999,
  border: `1px solid ${colors.borderSubtle}`,
  background: colors.white,
  color: colors.textMain,
  cursor: 'pointer',
  fontSize: 14,
}
