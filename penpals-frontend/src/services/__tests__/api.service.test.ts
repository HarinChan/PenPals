import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiClient, ApiError, isValidApiBaseUrl } from '../api';

describe('Api utilities', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    (ApiClient as any).token = null;
    (ApiClient as any).selectedBaseUrl = undefined;
  });

  it('validates API base URLs', () => {
    expect(isValidApiBaseUrl('')).toBe(false);
    expect(isValidApiBaseUrl('   ')).toBe(false);
    expect(isValidApiBaseUrl('ftp://example.com')).toBe(false);
    expect(isValidApiBaseUrl('http://example.com')).toBe(true);
    expect(isValidApiBaseUrl('https://example.com/path')).toBe(true);
    expect(isValidApiBaseUrl('not-a-url')).toBe(false);
  });

  it('uses VITE_API_BASE_URL when present at module init', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_API_BASE_URL', 'https://env.example.com/api///');

    const imported = await import('../api');
    expect(imported.ApiClient.getDefaultBaseUrl()).toBe('https://env.example.com/api');

    vi.unstubAllEnvs();
  });

  it('gets default and selected base URL from storage', () => {
    const defaultUrl = ApiClient.getDefaultBaseUrl();
    expect(defaultUrl).toContain('http');

    expect(ApiClient.getSelectedBaseUrl()).toBeNull();

    localStorage.setItem('penpals_api_base_url', 'https://api.example.com///');
    expect(ApiClient.getSelectedBaseUrl()).toBe('https://api.example.com');

    localStorage.setItem('penpals_api_base_url', 'invalid-url');
    expect(ApiClient.getSelectedBaseUrl()).toBeNull();
  });

  it('handles malformed selected base URL read errors', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage blocked');
    });

    expect(ApiClient.getSelectedBaseUrl()).toBeNull();
    getItemSpy.mockRestore();
  });

  it('manages API base URL history (dedupe, normalize, limit)', () => {
    expect(ApiClient.getBaseUrlHistory()).toEqual([]);

    ApiClient.saveBaseUrlToHistory('invalid-url');
    expect(ApiClient.getBaseUrlHistory()).toEqual([]);

    ApiClient.saveBaseUrlToHistory('https://one.example.com///');
    ApiClient.saveBaseUrlToHistory('https://two.example.com');
    ApiClient.saveBaseUrlToHistory('https://one.example.com');

    const history = ApiClient.getBaseUrlHistory();
    expect(history[0]).toBe('https://one.example.com');
    expect(history[1]).toBe('https://two.example.com');

    for (let index = 0; index < 12; index += 1) {
      ApiClient.saveBaseUrlToHistory(`https://h${index}.example.com`);
    }

    expect(ApiClient.getBaseUrlHistory().length).toBeLessThanOrEqual(8);
  });

  it('handles malformed base URL history JSON and storage read errors', () => {
    localStorage.setItem('penpals_api_base_url_history', '{not-json');
    expect(ApiClient.getBaseUrlHistory()).toEqual([]);

    localStorage.setItem('penpals_api_base_url_history', JSON.stringify({ not: 'array' }));
    expect(ApiClient.getBaseUrlHistory()).toEqual([]);

    localStorage.setItem(
      'penpals_api_base_url_history',
      JSON.stringify(['https://ok.example.com/', 123, 'bad'])
    );

    expect(ApiClient.getBaseUrlHistory()).toEqual(['https://ok.example.com']);

    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage blocked');
    });

    expect(ApiClient.getBaseUrlHistory()).toEqual([]);
    getItemSpy.mockRestore();
  });

  it('sets, gets, and clears explicit base URL', () => {
    ApiClient.setBaseUrl('https://api.example.com///');
    expect(ApiClient.getBaseUrl()).toBe('https://api.example.com');

    ApiClient.clearBaseUrl();
    expect(ApiClient.getSelectedBaseUrl()).toBeNull();
  });

  it('throws on invalid base URL set', () => {
    expect(() => ApiClient.setBaseUrl('invalid-url')).toThrow(ApiError);
  });

  it('gets base URL from selected cache fallback to default', () => {
    (ApiClient as any).selectedBaseUrl = undefined;
    localStorage.setItem('penpals_api_base_url', 'https://cached.example.com/');
    expect(ApiClient.getBaseUrl()).toBe('https://cached.example.com');

    (ApiClient as any).selectedBaseUrl = undefined;
    localStorage.removeItem('penpals_api_base_url');
    const baseUrl = ApiClient.getBaseUrl();
    expect(baseUrl).toBe(ApiClient.getDefaultBaseUrl());
  });

  it('sets, gets, and clears auth token', () => {
    ApiClient.setToken('abc123');
    expect(ApiClient.getToken()).toBe('abc123');
    expect(localStorage.getItem('penpals_token')).toBe('abc123');

    ApiClient.clearToken();
    expect(ApiClient.getToken()).toBeNull();
    expect(localStorage.getItem('penpals_token')).toBeNull();

    localStorage.setItem('penpals_token', 'stored-token');
    (ApiClient as any).token = null;
    expect(ApiClient.getToken()).toBe('stored-token');
  });
});

