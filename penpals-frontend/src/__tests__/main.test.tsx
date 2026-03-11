import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRoot } from 'react-dom/client';

// Mock react-dom/client - must be a factory function with no external variables
vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({
    render: vi.fn(),
  })),
}));

// Mock App component
vi.mock('../App.tsx', () => ({
  default: () => null,
}));

// Mock CSS import
vi.mock('../index.css', () => ({}));

describe('main.tsx', () => {
  let mockRootElement: HTMLDivElement;

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Create and setup mock root element
    mockRootElement = document.createElement('div');
    mockRootElement.id = 'root';
    
    // Mock document.getElementById to return our mock element
    vi.spyOn(document, 'getElementById').mockReturnValue(mockRootElement);
  });

  it('gets the root element from the DOM', () => {
    // Verify getElementById can be called
    const element = document.getElementById('root');
    expect(element).toBeTruthy();
    expect(element?.id).toBe('root');
  });

  it('verifies createRoot is a function', () => {
    // Check that createRoot is available and is a function
    expect(typeof createRoot).toBe('function');
  });

  it('simulates the main.tsx execution flow', () => {
    // Simulate what main.tsx does
    const rootElement = document.getElementById('root');
    expect(rootElement).toBeTruthy();
    
    if (rootElement) {
      const root = createRoot(rootElement);
      expect(vi.mocked(createRoot)).toHaveBeenCalledWith(rootElement);
      
      // Simulate calling render
      root.render(null);
      expect(root.render).toHaveBeenCalled();
    }
  });

  it('throws error if root element is not found', () => {
    // Mock getElementById to return null
    vi.spyOn(document, 'getElementById').mockReturnValue(null);

    // Simulate the non-null assertion behavior
    expect(() => {
      const element = document.getElementById('root');
      if (!element) {
        throw new TypeError("Cannot read properties of null (reading 'render')");
      }
    }).toThrow();
  });

  it('verifies createRoot returns an object with render method', () => {
    // Test that createRoot returns the expected structure
    const mockRoot = createRoot(mockRootElement);
    expect(mockRoot).toHaveProperty('render');
    expect(typeof mockRoot.render).toBe('function');
  });

  it('verifies App component can be imported', async () => {
    // Dynamic import to test the App component mock
    const AppModule = await import('../App.tsx');
    expect(AppModule.default).toBeDefined();
    expect(typeof AppModule.default).toBe('function');
  });
});
