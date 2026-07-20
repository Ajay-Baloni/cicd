import { useCallback, useEffect, useState } from 'react';
import { api, BASE_URL } from './api/client.js';

export default function App() {
  const [notes, setNotes] = useState([]);
  const [status, setStatus] = useState('checking');
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ title: '', body: '' });
  const [saving, setSaving] = useState(false);

  const loadNotes = useCallback(async () => {
    try {
      setNotes(await api.listNotes());
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // Surfacing the API's readiness in the UI is genuinely useful while learning
  // a deploy pipeline: during a blue/green switch you can watch this flip.
  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        await api.readiness();
        if (!cancelled) setStatus('ready');
      } catch {
        if (!cancelled) setStatus('unreachable');
      }
    }

    check();
    loadNotes();

    const interval = setInterval(check, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [loadNotes]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.createNote(form);
      setForm({ title: '', body: '' });
      setError(null);
      await loadNotes();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteNote(id);
      await loadNotes();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="app">
      <header className="header">
        <h1>CI/CD Notes</h1>
        <div className={`status status--${status}`}>
          <span className="status__dot" aria-hidden="true" />
          <span>API {status}</span>
          <code className="status__url">{BASE_URL}</code>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <form className="form" onSubmit={handleSubmit}>
        <input
          className="input"
          placeholder="Title"
          value={form.title}
          maxLength={200}
          required
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <textarea
          className="input"
          placeholder="Body"
          rows={3}
          value={form.body}
          onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
        />
        <button className="button" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Add note'}
        </button>
      </form>

      <section className="notes">
        {notes.length === 0 ? (
          <p className="empty">No notes yet. Add one above.</p>
        ) : (
          notes.map((note) => (
            <article className="note" key={note.id}>
              <div className="note__main">
                <h2 className="note__title">{note.title}</h2>
                {note.body && <p className="note__body">{note.body}</p>}
                <time className="note__time" dateTime={note.createdAt}>
                  {new Date(note.createdAt).toLocaleString()}
                </time>
              </div>
              <button
                className="button button--ghost"
                onClick={() => handleDelete(note.id)}
                aria-label={`Delete ${note.title}`}
              >
                Delete
              </button>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