describe('ApiClient.request', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    (ApiClient as any).token = null;
    (ApiClient as any).selectedBaseUrl = 'http://localhost:5001/api';
  });

  it('performs successful JSON request with default content type and auth header', async () => {
    ApiClient.setToken('token-1');

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true }),
    });

    vi.stubGlobal('fetch', fetchSpy as any);

    const result = await ApiClient.request('/ping', { method: 'GET' });

    expect(result).toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:5001/api/ping');
    const headers = options.headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Authorization')).toBe('Bearer token-1');

    vi.unstubAllGlobals();
  });

  it('does not override existing content-type', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchSpy as any);

    await ApiClient.request('/content', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'hello',
    });

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Headers;
    expect(headers.get('Content-Type')).toBe('text/plain');

    vi.unstubAllGlobals();
  });

  it('does not set content-type for FormData body', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchSpy as any);

    const body = new FormData();
    body.append('file', new Blob(['a'], { type: 'text/plain' }), 'a.txt');

    await ApiClient.request('/upload', {
      method: 'POST',
      body,
    });

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Headers;
    expect(headers.has('Content-Type')).toBe(false);

    vi.unstubAllGlobals();
  });

  it('handles branch where FormData is unavailable', async () => {
    const originalFormData = (globalThis as any).FormData;
    Object.defineProperty(globalThis, 'FormData', {
      configurable: true,
      value: undefined,
    });

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchSpy as any);

    await ApiClient.request('/no-formdata', {
      method: 'POST',
      body: 'raw-body',
    });

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');

    Object.defineProperty(globalThis, 'FormData', {
      configurable: true,
      value: originalFormData,
    });
    vi.unstubAllGlobals();
  });

  it('wraps non-ok response with parsed API error message', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: vi.fn().mockResolvedValue({ msg: 'Custom API failure' }),
    });
    vi.stubGlobal('fetch', fetchSpy as any);

    await expect(ApiClient.request('/bad')).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'Custom API failure',
    });

    vi.unstubAllGlobals();
  });

  it('uses statusText when error JSON parsing fails', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: vi.fn().mockRejectedValue(new Error('not-json')),
    });
    vi.stubGlobal('fetch', fetchSpy as any);

    await expect(ApiClient.request('/error')).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
      message: 'Internal Server Error',
    });

    vi.unstubAllGlobals();
  });

  it('falls back to HTTP status when error JSON lacks msg/message', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      statusText: 'Unprocessable Entity',
      json: vi.fn().mockResolvedValue({}),
    });
    vi.stubGlobal('fetch', fetchSpy as any);

    await expect(ApiClient.request('/unprocessable')).rejects.toMatchObject({
      name: 'ApiError',
      status: 422,
      message: 'HTTP 422',
    });

    vi.unstubAllGlobals();
  });

  it('keeps HTTP fallback when statusText is empty and JSON parse fails', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 418,
      statusText: '',
      json: vi.fn().mockRejectedValue(new Error('bad json')),
    });
    vi.stubGlobal('fetch', fetchSpy as any);

    await expect(ApiClient.request('/teapot-empty-status')).rejects.toMatchObject({
      name: 'ApiError',
      status: 418,
      message: 'HTTP 418',
    });

    vi.unstubAllGlobals();
  });

  it('clears token when server returns 401', async () => {
    ApiClient.setToken('token-401');

    const clearSpy = vi.spyOn(ApiClient, 'clearToken');
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: vi.fn().mockResolvedValue({ message: 'Unauthorized' }),
    });
    vi.stubGlobal('fetch', fetchSpy as any);

    await expect(ApiClient.request('/secure')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
    });

    expect(clearSpy).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  it('falls back from localhost to 127.0.0.1 on network failure', async () => {
    const fetchSpy = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNREFUSED localhost'))
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ via: 'fallback' }),
      });

    vi.stubGlobal('fetch', fetchSpy as any);

    const result = await ApiClient.request('/health');

    expect(result).toEqual({ via: 'fallback' });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[0][0]).toBe('http://localhost:5001/api/health');
    expect(fetchSpy.mock.calls[1][0]).toBe('http://127.0.0.1:5001/api/health');

    vi.unstubAllGlobals();
  });

  it('throws network ApiError with localhost fallback hint when unrecoverable', async () => {
    const fetchSpy = vi.fn().mockRejectedValue(new Error('Network down'));
    vi.stubGlobal('fetch', fetchSpy as any);

    await expect(ApiClient.request('/offline')).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
    });

    await expect(ApiClient.request('/offline')).rejects.toThrow('127.0.0.1 is used as a fallback');

    vi.unstubAllGlobals();
  });

  it('throws network ApiError without localhost hint for non-localhost URL', async () => {
    ApiClient.setBaseUrl('https://api.remote.example.com');

    const fetchSpy = vi.fn().mockRejectedValue(new Error('Remote unreachable'));
    vi.stubGlobal('fetch', fetchSpy as any);

    await expect(ApiClient.request('/offline')).rejects.toThrow(
      'Unable to reach backend API at https://api.remote.example.com/offline.'
    );

    vi.unstubAllGlobals();
  });

  it('uses generic network message when thrown value is not an Error instance', async () => {
    ApiClient.setBaseUrl('https://api.remote.example.com');

    const fetchSpy = vi.fn().mockRejectedValue('string-failure');
    vi.stubGlobal('fetch', fetchSpy as any);

    await expect(ApiClient.request('/non-error')).rejects.toThrow(
      'Network error. Unable to reach backend API at https://api.remote.example.com/non-error.'
    );

    vi.unstubAllGlobals();
  });

  it('keeps existing ApiError untouched in catch path', async () => {
    const fetchSpy = vi.fn().mockRejectedValue(new ApiError('Already wrapped', 418));
    vi.stubGlobal('fetch', fetchSpy as any);

    await expect(ApiClient.request('/teapot')).rejects.toMatchObject({
      name: 'ApiError',
      status: 418,
      message: 'Already wrapped',
    });

    vi.unstubAllGlobals();
  });

  it('handles malformed URL when building fallback', async () => {
    (ApiClient as any).selectedBaseUrl = ':::';
    const fetchSpy = vi.fn().mockRejectedValue(new Error('Malformed URL fetch failure'));
    vi.stubGlobal('fetch', fetchSpy as any);

    await expect(ApiClient.request('/broken')).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});

