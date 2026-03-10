import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Toaster } from '../Toaster';
import { ThemeProvider } from '../ThemeProvider';

// Mock the sonner Toaster
vi.mock('sonner', () => ({
  Toaster: vi.fn(({ theme, position, toastOptions }) => (
    <div 
      data-testid="sonner-toaster"
      data-theme={theme}
      data-position={position}
      data-toast-options={JSON.stringify(toastOptions)}
    >
      Sonner Toaster
    </div>
  )),
}));

describe('Toaster', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the sonner Toaster component', () => {
    render(
      <ThemeProvider>
        <Toaster />
      </ThemeProvider>
    );

    expect(screen.getByTestId('sonner-toaster')).toBeInTheDocument();
  });

  it('passes theme from ThemeProvider to Toaster', () => {
    render(
      <ThemeProvider>
        <Toaster />
      </ThemeProvider>
    );

    const toaster = screen.getByTestId('sonner-toaster');
    expect(toaster).toHaveAttribute('data-theme', 'light');
  });

  it('sets position to top-center', () => {
    render(
      <ThemeProvider>
        <Toaster />
      </ThemeProvider>
    );

    const toaster = screen.getByTestId('sonner-toaster');
    expect(toaster).toHaveAttribute('data-position', 'top-center');
  });

  it('applies custom toast options with CSS variables', () => {
    render(
      <ThemeProvider>
        <Toaster />
      </ThemeProvider>
    );

    const toaster = screen.getByTestId('sonner-toaster');
    const toastOptions = JSON.parse(toaster.getAttribute('data-toast-options') || '{}');

    expect(toastOptions.style).toEqual({
      background: 'var(--popover)',
      color: 'var(--popover-foreground)',
      border: '1px solid var(--border)',
    });
  });

  it('uses light theme by default', () => {
    render(
      <ThemeProvider>
        <Toaster />
      </ThemeProvider>
    );

    const toaster = screen.getByTestId('sonner-toaster');
    expect(toaster.getAttribute('data-theme')).toBe('light');
  });

  it('renders without crashing when ThemeProvider is present', () => {
    const { container } = render(
      <ThemeProvider>
        <Toaster />
      </ThemeProvider>
    );

    expect(container).toBeTruthy();
    expect(screen.getByTestId('sonner-toaster')).toBeInTheDocument();
  });

  it('applies correct CSS variable for background', () => {
    render(
      <ThemeProvider>
        <Toaster />
      </ThemeProvider>
    );

    const toaster = screen.getByTestId('sonner-toaster');
    const toastOptions = JSON.parse(toaster.getAttribute('data-toast-options') || '{}');

    expect(toastOptions.style.background).toBe('var(--popover)');
  });

  it('applies correct CSS variable for text color', () => {
    render(
      <ThemeProvider>
        <Toaster />
      </ThemeProvider>
    );

    const toaster = screen.getByTestId('sonner-toaster');
    const toastOptions = JSON.parse(toaster.getAttribute('data-toast-options') || '{}');

    expect(toastOptions.style.color).toBe('var(--popover-foreground)');
  });

  it('applies correct CSS variable for border', () => {
    render(
      <ThemeProvider>
        <Toaster />
      </ThemeProvider>
    );

    const toaster = screen.getByTestId('sonner-toaster');
    const toastOptions = JSON.parse(toaster.getAttribute('data-toast-options') || '{}');

    expect(toastOptions.style.border).toBe('1px solid var(--border)');
  });

  it('toastOptions includes only style property', () => {
    render(
      <ThemeProvider>
        <Toaster />
      </ThemeProvider>
    );

    const toaster = screen.getByTestId('sonner-toaster');
    const toastOptions = JSON.parse(toaster.getAttribute('data-toast-options') || '{}');

    expect(Object.keys(toastOptions)).toEqual(['style']);
  });

  it('theme prop is passed correctly to Toaster component', () => {
    const { rerender } = render(
      <ThemeProvider>
        <Toaster />
      </ThemeProvider>
    );

    let toaster = screen.getByTestId('sonner-toaster');
    let themeAttr = toaster.getAttribute('data-theme');
    expect(themeAttr).toBe('light');

    // ThemeProvider always forces light theme, so it should remain light
    rerender(
      <ThemeProvider>
        <Toaster />
      </ThemeProvider>
    );

    toaster = screen.getByTestId('sonner-toaster');
    themeAttr = toaster.getAttribute('data-theme');
    expect(themeAttr).toBe('light');
  });

  it('renders with all required props for Sonner Toaster', () => {
    render(
      <ThemeProvider>
        <Toaster />
      </ThemeProvider>
    );

    const toaster = screen.getByTestId('sonner-toaster');
    
    // Verify all required attributes are present
    expect(toaster).toHaveAttribute('data-theme');
    expect(toaster).toHaveAttribute('data-position');
    expect(toaster).toHaveAttribute('data-toast-options');
  });

  it('maintains consistent styling across multiple renders', () => {
    const { rerender } = render(
      <ThemeProvider>
        <Toaster />
      </ThemeProvider>
    );

    const getToasterOptions = () => {
      const toaster = screen.getByTestId('sonner-toaster');
      return JSON.parse(toaster.getAttribute('data-toast-options') || '{}');
    };

    const firstRenderOptions = getToasterOptions();

    rerender(
      <ThemeProvider>
        <Toaster />
      </ThemeProvider>
    );

    const secondRenderOptions = getToasterOptions();

    expect(firstRenderOptions).toEqual(secondRenderOptions);
  });

  it('provides accessible Toaster component', () => {
    render(
      <ThemeProvider>
        <Toaster />
      </ThemeProvider>
    );

    const toaster = screen.getByTestId('sonner-toaster');
    expect(toaster).toBeInTheDocument();
    // Sonner Toaster is rendered and accessible
  });
});
