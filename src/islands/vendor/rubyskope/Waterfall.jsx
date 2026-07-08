// source: rubyskope@f69c304 app/javascript/islands/Waterfall.jsx (verbatim — do not hand-edit, resync from source instead)
import React, { useEffect, useState } from "react";
import { NODE_COLORS, NODE_LABELS, colorFor } from "./nodeColors";
import Connector from "./Connector";

function fmtTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

export default function Waterfall({ events: initialEvents, dataUrl, userId, onOpenEvent }) {
  const [events, setEvents] = useState(initialEvents || []);
  const [loading, setLoading] = useState(!initialEvents && !!dataUrl);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialEvents || !dataUrl) return;
    let cancelled = false;
    setLoading(true);
    fetch(dataUrl, { credentials: "same-origin", headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (cancelled) return;
        setEvents(Array.isArray(data?.events) ? data.events : []);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [dataUrl, initialEvents]);

  const filtered = events || [];

  if (loading) {
    return <div className="rs-wf rs-wf--loading">Loading waterfall…</div>;
  }
  if (error) {
    return <div className="rs-wf rs-wf--error">Failed to load timeline: {error}</div>;
  }
  if (!filtered.length) {
    return (
      <div className="rs-wf rs-wf--empty">
        <p>No tagged events in this range.</p>
      </div>
    );
  }

  return (
    <div className="rs-wf">
      <div className="rs-wf__rail" aria-hidden="true" />
      <ol className="rs-wf__list">
        {filtered.map((ev) => (
          <WaterfallRow key={ev.id} event={ev} onOpenEvent={onOpenEvent} userId={userId} />
        ))}
      </ol>
      <WaterfallLegend />
    </div>
  );
}

function WaterfallRow({ event, onOpenEvent, userId }) {
  const color = colorFor(event.node_kind);
  const handleClick = () => {
    if (typeof onOpenEvent === "function") return onOpenEvent(event);
    if (window.Rubyskope?.openModal) window.Rubyskope.openModal(`/rubyskope/events/${event.id}`);
  };
  return (
    <li className="rs-wf__row" data-node-kind={event.node_kind}>
      <button
        type="button"
        className="rs-wf__node"
        style={{ background: color, borderColor: color }}
        aria-label={`Open event ${event.title}`}
        onClick={handleClick}
      />
      <Connector color={color} />
      <button
        type="button"
        className="rs-wf__card"
        style={{ borderLeftColor: color }}
        onClick={handleClick}
      >
        <div className="rs-wf__card-head">
          <span className="rs-wf__kind" style={{ color }}>{NODE_LABELS[event.node_kind] || event.node_kind}</span>
          <time className="rs-wf__time">{fmtTime(event.occurred_at)}</time>
        </div>
        <div className="rs-wf__title">{event.title}</div>
        {event.path && (
          <div className="rs-wf__meta">
            {event.http_method && <span className="rs-wf__method">{event.http_method.toUpperCase()}</span>}
            <span className="rs-wf__path">{event.path}</span>
            {event.response_status && <span className="rs-wf__status">{event.response_status}</span>}
          </div>
        )}
      </button>
    </li>
  );
}

function WaterfallLegend() {
  return (
    <div className="rs-wf__legend">
      {Object.entries(NODE_COLORS).map(([kind, color]) => (
        <span key={kind} className="rs-wf__legend-item">
          <span className="rs-wf__legend-dot" style={{ background: color }} />
          {NODE_LABELS[kind] || kind}
        </span>
      ))}
    </div>
  );
}