describe('ApiClient convenience methods', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('delegates get/post/put/delete to request with expected options', async () => {
    const requestSpy = vi.spyOn(ApiClient, 'request')
      .mockResolvedValueOnce({ ok: 'get' } as any)
      .mockResolvedValueOnce({ ok: 'post' } as any)
      .mockResolvedValueOnce({ ok: 'put' } as any)
      .mockResolvedValueOnce({ ok: 'delete' } as any);

    await ApiClient.get('/g');
    await ApiClient.post('/p', { a: 1 });
    await ApiClient.put('/u', { b: 2 });
    await ApiClient.delete('/d', { c: 3 });

    expect(requestSpy).toHaveBeenNthCalledWith(1, '/g', { method: 'GET' });
    expect(requestSpy).toHaveBeenNthCalledWith(2, '/p', { method: 'POST', body: JSON.stringify({ a: 1 }) });
    expect(requestSpy).toHaveBeenNthCalledWith(3, '/u', { method: 'PUT', body: JSON.stringify({ b: 2 }) });
    expect(requestSpy).toHaveBeenNthCalledWith(4, '/d', { method: 'DELETE', body: JSON.stringify({ c: 3 }) });
  });

  it('omits body when post/put/delete data is undefined', async () => {
    const requestSpy = vi.spyOn(ApiClient, 'request')
      .mockResolvedValueOnce({} as any)
      .mockResolvedValueOnce({} as any)
      .mockResolvedValueOnce({} as any);

    await ApiClient.post('/p');
    await ApiClient.put('/u');
    await ApiClient.delete('/d');

    expect(requestSpy).toHaveBeenNthCalledWith(1, '/p', { method: 'POST', body: undefined });
    expect(requestSpy).toHaveBeenNthCalledWith(2, '/u', { method: 'PUT', body: undefined });
    expect(requestSpy).toHaveBeenNthCalledWith(3, '/d', { method: 'DELETE', body: undefined });
  });
});
