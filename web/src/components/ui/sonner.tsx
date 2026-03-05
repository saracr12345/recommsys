// web/src/components/ui/sonner.tsx
import { Toaster as Sonner, type ToasterProps } from 'sonner'

function getTheme(): ToasterProps['theme'] {
  // no next-themes; just detect the html "dark" class if you use it
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme={getTheme()}
      closeButton
      richColors
      {...props}
    />
  )
}