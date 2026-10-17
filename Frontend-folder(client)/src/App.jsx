import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { CategoryArt, DjAvatar } from "./Art";
import { DJ_PHONE, DJ_PHONE_LINK, DJ_EMAIL, SOCIALS } from "./links";

const DJ_NAME = "DJ GALANGA";
const TAGLINE = "Strictly African Music";
const API_URL = "http://localhost:5000/api";
const PAGE_SIZE = 6;
const TRENDING_LIMIT = 8;

const PAGES = ["Home", "Mixes", "Events", "Booking", "Contact"];
const CATEGORIES = [
  "All", "Ugandan", "Kikkade", "Kadongo Kamu", "Afrobeats", "Dancehall", "Reggae", "Amapiano", "Old School", "Gospel",
  "Hip Hop", "R&B", "Bongo Flava", "Rumba", "Genge", "Artist Mixes", "Pop", "House", "EDM", "Reggaeton",
  "Rock", "Jazz", "Slow Jams", "Country",
];
const FIRST_GROUP = 15; // genre blocks shown before "Show all genres"

const fmtTime = (s) => {
  if (!isFinite(s)) return "0:00";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
};
const fmtNum = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(".0", "")}k` : `${n}`);
const fmtDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function readStore(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

async function api(path, options) {
  const res = await fetch(API_URL + path, options);
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  if (!res.ok) throw new Error((data && data.error) || "Request failed");
  return data;
}

function Status({ loading, loadError }) {
  if (loading) return <p className="empty">Loading...</p>;
  if (loadError) return <p className="empty error">{loadError}</p>;
  return null;
}

/* ---------------- Mix row ---------------- */
function MixRow({ mix, rank, isCurrent, isPlaying, onPlay, onDownload }) {
  return (
    <article className={`mix ${isCurrent ? "mix--active" : ""}`}>
      {rank && <span className="mix-rank">{rank}</span>}
      <button className="cover" onClick={onPlay} aria-label={isCurrent && isPlaying ? "Pause" : "Play"}>
        <CategoryArt category={mix.category} />
        {isCurrent && isPlaying ? (
          <span className="bars"><i /><i /><i /><i /></span>
        ) : (
          <span className="cover-icon">▶</span>
        )}
      </button>
      <div className="mix-info">
        <h3>{mix.title}</h3>
        <p>
          <span className="tag">{mix.category}</span>
          {mix.length ? `${mix.length} · ` : ""}{fmtDate(mix.date)}
        </p>
      </div>
      <div className="mix-stats">
        <span title="Plays">▶ {fmtNum(mix.stats.plays)}</span>
        <span title="Downloads">⬇ {fmtNum(mix.stats.downloads)}</span>
      </div>
      <div className="mix-actions">
        <button className="btn btn--play" onClick={onPlay}>{isCurrent && isPlaying ? "Pause" : "Play"}</button>
        <button className="btn btn--download" onClick={onDownload}>Download</button>
      </div>
    </article>
  );
}

/* ---------------- Pages ---------------- */
function Home({ go, mixes, player, loading, loadError }) {
  const [showAll, setShowAll] = useState(false);
  const latest = mixes.slice().sort((a, b) => b.date.localeCompare(a.date));
  // Trending is chosen by the DJ in the dashboard: only mixes marked as trending, newest pick first.
  const trending = mixes
    .filter((m) => m.trending)
    .sort((a, b) => (b.trendingAt || "").localeCompare(a.trendingAt || ""))
    .slice(0, TRENDING_LIMIT);
  const featured = latest[0];
  const featuredPlaying = Boolean(featured && player.current?.id === featured.id && player.playing);
  const totalPlays = mixes.reduce((s, m) => s + m.stats.plays, 0);
  const totalDownloads = mixes.reduce((s, m) => s + m.stats.downloads, 0);

  const genres = CATEGORIES.slice(1);
  const firstGenres = genres.slice(0, FIRST_GROUP);
  const moreGenres = showAll ? genres.slice(FIRST_GROUP) : [];
  const youtube = SOCIALS.find((s) => s.name === "YouTube" && s.url);

  const genreBlock = (c) => (
    <button key={c} className="cat-card" onClick={() => go("Mixes", { category: c })}>
      <CategoryArt category={c} />
      <div className="cat-text">
        <strong>{c}</strong>
        <span>{mixes.filter((m) => m.category === c).length} mixes</span>
      </div>
    </button>
  );

  const row = (m, i) => (
    <MixRow
      key={m.id}
      mix={m}
      rank={i !== undefined ? i + 1 : null}
      isCurrent={player.current?.id === m.id}
      isPlaying={player.playing}
      onPlay={() => player.play(m, i !== undefined ? trending : latest)}
      onDownload={() => player.download(m)}
    />
  );

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow">Local But Global DJ · Kampala, Uganda</p>
          <h1>{DJ_NAME}</h1>
          <p className="hero-sub">
            {TAGLINE}. Stream the latest nonstop mixes, download them free, and book me for your next event.
          </p>
          <div className="hero-genres">
            {CATEGORIES.slice(1, 8).map((c) => (
              <button key={c} className="genre-pill" onClick={() => go("Mixes", { category: c })}>{c}</button>
            ))}
          </div>
          <div className="hero-actions">
            <button className="btn btn--gold" onClick={() => (featured ? player.play(featured, latest) : go("Mixes"))}>
              {featured ? "▶ Play Latest Mix" : "Browse Mixes"}
            </button>
            <button className="btn btn--outline" onClick={() => go("Booking")}>Book Me</button>
          </div>
          {mixes.length > 0 ? (
            <div className="stats">
              <div><strong>{mixes.length}</strong><span>Mixes</span></div>
              <div><strong>{fmtNum(totalPlays)}</strong><span>Plays</span></div>
              <div><strong>{fmtNum(totalDownloads)}</strong><span>Downloads</span></div>
            </div>
          ) : (
            <p className="hero-soon">New mixes are dropping soon. Check back shortly.</p>
          )}
        </div>

        <div className="hero-visual">
          <div className="hero-photo" role="img" aria-label={`${DJ_NAME} behind the decks`}>
            <span className="hero-live"><i />Open for bookings</span>
            <div className="hero-now">
              {featured ? (
                <>
                  <button
                    className="hero-now-play"
                    onClick={() => player.play(featured, latest)}
                    aria-label={featuredPlaying ? "Pause latest mix" : "Play latest mix"}
                  >
                    {featuredPlaying ? "⏸" : "▶"}
                  </button>
                  <div className="hero-now-info">
                    <small>Latest mix</small>
                    <strong>{featured.title}</strong>
                    <span>{featured.category}{featured.length ? ` · ${featured.length}` : ""}</span>
                  </div>
                  <span className={`hero-eq ${featuredPlaying ? "hero-eq--on" : ""}`} aria-hidden="true">
                    <i /><i /><i /><i />
                  </span>
                </>
              ) : (
                <>
                  <span className="hero-now-icon">♪</span>
                  <div className="hero-now-info">
                    <small>Coming soon</small>
                    <strong>Fresh mixes on the way</strong>
                    <span>Check back for the next drop</span>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="hero-chip hero-chip--top">🎧 {TAGLINE}</div>
          <div className="hero-chip hero-chip--side">📍 Kampala, Uganda</div>
        </div>
      </section>

      <section className="block">
        <div className="block-head">
          <h2>Browse by category</h2>
        </div>
        <div className="cat-grid">
          {firstGenres.map(genreBlock)}
          {youtube && (
            <a className="cat-card" href={youtube.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
              <CategoryArt category="Videos" />
              <div className="cat-text">
                <strong>Videos</strong>
                <span>Watch on YouTube</span>
              </div>
            </a>
          )}
          {moreGenres.map(genreBlock)}
        </div>
        {genres.length > FIRST_GROUP && (
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <button className="btn btn--outline" onClick={() => setShowAll(!showAll)}>
              {showAll ? "Show fewer genres" : `Show all genres (${genres.length - FIRST_GROUP} more)`}
            </button>
          </div>
        )}
      </section>

      <section className="block two-col">
        <div>
          <div className="block-head">
            <h2>Latest mixes</h2>
            <button className="link" onClick={() => go("Mixes")}>View all →</button>
          </div>
          <Status loading={loading} loadError={loadError} />
          {!loading && !loadError && mixes.length === 0 && <p className="empty">No mixes uploaded yet. Check back soon.</p>}
          <div className="list">{latest.slice(0, 5).map((m) => row(m))}</div>
        </div>
        <aside>
          <div className="block-head"><h2>Trending now</h2></div>
          {!loading && !loadError && trending.length === 0 && (
            <p className="empty">Nothing trending right now. Check back soon.</p>
          )}
          <div className="list">{trending.map((m, i) => row(m, i))}</div>
        </aside>
      </section>
    </>
  );
}

function Mixes({ mixes, player, query, setQuery, initialCategory, loading, loadError }) {
  const [category, setCategory] = useState(initialCategory || "All");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [query, category, sort]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = mixes.filter(
      (m) =>
        (category === "All" || m.category === category) &&
        (!q || m.title.toLowerCase().includes(q) || m.category.toLowerCase().includes(q))
    );
    list = list.slice().sort((a, b) => {
      if (sort === "plays") return b.stats.plays - a.stats.plays;
      if (sort === "downloads") return b.stats.downloads - a.stats.downloads;
      return b.date.localeCompare(a.date);
    });
    return list;
  }, [mixes, query, category, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <section className="block">
      <div className="block-head"><h2>All mixes</h2></div>

      <div className="toolbar">
        <input
          className="search search--wide"
          placeholder="Search mixes or categories..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort mixes">
          <option value="newest">Newest first</option>
          <option value="plays">Most played</option>
          <option value="downloads">Most downloaded</option>
        </select>
      </div>

      <div className="chips">
        {CATEGORIES.map((c) => (
          <button key={c} className={`chip ${category === c ? "chip--active" : ""}`} onClick={() => setCategory(c)}>{c}</button>
        ))}
      </div>

      <Status loading={loading} loadError={loadError} />
      {!loading && !loadError && (
        <p className="result-count">{filtered.length} {filtered.length === 1 ? "mix" : "mixes"} found</p>
      )}

      <div className="list">
        {!loading && !loadError && visible.length === 0 && (
          <p className="empty">
            {mixes.length === 0 ? "No mixes uploaded yet. Check back soon." : "No mixes match your search. Try another word or category."}
          </p>
        )}
        {visible.map((m) => (
          <MixRow
            key={m.id}
            mix={m}
            isCurrent={player.current?.id === m.id}
            isPlaying={player.playing}
            onPlay={() => player.play(m, filtered)}
            onDownload={() => player.download(m)}
          />
        ))}
      </div>

      {pages > 1 && (
        <div className="pager">
          <button className="btn btn--outline" disabled={page === 1} onClick={() => setPage(page - 1)}>← Previous</button>
          <span>Page {page} of {pages}</span>
          <button className="btn btn--outline" disabled={page === pages} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      )}
    </section>
  );
}

function Events({ events, loading, loadError }) {
  const [filter, setFilter] = useState("All");
  const [reminders, setReminders] = useState(() => readStore("dg_reminders", {}));
  const types = ["All", "Club", "Festival", "Private"];
  const list = events.filter((e) => filter === "All" || e.type === filter);

  const toggle = (id) => {
    const next = { ...reminders, [id]: !reminders[id] };
    setReminders(next);
    writeStore("dg_reminders", next);
  };

  return (
    <section className="block">
      <div className="block-head"><h2>Upcoming events</h2></div>
      <div className="chips">
        {types.map((t) => (
          <button key={t} className={`chip ${filter === t ? "chip--active" : ""}`} onClick={() => setFilter(t)}>{t}</button>
        ))}
      </div>
      <Status loading={loading} loadError={loadError} />
      {!loading && !loadError && list.length === 0 && <p className="empty">No upcoming events right now. Check back soon.</p>}
      <div className="list">
        {list.map((e) => {
          const d = new Date(e.date + "T00:00:00");
          return (
            <article className="event" key={e.id}>
              <div className="event-date">
                <strong>{d.getDate()}</strong>
                <span>{d.toLocaleString("en-GB", { month: "short" })}</span>
              </div>
              <div className="mix-info">
                <h3>{e.venue}</h3>
                <p><span className="tag">{e.type}</span>{e.city} · {fmtDate(e.date)}</p>
              </div>
              <strong className="event-price">{e.price || "TBA"}</strong>
              <button className={`btn ${reminders[e.id] ? "btn--done" : "btn--gold"}`} onClick={() => toggle(e.id)}>
                {reminders[e.id] ? "Reminder set ✓" : "Remind me"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const EMPTY_FORM = { name: "", email: "", phone: "", date: "", type: "Wedding", guests: "", message: "" };

function Booking() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [serverError, setServerError] = useState("");
  const [saved, setSaved] = useState(() => readStore("dg_bookings", []));
  const today = new Date().toISOString().split("T")[0];

  const change = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((er) => ({ ...er, [name]: "" }));
  };

  const validate = () => {
    const er = {};
    if (form.name.trim().length < 2) er.name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) er.email = "Enter a valid email address.";
    if (!/^\+?[0-9\s-]{9,15}$/.test(form.phone)) er.phone = "Enter a valid phone number.";
    if (!form.date) er.date = "Choose an event date.";
    else if (form.date < today) er.date = "The date must be in the future.";
    if (form.guests && Number(form.guests) < 1) er.guests = "Guests must be at least 1.";
    if (form.message.trim().length < 10) er.message = "Tell me a little more (at least 10 characters).";
    return er;
  };

  const submit = async (e) => {
    e.preventDefault();
    const er = validate();
    setErrors(er);
    if (Object.keys(er).length) return;
    setStatus("sending");
    setServerError("");
    try {
      await api("/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const booking = { ...form, id: Date.now(), createdAt: new Date().toISOString() };
      const updated = [booking, ...saved].slice(0, 20);
      setSaved(updated);
      writeStore("dg_bookings", updated);
      setForm(EMPTY_FORM);
      setStatus("success");
    } catch (err) {
      setServerError(err.message === "Failed to fetch" ? "Cannot reach the server. Please try again later." : err.message);
      setStatus("error");
    }
  };

  return (
    <section className="block block--narrow">
      <div className="block-head"><h2>Book {DJ_NAME}</h2></div>
      <p className="muted">Weddings, club nights, corporate events and private parties.</p>
      <form className="form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input id="name" name="name" value={form.name} onChange={change} />
          {errors.name && <span className="error">{errors.name}</span>}
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" value={form.email} onChange={change} />
          {errors.email && <span className="error">{errors.email}</span>}
        </div>
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input id="phone" name="phone" value={form.phone} onChange={change} placeholder="+256 7XX XXX XXX" />
          {errors.phone && <span className="error">{errors.phone}</span>}
        </div>
        <div className="field">
          <label htmlFor="date">Event date</label>
          <input id="date" name="date" type="date" min={today} value={form.date} onChange={change} />
          {errors.date && <span className="error">{errors.date}</span>}
        </div>
        <div className="field">
          <label htmlFor="type">Event type</label>
          <select id="type" name="type" value={form.type} onChange={change}>
            <option>Wedding</option>
            <option>Club night</option>
            <option>Corporate</option>
            <option>Birthday</option>
            <option>Other</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="guests">Expected guests</label>
          <input id="guests" name="guests" type="number" min="1" value={form.guests} onChange={change} />
          {errors.guests && <span className="error">{errors.guests}</span>}
        </div>
        <div className="field field--full">
          <label htmlFor="message">Event details</label>
          <textarea id="message" name="message" rows="5" value={form.message} onChange={change} />
          {errors.message && <span className="error">{errors.message}</span>}
        </div>
        <div className="field field--full">
          <button className="btn btn--gold btn--wide" type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Sending..." : "Send Booking Request"}
          </button>
          {status === "success" && <p className="success">Request sent. I will reply within 24 hours.</p>}
          {status === "error" && <p className="error">{serverError || "Something went wrong. Please try again."}</p>}
        </div>
      </form>

      {saved.length > 0 && (
        <div className="history">
          <h3>Your recent requests</h3>
          <ul>
            {saved.slice(0, 3).map((b) => (
              <li key={b.id}>
                <strong>{b.type}</strong> on {fmtDate(b.date)}
                <span className="muted"> · sent {new Date(b.createdAt).toLocaleDateString("en-GB")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Contact() {
  const socials = SOCIALS.filter((s) => s.url);
  return (
    <section className="block block--narrow">
      <div className="block-head"><h2>About {DJ_NAME}</h2></div>
      <p className="about">
        {DJ_NAME} is a Kampala based DJ and music promoter who plays strictly African music, mostly Ugandan.
        From club nights to weddings and festivals, every set is built to keep the dance floor full.
        Download the mixes for free and share them with your friends.
      </p>
      <div className="contact-grid">
        {DJ_EMAIL && (
          <div className="contact-card">
            <span>Email</span>
            <strong><a href={`mailto:${DJ_EMAIL}`}>{DJ_EMAIL}</a></strong>
          </div>
        )}
        <div className="contact-card">
          <span>Phone / WhatsApp</span>
          <strong><a href={DJ_PHONE_LINK}>{DJ_PHONE}</a></strong>
        </div>
        <div className="contact-card"><span>Location</span><strong>Kampala, Uganda</strong></div>
      </div>
      <div className="socials">
        {socials.map((s) => (
          <a key={s.name} href={s.url} target="_blank" rel="noreferrer" className="social">{s.name}</a>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Bottom player ---------------- */
function PlayerBar({ player }) {
  const { current, playing, time, duration, volume, shuffle, repeat } = player;
  if (!current) return null;
  const progress = duration ? (time / duration) * 100 : 0;
  return (
    <div className="playerbar">
      <div className="pb-track">
        <div className="pb-cover"><CategoryArt category={current.category} /></div>
        <div className="pb-meta">
          <strong>{current.title}</strong>
          <span>{DJ_NAME} · {current.category}</span>
        </div>
      </div>
      <div className="pb-center">
        <div className="pb-buttons">
          <button className={`icon ${shuffle ? "icon--on" : ""}`} onClick={player.toggleShuffle} aria-label="Shuffle" title="Shuffle">🔀</button>
          <button className="icon" onClick={player.prev} aria-label="Previous">⏮</button>
          <button className="icon icon--main" onClick={player.toggle} aria-label={playing ? "Pause" : "Play"}>{playing ? "⏸" : "▶"}</button>
          <button className="icon" onClick={player.next} aria-label="Next">⏭</button>
          <button className={`icon ${repeat !== "off" ? "icon--on" : ""}`} onClick={player.cycleRepeat} aria-label="Repeat" title={`Repeat: ${repeat}`}>
            {repeat === "one" ? "🔂" : "🔁"}
          </button>
        </div>
        <div className="pb-seek">
          <span>{fmtTime(time)}</span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={time}
            onChange={(e) => player.seek(Number(e.target.value))}
            style={{ "--progress": `${progress}%` }}
            aria-label="Seek"
          />
          <span>{fmtTime(duration)}</span>
        </div>
      </div>
      <div className="pb-right">
        <button className="icon" onClick={() => player.download(current)} aria-label="Download" title="Download">⬇</button>
        <label className="volume">
          🔊
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => player.setVolume(Number(e.target.value))}
            aria-label="Volume"
            style={{ "--progress": `${volume * 100}%` }}
          />
        </label>
      </div>
    </div>
  );
}

/* ---------------- App ---------------- */
export default function App() {
  const audioRef = useRef(null);
  const toastTimer = useRef(null);

  const [page, setPage] = useState(() => {
    const h = window.location.hash.replace("#", "");
    return PAGES.includes(h) ? h : "Home";
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mixesCategory, setMixesCategory] = useState("All");

  const [mixes, setMixes] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState("off");
  const [toast, setToast] = useState("");

  const mixesWithStats = useMemo(
    () => mixes.map((m) => ({ ...m, stats: { plays: m.plays, downloads: m.downloads } })),
    [mixes]
  );

  useEffect(() => {
    Promise.all([api("/mixes"), api("/events")])
      .then(([m, e]) => {
        setMixes(m);
        setEvents(e);
        setLoadError("");
      })
      .catch(() =>
        setLoadError("Could not reach the server. Make sure the backend is running (node server.js), then refresh the page.")
      )
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  };

  const bump = (id, field) => {
    setMixes((list) => list.map((m) => (m.id === id ? { ...m, [field]: m[field] + 1 } : m)));
  };

  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.replace("#", "");
      if (PAGES.includes(h)) setPage(h);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

  const go = (name, opts = {}) => {
    setMenuOpen(false);
    if (opts.category) setMixesCategory(opts.category);
    else if (name === "Mixes") setMixesCategory("All");
    window.location.hash = name;
    setPage(name);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startTrack = (mix) => {
    const a = audioRef.current;
    setCurrent(mix);
    setTime(0);
    setDuration(0);
    a.src = mix.src;
    a.play()
      .then(() => {
        setPlaying(true);
        bump(mix.id, "plays");
        fetch(`${API_URL}/mixes/${mix.id}/play`, { method: "POST" }).catch(() => {});
      })
      .catch(() => {
        setPlaying(false);
        showToast("Could not play this mix. Check the server and your connection.");
      });
  };

  const toggle = () => {
    const a = audioRef.current;
    if (!current) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().then(() => setPlaying(true)).catch(() => showToast("Could not play this mix."));
    }
  };

  const play = (mix, list) => {
    if (current?.id === mix.id) {
      toggle();
      return;
    }
    setQueue(list && list.length ? list : mixesWithStats);
    startTrack(mix);
  };

  const step = (dir) => {
    const list = queue.length ? queue : mixesWithStats;
    if (!list.length) return;
    const i = list.findIndex((m) => m.id === current?.id);
    let nextIndex;
    if (shuffle && list.length > 1) {
      do {
        nextIndex = Math.floor(Math.random() * list.length);
      } while (nextIndex === i);
    } else {
      nextIndex = (i + dir + list.length) % list.length;
    }
    startTrack(list[nextIndex]);
  };

  const next = () => current && step(1);
  const prev = () => {
    if (!current) return;
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    step(-1);
  };

  const onEnded = () => {
    if (repeat === "one") {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      return;
    }
    const list = queue.length ? queue : mixesWithStats;
    const isLast = list[list.length - 1]?.id === current?.id;
    if (isLast && repeat === "off" && !shuffle) {
      setPlaying(false);
      return;
    }
    step(1);
  };

  const cycleRepeat = () => setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"));

  const seek = (t) => {
    audioRef.current.currentTime = t;
    setTime(t);
  };

  const download = (mix) => {
    showToast(`Downloading "${mix.title}"...`);
    const link = document.createElement("a");
    link.href = `${API_URL}/mixes/${mix.id}/download`;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    bump(mix.id, "downloads");
  };

  const player = {
    current, playing, time, duration, volume, shuffle, repeat,
    play, toggle, next, prev, seek, download, cycleRepeat,
    setVolume: setVolumeState,
    toggleShuffle: () => setShuffle((s) => !s),
  };

  const submitSearch = (e) => {
    e.preventDefault();
    go("Mixes");
  };

  return (
    <div className={`app ${current ? "app--player" : ""}`}>
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={(e) => setTime(e.target.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onEnded={onEnded}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onError={() => current && showToast("This mix failed to load.")}
      />

      <header className="topbar">
        <button className="logo" onClick={() => go("Home")}>
          <span className="logo-mark">♪</span>
          <span>{DJ_NAME}</span>
        </button>
        <form className="search-form" onSubmit={submitSearch}>
          <input className="search" placeholder="Search mixes..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search mixes" />
        </form>
        <nav className={`nav ${menuOpen ? "nav--open" : ""}`}>
          {PAGES.map((p) => (
            <button key={p} className={`nav-link ${page === p ? "nav-link--active" : ""}`} onClick={() => go(p)}>{p}</button>
          ))}
        </nav>
        <button className={`burger ${menuOpen ? "burger--open" : ""}`} onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          <span /><span /><span />
        </button>
        <button className="dj-icon" onClick={() => go("Contact")} aria-label={`About ${DJ_NAME}`} title={DJ_NAME}>
          <DjAvatar />
        </button>
      </header>

      <main className="main">
        {page === "Home" && (
          <Home go={go} mixes={mixesWithStats} player={player} loading={loading} loadError={loadError} />
        )}
        {page === "Mixes" && (
          <Mixes
            key={mixesCategory}
            mixes={mixesWithStats}
            player={player}
            query={query}
            setQuery={setQuery}
            initialCategory={mixesCategory}
            loading={loading}
            loadError={loadError}
          />
        )}
        {page === "Events" && <Events events={events} loading={loading} loadError={loadError} />}
        {page === "Booking" && <Booking />}
        {page === "Contact" && <Contact />}
      </main>

      <footer className="footer">
        <strong>{DJ_NAME}</strong>
        <span>{TAGLINE} · Kampala, Uganda</span>
        <small>© {new Date().getFullYear()} {DJ_NAME}. All rights reserved.</small>
      </footer>

      <PlayerBar player={player} />
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}