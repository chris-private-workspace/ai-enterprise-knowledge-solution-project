/**
 * Backend API client (per architecture.md §4.4 — 18 endpoints).
 *
 * Reads `NEXT_PUBLIC_API_URL` from env (.env.example).
 * W1 stub: thin fetch wrapper. W2+ adds typed methods per route group.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`API error ${status}: ${body}`);
  }
}

export class ApiClient {
  constructor(private readonly baseUrl: string = API_URL) {}

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`);
    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }
    return response.json() as Promise<T>;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }
    return response.json() as Promise<T>;
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }
    return response.json() as Promise<T>;
  }
}

export const apiClient = new ApiClient();
