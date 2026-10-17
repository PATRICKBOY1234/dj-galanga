import { useCallback, useEffect, useRef, useState } from "react";
import "./Admin.css";
import { DjAvatar } from "./Art";

const API_URL = "http://localhost:5000/api";
const TOKEN_KEY = "dg_admin_token";
const CATEGORIES = [
  "Ugandan", "Kikkade", "Kadongo Kamu", "Afrobeats", "Dancehall", "Reggae", "Amapiano", "Old School", "Gospel",
  "Hip Hop", "R&B", "Bongo Flava", "Rumba", "Genge", "Artist Mixes", "Pop", "House", "EDM", "Reggaeton",
  "Rock", "Jazz", "Slow Jams", "Country",
];
const EVENT_TYPES = ["Club", "Festival", "Private"];
const STATUSES = ["new", "contacted", "confirmed", "declined"];

const getToken = () => {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
};
const saveToken = (t) => {
  try {
    if (t) sessionStorage.setItem(TOKEN_KEY, t);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
};

async function api(path, { method = "GET", body, token } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(API_URL + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  if (!res.ok) {
    const err = new Error((data && data.error) || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data;
}

const friendly = (err) =>
  err.message === "Failed to fetch" ? "Cannot reach the server. Start it with node server.js." : err.message;

const fmtNum = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(".0", "")}k` : `${n}`);
const fmtDate = (iso) =>
  iso
    ? new Date(String(iso).slice(0, 10) + "T00:00:00").toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
const whatsappLink = (phone) => {
  let d = String(phone).replace(/\D/g, "");
  if (d.startsWith("0")) d = "256" + d.slice(1);
  return "https://wa.me/" + d;
};

/* ---------------- Login ---------------- */
function Login({ onLoggedIn, notice }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Enter your username and password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await api("/auth/login", { method: "POST", body: { username: username.trim(), password } });
      onLoggedIn(data.token, data.username);
    } catch (err) {
      setError(friendly(err));
      setBusy(false);
    }
  };

  return (
    <div className="ad-login">
      <form className="ad-login-card" onSubmit={submit} noValidate>
        <div className="ad-login-avatar"><DjAvatar /></div>
        <h1>DJ Dashboard</h1>
        <p className="ad-muted">Sign in to manage your mixes, events and bookings.</p>
        {notice && <p className="ad-notice">{notice}</p>}
        <div className="field">
          <label htmlFor="ad-user">Username</label>
          <input id="ad-user" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        </div>
        <div className="field">
          <label htmlFor="ad-pass">Password</label>
          <div className="ad-pass">
            <input
              id="ad-pass"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" className="ad-link" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button>
          </div>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn btn--gold btn--wide" type="submit" disabled={busy}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
        <button type="button" className="ad-link ad-center" onClick={() => (window.location.hash = "Home")}>
          ← Back to website
        </button>
      </form>
    </div>
  );
}

/* ---------------- Overview ---------------- */
function Overview({ stats, go }) {
  const v = (key, format) => (stats ? (format ? fmtNum(stats[key]) : stats[key]) : "-");
  return (
    <>
      <div className="ad-stats">
        <div className="ad-stat"><span>Mixes uploaded</span><strong>{v("mixes")}</strong></div>
        <div className="ad-stat"><span>Trending mixes</span><strong>{v("trending")}</strong></div>
        <div className="ad-stat"><span>Total plays</span><strong>{v("plays", true)}</strong></div>
        <div className="ad-stat"><span>Total downloads</span><strong>{v("downloads", true)}</strong></div>
        <div className="ad-stat"><span>Upcoming events</span><strong>{v("upcomingEvents")}</strong></div>
        <div className="ad-stat"><span>Booking requests</span><strong>{v("bookings")}</strong></div>
        <div className="ad-stat ad-stat--hot"><span>New requests</span><strong>{v("newBookings")}</strong></div>
      </div>
      <div className="ad-card">
        <h2>Quick actions</h2>
        <div className="ad-actions">
          <button className="btn btn--gold" onClick={() => go("mixes")}>Upload a mix</button>
          <button className="btn btn--outline" onClick={() => go("events")}>Add an event</button>
          <button className="btn btn--outline" onClick={() => go("bookings")}>View bookings</button>
        </div>
      </div>
    </>
  );
}

/* ---------------- Mixes ---------------- */
const formatDuration = (seconds) => `${Math.max(1, Math.round(seconds / 60))} min`;
const checkStyle = { display: "flex", alignItems: "center", gap: 10, fontWeight: 600, cursor: "pointer", margin: "6px 0 4px" };

function MixesPanel({ ctx }) {
  const { call, token, notify, onAuthLost, refreshStats } = ctx;
  const [mixes, setMixes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", category: CATEGORIES[0], duration: "", trending: false });
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [listFilter, setListFilter] = useState("all");
  const fileRef = useRef(null);

  const load = useCallback(
    () =>
      call("/mixes")
        .then(setMixes)
        .catch((e) => notify(friendly(e), "error"))
        .finally(() => setLoading(false)),
    [call, notify]
  );
  useEffect(() => {
    load();
  }, [load]);

  const chooseFile = (e) => {
    const f = e.target.files[0];
    setError("");
    if (!f) {
      setFile(null);
      return;
    }
    setFile(f);
    setForm((cur) => ({
      ...cur,
      title: cur.title || f.name.replace(/\.[^.]+$/, "").replace(/_+/g, " "),
    }));
    const url = URL.createObjectURL(f);
    const probe = new Audio();
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      if (isFinite(probe.duration)) setForm((cur) => ({ ...cur, duration: formatDuration(probe.duration) }));
      URL.revokeObjectURL(url);
    };
    probe.onerror = () => URL.revokeObjectURL(url);
    probe.src = url;
  };

  const upload = (e) => {
    e.preventDefault();
    setError("");
    if (!file) return setError("Choose an audio file to upload.");
    if (form.title.trim().length < 2) return setError("Enter a title for the mix.");
    if (file.size > 300 * 1024 * 1024) return setError("That file is larger than 300 MB.");

    const fd = new FormData();
    fd.append("title", form.title.trim());
    fd.append("category", form.category);
    fd.append("duration", form.duration.trim());
    fd.append("trending", form.trending ? "true" : "false");
    fd.append("audio", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", API_URL + "/admin/mixes");
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* no body */
      }
      setProgress(null);
      if (xhr.status === 201) {
        notify(form.trending ? "Mix uploaded and added to Trending now." : "Mix uploaded. It is now live on the website.");
        setForm({ title: "", category: form.category, duration: "", trending: false });
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
        load();
        refreshStats();
      } else if (xhr.status === 401) {
        onAuthLost();
      } else {
        setError(data.error || "Upload failed.");
      }
    };
    xhr.onerror = () => {
      setProgress(null);
      setError("Upload failed. Is the server running?");
    };
    setProgress(0);
    xhr.send(fd);
  };

  const toggleTrending = async (mix) => {
    try {
      const updated = await call(`/admin/mixes/${mix.id}/trending`, {
        method: "PATCH",
        body: { trending: !mix.trending },
      });
      setMixes((list) => list.map((x) => (x.id === updated.id ? updated : x)));
      notify(updated.trending ? "Added to Trending now." : "Removed from Trending now.");
      refreshStats();
    } catch (err) {
      notify(friendly(err), "error");
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      await call(`/admin/mixes/${editing.id}`, {
        method: "PUT",
        body: { title: editing.title, category: editing.category, duration: editing.length },
      });
      notify("Mix updated.");
      setEditing(null);
      load();
    } catch (err) {
      notify(friendly(err), "error");
    }
  };

  const remove = async (mix) => {
    if (!window.confirm(`Delete "${mix.title}"? The audio file will be removed permanently.`)) return;
    try {
      await call(`/admin/mixes/${mix.id}`, { method: "DELETE" });
      notify("Mix deleted.");
      load();
      refreshStats();
    } catch (err) {
      notify(friendly(err), "error");
    }
  };

  const trendingCount = mixes.filter((m) => m.trending).length;
  const shown = mixes.filter((m) => listFilter === "all" || m.trending);

  return (
    <>
      <form className="ad-card" onSubmit={upload} noValidate>
        <h2>Upload a new mix</h2>
        <div className="ad-grid">
          <div className="field ad-full">
            <label htmlFor="mx-file">Audio file (mp3, m4a, wav, ogg, aac, up to 300 MB)</label>
            <input id="mx-file" ref={fileRef} type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac" onChange={chooseFile} disabled={progress !== null} />
          </div>
          <div className="field">
            <label htmlFor="mx-title">Title</label>
            <input id="mx-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="mx-cat">Category</label>
            <select id="mx-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="mx-dur">Length (filled in automatically)</label>
            <input id="mx-dur" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="58 min" />
          </div>
        </div>
        <label style={checkStyle}>
          <input
            type="checkbox"
            checked={form.trending}
            onChange={(e) => setForm({ ...form, trending: e.target.checked })}
            style={{ width: 18, height: 18, accentColor: "#ffb800" }}
          />
          <span>Show in Trending now</span>
        </label>
        <p className="ad-muted" style={{ marginBottom: 12 }}>
          Visitors see up to 8 trending mixes on the home page, newest pick first. Mixes you do not tick stay only in the library.
        </p>
        {progress !== null && (
          <div className="ad-progress" aria-label="Upload progress">
            <div style={{ width: `${progress}%` }} />
            <span>{progress}%</span>
          </div>
        )}
        {error && <p className="error">{error}</p>}
        <button className="btn btn--gold" type="submit" disabled={progress !== null}>
          {progress !== null ? "Uploading..." : "Upload mix"}
        </button>
      </form>

      <div className="ad-card">
        <h2>Your mixes ({mixes.length})</h2>
        <div className="chips">
          <button className={`chip ${listFilter === "all" ? "chip--active" : ""}`} onClick={() => setListFilter("all")}>
            All mixes
          </button>
          <button className={`chip ${listFilter === "trending" ? "chip--active" : ""}`} onClick={() => setListFilter("trending")}>
            Trending ({trendingCount})
          </button>
        </div>
        {loading && <p className="ad-muted">Loading...</p>}
        {!loading && mixes.length === 0 && <p className="ad-muted">No mixes yet. Upload your first one above.</p>}
        {!loading && mixes.length > 0 && shown.length === 0 && (
          <p className="ad-muted">Nothing is in Trending now yet. Press Add to Trending on any mix.</p>
        )}
        <div className="ad-list">
          {shown.map((m) => (
            <article className="ad-item" key={m.id}>
              <div className="ad-item-top">
                <div>
                  <h3>{m.title}</h3>
                  <p className="ad-muted">
                    <span className="tag">{m.category}</span>
                    {m.trending && <span className="tag">Trending</span>}
                    {m.length ? `${m.length} · ` : ""}{fmtDate(m.date)} · ▶ {fmtNum(m.plays)} · ⬇ {fmtNum(m.downloads)}
                  </p>
                </div>
                <div className="ad-buttons">
                  <button className={`btn ${m.trending ? "btn--play" : "btn--gold"}`} onClick={() => toggleTrending(m)}>
                    {m.trending ? "Remove from Trending" : "Add to Trending"}
                  </button>
                  <button className="btn btn--play" onClick={() => setEditing({ ...m })}>Edit</button>
                  <button className="btn ad-danger" onClick={() => remove(m)}>Delete</button>
                </div>
              </div>
              <audio controls preload="none" src={m.src} />
            </article>
          ))}
        </div>
      </div>

      {editing && (
        <div className="ad-modal" onClick={() => setEditing(null)}>
          <form className="ad-modal-card" onClick={(e) => e.stopPropagation()} onSubmit={saveEdit}>
            <h2>Edit mix</h2>
            <div className="field">
              <label htmlFor="ed-title">Title</label>
              <input id="ed-title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="ed-cat">Category</label>
              <select id="ed-cat" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="ed-dur">Length</label>
              <input id="ed-dur" value={editing.length} onChange={(e) => setEditing({ ...editing, length: e.target.value })} />
            </div>
            <div className="ad-buttons">
              <button className="btn btn--gold" type="submit">Save changes</button>
              <button className="btn btn--outline" type="button" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

/* ---------------- Events ---------------- */
const EMPTY_EVENT = { date: "", venue: "", city: "", type: "Club", price: "" };

function EventsPanel({ ctx }) {
  const { call, notify, refreshStats } = ctx;
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_EVENT);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  const load = useCallback(
    () =>
      call("/admin/events")
        .then(setEvents)
        .catch((e) => notify(friendly(e), "error"))
        .finally(() => setLoading(false)),
    [call, notify]
  );
  useEffect(() => {
    load();
  }, [load]);

  const add = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.date) return setError("Choose the event date.");
    if (form.venue.trim().length < 2 || form.city.trim().length < 2) return setError("Enter the venue and the city.");
    setBusy(true);
    try {
      await call("/admin/events", { method: "POST", body: form });
      notify("Event added to the website.");
      setForm(EMPTY_EVENT);
      load();
      refreshStats();
    } catch (err) {
      setError(friendly(err));
    }
    setBusy(false);
  };

  const remove = async (ev) => {
    if (!window.confirm(`Delete the event at ${ev.venue}?`)) return;
    try {
      await call(`/admin/events/${ev.id}`, { method: "DELETE" });
      notify("Event deleted.");
      load();
      refreshStats();
    } catch (err) {
      notify(friendly(err), "error");
    }
  };

  return (
    <>
      <form className="ad-card" onSubmit={add} noValidate>
        <h2>Add an event</h2>
        <div className="ad-grid">
          <div className="field">
            <label htmlFor="ev-date">Date</label>
            <input id="ev-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="ev-type">Type</label>
            <select id="ev-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ev-venue">Venue</label>
            <input id="ev-venue" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="ev-city">City</label>
            <input id="ev-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="field ad-full">
            <label htmlFor="ev-price">Entry price (for example UGX 20,000 or Free)</label>
            <input id="ev-price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn btn--gold" type="submit" disabled={busy}>{busy ? "Adding..." : "Add event"}</button>
      </form>

      <div className="ad-card">
        <h2>All events ({events.length})</h2>
        {loading && <p className="ad-muted">Loading...</p>}
        {!loading && events.length === 0 && <p className="ad-muted">No events yet.</p>}
        <div className="ad-list">
          {events.map((ev) => (
            <article className={`ad-item ad-item--row ${ev.date < today ? "ad-item--past" : ""}`} key={ev.id}>
              <div>
                <h3>{ev.venue}, {ev.city}</h3>
                <p className="ad-muted">
                  <span className="tag">{ev.type}</span>
                  {fmtDate(ev.date)} · {ev.price || "Price not set"}
                  {ev.date < today ? " · Past event (hidden from the website)" : ""}
                </p>
              </div>
              <button className="btn ad-danger" onClick={() => remove(ev)}>Delete</button>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---------------- Bookings ---------------- */
function BookingsPanel({ ctx }) {
  const { call, notify, refreshStats } = ctx;
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = useCallback(
    () =>
      call("/admin/bookings")
        .then(setBookings)
        .catch((e) => notify(friendly(e), "error"))
        .finally(() => setLoading(false)),
    [call, notify]
  );
  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (b, status) => {
    try {
      await call(`/admin/bookings/${b.id}`, { method: "PATCH", body: { status } });
      setBookings((list) => list.map((x) => (x.id === b.id ? { ...x, status } : x)));
      refreshStats();
    } catch (err) {
      notify(friendly(err), "error");
    }
  };

  const remove = async (b) => {
    if (!window.confirm(`Delete the booking request from ${b.name}?`)) return;
    try {
      await call(`/admin/bookings/${b.id}`, { method: "DELETE" });
      notify("Booking request deleted.");
      load();
      refreshStats();
    } catch (err) {
      notify(friendly(err), "error");
    }
  };

  const list = bookings.filter((b) => filter === "all" || b.status === filter);

  return (
    <div className="ad-card">
      <h2>Booking requests ({bookings.length})</h2>
      <div className="chips">
        {["all", ...STATUSES].map((s) => (
          <button key={s} className={`chip ${filter === s ? "chip--active" : ""}`} onClick={() => setFilter(s)}>
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      {loading && <p className="ad-muted">Loading...</p>}
      {!loading && list.length === 0 && <p className="ad-muted">No booking requests here.</p>}
      <div className="ad-list">
        {list.map((b) => (
          <article className={`ad-item ad-status-${b.status}`} key={b.id}>
            <div className="ad-item-top">
              <div>
                <h3>{b.name}</h3>
                <p className="ad-muted">
                  <span className="tag">{b.type}</span>
                  Event on {fmtDate(b.date)}{b.guests ? ` · ${b.guests} guests` : ""} · sent {String(b.createdAt).slice(0, 10)}
                </p>
              </div>
              <select value={b.status} onChange={(e) => changeStatus(b, e.target.value)} aria-label="Booking status">
                {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <p className="ad-message">{b.message}</p>
            <div className="ad-buttons">
              <a className="btn btn--play" href={`mailto:${b.email}`}>Email</a>
              <a className="btn btn--play" href={`tel:${b.phone}`}>Call</a>
              <a className="btn btn--play" href={whatsappLink(b.phone)} target="_blank" rel="noreferrer">WhatsApp</a>
              <button className="btn ad-danger" onClick={() => remove(b)}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Settings ---------------- */
function SettingsPanel({ ctx, username }) {
  const { call, notify } = ctx;
  const [form, setForm] = useState({ current: "", next: "", again: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.next.length < 8) return setError("The new password must be at least 8 characters.");
    if (form.next !== form.again) return setError("The two new passwords do not match.");
    setBusy(true);
    try {
      await call("/admin/password", { method: "PUT", body: { currentPassword: form.current, newPassword: form.next } });
      notify("Password changed.");
      setForm({ current: "", next: "", again: "" });
    } catch (err) {
      setError(friendly(err));
    }
    setBusy(false);
  };

  return (
    <form className="ad-card ad-narrow" onSubmit={submit} noValidate>
      <h2>Change password</h2>
      <p className="ad-muted">Signed in as <strong>{username}</strong></p>
      <div className="field">
        <label htmlFor="pw-cur">Current password</label>
        <input id="pw-cur" type="password" autoComplete="current-password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="pw-new">New password</label>
        <input id="pw-new" type="password" autoComplete="new-password" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="pw-again">Repeat new password</label>
        <input id="pw-again" type="password" autoComplete="new-password" value={form.again} onChange={(e) => setForm({ ...form, again: e.target.value })} />
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn btn--gold" type="submit" disabled={busy}>{busy ? "Saving..." : "Change password"}</button>
    </form>
  );
}

/* ---------------- Dashboard shell ---------------- */
const TABS = [
  ["overview", "Overview", "📊"],
  ["mixes", "Mixes", "🎧"],
  ["events", "Events", "📅"],
  ["bookings", "Bookings", "📩"],
  ["settings", "Settings", "⚙️"],
];

function Dashboard({ username, token, onLogout, onAuthLost }) {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const notify = useCallback((message, type = "ok") => {
    setToast({ message, type });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const call = useCallback(
    async (path, opts = {}) => {
      try {
        return await api(path, { ...opts, token });
      } catch (err) {
        if (err.status === 401) onAuthLost();
        throw err;
      }
    },
    [token, onAuthLost]
  );

  const refreshStats = useCallback(() => call("/admin/stats").then(setStats).catch(() => {}), [call]);
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const ctx = { call, token, notify, onAuthLost, refreshStats };
  const current = TABS.find((t) => t[0] === tab);

  return (
    <div className="ad-shell">
      <aside className="ad-side">
        <div className="ad-brand">
          <span className="ad-brand-avatar"><DjAvatar /></span>
          <div>
            <strong>DJ GALANGA</strong>
            <small>Dashboard</small>
          </div>
        </div>
        <nav className="ad-nav">
          {TABS.map(([key, label, icon]) => (
            <button key={key} className={`ad-nav-item ${tab === key ? "ad-nav-item--active" : ""}`} onClick={() => setTab(key)}>
              <span>{icon}</span> {label}
              {key === "bookings" && stats && stats.newBookings > 0 && <em className="ad-badge">{stats.newBookings}</em>}
            </button>
          ))}
        </nav>
        <div className="ad-side-foot">
          <button className="ad-nav-item" onClick={() => (window.location.hash = "Home")}>🌐 View website</button>
          <button className="ad-nav-item" onClick={onLogout}>🚪 Log out</button>
        </div>
      </aside>

      <main className="ad-main">
        <header className="ad-head">
          <h1>{current[2]} {current[1]}</h1>
          <span className="ad-muted">Welcome, {username}</span>
        </header>
        {tab === "overview" && <Overview stats={stats} go={setTab} />}
        {tab === "mixes" && <MixesPanel ctx={ctx} />}
        {tab === "events" && <EventsPanel ctx={ctx} />}
        {tab === "bookings" && <BookingsPanel ctx={ctx} />}
        {tab === "settings" && <SettingsPanel ctx={ctx} username={username} />}
      </main>

      {toast && <div className={`ad-toast ${toast.type === "error" ? "ad-toast--error" : ""}`} role="status">{toast.message}</div>}
    </div>
  );
}

/* ---------------- Root ---------------- */
export default function Admin() {
  const [token, setTokenState] = useState(getToken());
  const [username, setUsername] = useState("");
  const [checking, setChecking] = useState(Boolean(getToken()));
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    api("/auth/me", { token })
      .then((d) => setUsername(d.username))
      .catch(() => {
        saveToken("");
        setTokenState("");
      })
      .finally(() => setChecking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLoggedIn = (t, u) => {
    saveToken(t);
    setTokenState(t);
    setUsername(u);
    setNotice("");
  };

  const onLogout = () => {
    saveToken("");
    setTokenState("");
    setUsername("");
    setNotice("");
  };

  const onAuthLost = useCallback(() => {
    saveToken("");
    setTokenState("");
    setNotice("Your session has ended. Please sign in again.");
  }, []);

  if (checking) return <div className="ad-login"><p className="ad-muted">Loading...</p></div>;
  if (!token) return <Login onLoggedIn={onLoggedIn} notice={notice} />;
  return <Dashboard username={username} token={token} onLogout={onLogout} onAuthLost={onAuthLost} />;
}