/**
 * Auth token management using SecureStore
 */

import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'auth_access_token';
const AUTH_REFRESH_TOKEN_KEY = 'auth_refresh_token';

/**
 * Save auth access token
 */
export async function saveAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

/**
 * Get auth access token
 */
export async function getAuthToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

/**
 * Save auth refresh token
 */
export async function saveAuthRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(AUTH_REFRESH_TOKEN_KEY, token);
}

/**
 * Get auth refresh token
 */
export async function getAuthRefreshToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(AUTH_REFRESH_TOKEN_KEY);
}

/**
 * Clear all auth tokens
 */
export async function clearAuthTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(AUTH_REFRESH_TOKEN_KEY);
}


