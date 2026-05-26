import "server-only";

import {
  DEVBOX_API_PREFIX,
  getDevboxArchiveAfterPauseTimeFromEnv,
  getDevboxAuthTokenFromEnv,
  getDevboxBaseUrlFromEnv,
  getDevboxDefaultImageFromEnv,
  getSealosHostFromEnv,
} from "./config-core";

export function getSealosHost(): string {
  return getSealosHostFromEnv(process.env);
}

export function getDevboxBaseUrl(): string {
  return getDevboxBaseUrlFromEnv(process.env);
}

export function getDevboxApiPrefix(): string {
  return DEVBOX_API_PREFIX;
}

export function getDevboxDefaultImage(): string | undefined {
  return getDevboxDefaultImageFromEnv(process.env);
}

export function getDevboxArchiveAfterPauseTime(): string | undefined {
  return getDevboxArchiveAfterPauseTimeFromEnv(process.env);
}

export async function getDevboxAuthToken(namespace: string): Promise<string> {
  return await getDevboxAuthTokenFromEnv(process.env, namespace);
}
