import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useApi, useAsyncAction, useAuth, useForm } from '../useApi';
import { ApiError } from '../../services/api';

describe('useApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('initializes with default state', () => {
      const apiCall = vi.fn();
      const { result } = renderHook(() => useApi(apiCall));

      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('executes api call successfully when execute is called', async () => {
      const mockData = { id: 1, name: 'Test' };
      const apiCall = vi.fn().mockResolvedValue(mockData);
      const { result } = renderHook(() => useApi(apiCall));

      expect(result.current.loading).toBe(false);

      act(() => {
        result.current.execute();
      });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
      expect(apiCall).toHaveBeenCalledTimes(1);
    });

    it('handles api error correctly', async () => {
      const apiError = new ApiError('API Error', 500);
      const apiCall = vi.fn().mockRejectedValue(apiError);
      const { result } = renderHook(() => useApi(apiCall));

      await act(async () => {
        try {
          await result.current.execute();
        } catch (error) {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('API Error');
      expect(result.current.data).toBeNull();
    });

    it('handles non-ApiError with default message', async () => {
      const genericError = new Error('Generic error');
      const apiCall = vi.fn().mockRejectedValue(genericError);
      const { result } = renderHook(() => useApi(apiCall));

      await act(async () => {
        try {
          await result.current.execute();
        } catch (error) {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBe('An unexpected error occurred');
      });
    });

    it('resets state when reset is called', async () => {
      const mockData = { id: 1, name: 'Test' };
      const apiCall = vi.fn().mockResolvedValue(mockData);
      const { result } = renderHook(() => useApi(apiCall));

      await act(async () => {
        await result.current.execute();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('immediate option', () => {
    it('executes immediately when immediate is true', async () => {
      const mockData = { id: 1, name: 'Test' };
      const apiCall = vi.fn().mockResolvedValue(mockData);

      renderHook(() => useApi(apiCall, { immediate: true }));

      await waitFor(() => {
        expect(apiCall).toHaveBeenCalledTimes(1);
      });
    });

    it('does not execute immediately when immediate is false', () => {
      const apiCall = vi.fn().mockResolvedValue({});

      renderHook(() => useApi(apiCall, { immediate: false }));

      expect(apiCall).not.toHaveBeenCalled();
    });
  });

  describe('callbacks', () => {
    it('calls onSuccess callback when api call succeeds', async () => {
      const mockData = { id: 1, name: 'Test' };
      const apiCall = vi.fn().mockResolvedValue(mockData);
      const onSuccess = vi.fn();

      const { result } = renderHook(() => useApi(apiCall, { onSuccess }));

      await act(async () => {
        await result.current.execute();
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(mockData);
      });
    });

    it('calls onError callback when api call fails', async () => {
      const apiError = new ApiError('API Error', 500);
      const apiCall = vi.fn().mockRejectedValue(apiError);
      const onError = vi.fn();

      const { result } = renderHook(() => useApi(apiCall, { onError }));

      await act(async () => {
        try {
          await result.current.execute();
        } catch (error) {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(apiError);
      });
    });
  });
});

describe('useAsyncAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with default state', () => {
    const apiCall = vi.fn();
    const { result } = renderHook(() => useAsyncAction(apiCall));

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('executes api call with params successfully', async () => {
    const mockData = { success: true };
    const params = { email: 'test@example.com', password: 'pass' };
    const apiCall = vi.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() => useAsyncAction(apiCall));

    await act(async () => {
      await result.current.execute(params);
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(apiCall).toHaveBeenCalledWith(params);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles error correctly', async () => {
    const apiError = new ApiError('Invalid credentials', 401);
    const apiCall = vi.fn().mockRejectedValue(apiError);

    const { result } = renderHook(() => useAsyncAction(apiCall));

    await act(async () => {
      try {
        await result.current.execute({});
      } catch (error) {
        // Expected to throw
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Invalid credentials');
    });
  });

  it('calls onSuccess callback', async () => {
    const mockData = { success: true };
    const apiCall = vi.fn().mockResolvedValue(mockData);
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useAsyncAction(apiCall, { onSuccess }));

    await act(async () => {
      await result.current.execute({});
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockData);
    });
  });

  it('resets state correctly', async () => {
    const mockData = { success: true };
    const apiCall = vi.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() => useAsyncAction(apiCall));

    await act(async () => {
      await result.current.execute({});
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });
});

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('initializes with loading state', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);
  });

  it('checks authentication on mount', async () => {
    const mockAuthService = {
      isAuthenticated: vi.fn().mockReturnValue(true),
      login: vi.fn(),
      logout: vi.fn(),
    };

    vi.doMock('../../services', () => ({
      AuthService: mockAuthService,
    }));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
  });

  it('handles login successfully', async () => {
    const mockAuthResponse = { access_token: 'token', account_id: 1 };
    const mockAuthService = {
      isAuthenticated: vi.fn().mockReturnValue(false),
      login: vi.fn().mockResolvedValue(mockAuthResponse),
      logout: vi.fn(),
    };

    vi.doMock('../../services', () => ({
      AuthService: mockAuthService,
    }));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const credentials = { email: 'test@example.com', password: 'pass' };

    await act(async () => {
      await result.current.login(credentials);
    });

    expect(result.current.isAuthenticated).toBe(true);
  });

  it('handles logout correctly', async () => {
    const mockAuthService = {
      isAuthenticated: vi.fn().mockReturnValue(true),
      login: vi.fn(),
      logout: vi.fn(),
    };

    vi.doMock('../../services', () => ({
      AuthService: mockAuthService,
    }));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
  });
});

describe('useForm', () => {
  it('initializes with default values', () => {
    const initialValues = { email: '', password: '' };
    const { result } = renderHook(() => useForm(initialValues));

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual([]);
    expect(result.current.isValid).toBe(true);
  });

  it('updates value when setValue is called', () => {
    const initialValues = { email: '', password: '' };
    const { result } = renderHook(() => useForm(initialValues));

    act(() => {
      result.current.setValue('email', 'test@example.com');
    });

    expect(result.current.values.email).toBe('test@example.com');
    expect(result.current.touched.email).toBe(true);
  });

  it('sets field as touched when value changes', () => {
    const initialValues = { email: '', password: '' };
    const { result } = renderHook(() => useForm(initialValues));

    expect(result.current.isFieldTouched('email')).toBe(false);

    act(() => {
      result.current.setValue('email', 'test@example.com');
    });

    expect(result.current.isFieldTouched('email')).toBe(true);
    expect(result.current.isFieldTouched('password')).toBe(false);
  });

  it('validates form with validator function', () => {
    const initialValues = { email: '', password: '' };
    const validator = (values: typeof initialValues) => {
      const errors: string[] = [];
      if (!values.email) errors.push('Email is required');
      if (!values.password) errors.push('Password is required');
      return { isValid: errors.length === 0, errors };
    };

    const { result } = renderHook(() => useForm(initialValues, validator));

    act(() => {
      result.current.validate();
    });

    expect(result.current.errors).toContain('Email is required');
    expect(result.current.errors).toContain('Password is required');
    expect(result.current.isValid).toBe(false);
  });

  it('returns valid when validator passes', () => {
    const initialValues = { email: 'test@example.com', password: 'pass123' };
    const validator = (values: typeof initialValues) => {
      const errors: string[] = [];
      if (!values.email) errors.push('Email is required');
      if (!values.password) errors.push('Password is required');
      return { isValid: errors.length === 0, errors };
    };

    const { result } = renderHook(() => useForm(initialValues, validator));

    act(() => {
      result.current.validate();
    });

    expect(result.current.errors).toEqual([]);
    expect(result.current.isValid).toBe(true);
  });

  it('sets field error', () => {
    const initialValues = { email: '', password: '' };
    const { result } = renderHook(() => useForm(initialValues));

    act(() => {
      result.current.setFieldError('email', 'Email is invalid');
    });

    expect(result.current.errors).toContain('Email is invalid');
    expect(result.current.isValid).toBe(false);
  });

  it('resets form to initial values', () => {
    const initialValues = { email: '', password: '' };
    const { result } = renderHook(() => useForm(initialValues));

    act(() => {
      result.current.setValue('email', 'test@example.com');
      result.current.setValue('password', 'pass123');
      result.current.setFieldError('email', 'Some error');
    });

    expect(result.current.values.email).toBe('test@example.com');
    expect(result.current.errors.length).toBeGreaterThan(0);

    act(() => {
      result.current.reset();
    });

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual([]);
    expect(result.current.touched).toEqual({});
  });

  it('validates without validator returns valid', () => {
    const initialValues = { email: '', password: '' };
    const { result } = renderHook(() => useForm(initialValues));

    let validationResult;
    act(() => {
      validationResult = result.current.validate();
    });

    expect(validationResult).toEqual({ isValid: true, errors: [] });
    expect(result.current.isValid).toBe(true);
  });
});
