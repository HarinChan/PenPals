// React hooks for API integration

import { useState, useEffect, useCallback } from 'react';
import { ApiError } from '../services/api';

export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface UseApiOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: ApiError) => void;
}

/**
 * Generic hook for API calls with loading and error states
 */
export function useApi<T = any>(
  apiCall: () => Promise<T>,
  options: UseApiOptions = {}
) {
  const { immediate = false, onSuccess, onError } = options;
  
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await apiCall();
      setState({ data: result, loading: false, error: null });
      onSuccess?.(result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'An unexpected error occurred';
      
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      onError?.(error as ApiError);
      throw error;
    }
  }, [apiCall, onSuccess, onError]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return {
    ...state,
    execute,
    reset,
  };
}

/**
 * Hook for API calls that need to be triggered manually (like form submissions)
 */
export function useAsyncAction<T = any, P = any>(
  apiCall: (params: P) => Promise<T>,
  options: UseApiOptions = {}
) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (params: P) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await apiCall(params);
      setState({ data: result, loading: false, error: null });
      options.onSuccess?.(result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'An unexpected error occurred';
      
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      options.onError?.(error as ApiError);
      throw error;
    }
  }, [apiCall, options]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

/**
 * Hook for managing authentication state
 */
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated on mount
    const checkAuth = async () => {
      try {
        const { AuthService } = await import('../services');
        setIsAuthenticated(AuthService.isAuthenticated());
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (credentials: any) => {
    const { AuthService } = await import('../services');
    const result = await AuthService.login(credentials);
    setIsAuthenticated(true);
    return result;
  }, []);

  const logout = useCallback(async () => {
    const { AuthService } = await import('../services');
    AuthService.logout();
    setIsAuthenticated(false);
  }, []);

  return {
    isAuthenticated,
    loading,
    login,
    logout,
  };
}

/**
 * Hook for managing form state with validation
 */
export function useForm<T extends Record<string, any>>(
  initialValues: T,
  validator?: (values: T) => { isValid: boolean; errors: string[] }
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<string[]>([]);
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>);

  const setValue = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors(prev => [...prev.filter(e => !e.includes(String(field))), error]);
  }, []);

  const validate = useCallback(() => {
    if (!validator) return { isValid: true, errors: [] };
    
    const result = validator(values);
    setErrors(result.errors);
    return result;
  }, [values, validator]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors([]);
    setTouched({} as Record<keyof T, boolean>);
  }, [initialValues]);

  const isFieldTouched = useCallback((field: keyof T) => {
    return touched[field] || false;
  }, [touched]);

  return {
    values,
    errors,
    touched,
    setValue,
    setFieldError,
    validate,
    reset,
    isFieldTouched,
    isValid: errors.length === 0,
  };
}