import { ApiClient } from './api';

export class WebexService {
    /**
     * Get the WebEx OAuth authorization URL
     */
    static async getAuthUrl(): Promise<{ url: string }> {
        return ApiClient.get<{ url: string }>('/webex/auth-url');
    }

    /**
     * connect WebEx account using auth code
     */
    static async connect(code: string): Promise<{ msg: string }> {
        return ApiClient.post<{ msg: string }>('/webex/connect', { code });
    }

    /**
     * Check connection status
     */
    static async getStatus(): Promise<{ connected: boolean }> {
        return ApiClient.get<{ connected: boolean }>('/webex/status');
    }

    /**
     * Disconnect WebEx account
     */
    static async disconnect(): Promise<{ msg: string }> {
        return ApiClient.post<{ msg: string }>('/webex/disconnect');
    }
}
