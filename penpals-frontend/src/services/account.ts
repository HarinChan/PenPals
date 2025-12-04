import { Account } from '../types';

const API_BASE_URL = 'http://localhost:5001/api';

export interface ProfileResponse {
    status: 'success' | 'error';
    data?: Account;
    message?: string;
}

/**
 * Get classroom profile information based on accountID
 */
export async function getAccountProfile(id: string): Promise<ProfileResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/profiles/get`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching account profile:', error);
        return {
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
