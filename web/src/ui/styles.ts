// web/src/ui/styles.ts used it for login and sign up form 
import type { CSSProperties } from 'react'

export const pageShell: CSSProperties = {
  background: '#f8fafc',
  minHeight: 'calc(100vh - 56px)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-start',
  padding: '32px 16px',
}

export const card: CSSProperties = {
  background: '#ffffff',
  borderRadius: 16,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px rgba(15,23,42,0.06)',
  padding: 24,
  maxWidth: '100%',
  display: 'grid',
  gap: 12,
}

export const input: CSSProperties = {
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  color: '#0f172a',
  width: '100%',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}

export const primaryButton: CSSProperties = {
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #1d4ed8',
  background: '#3b82f6',
  color: '#ffffff',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 500,
}
