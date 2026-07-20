/**
 * Single place where the API base URL is resolved.
 *
 * import.meta.env.VITE_API_URL is replaced by Vite at BUILD time — it is a
 * literal string in the shipped bundle, not something read at runtime. That is
 * why each environment needs its own build.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    // Surface the API's error message when it sends one, so validation
    // failures are actually readable in the UI.
    let message = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // Non-JSON error body — keep the status-based message.
    }
    throw new Error(message);
  }

  return res.status === 204 ? null : res.json();
}

export const api = {
  listNotes: () => request('/api/notes'),
  createNote: (data) => request('/api/notes', { method: 'POST', body: JSON.stringify(data) }),
  deleteNote: (id) => request(`/api/notes/${id}`, { method: 'DELETE' }),
  readiness: () => request('/ready'),
};

export { BASE_URL };
