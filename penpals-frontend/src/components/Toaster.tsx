import { Toaster as SonnerToaster } from 'sonner@2.0.3';
import { useTheme } from './ThemeProvider';

export function Toaster() {
  const { theme } = useTheme();

  return (
    <SonnerToaster
      theme={theme}
      position="top-center"
      toastOptions={{
        style: {
          background: 'var(--popover)',
          color: 'var(--popover-foreground)',
          border: '1px solid var(--border)',
        },
      }}
    />
  );
}
