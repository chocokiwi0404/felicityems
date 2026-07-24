// src/pages/organizer/EventFeedback.js
// Organizer views aggregated anonymous feedback for their events

import React, { useState, useEffect } from "react";
import axios from "axios";
import OrganizerNavBar from "../../components/OrganizerNavBar";

const API = "http://localhost:5000/api";

export default function EventFeedback() {
  const [events,    setEvents]    = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [feedback,  setFeedback]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [evLoading, setEvLoading] = useState(true);
  const [filter,    setFilter]    = useState(0); // 0 = all

  useEffect(() => {
    axios.get(`${API}/organizer/events`)
      .then(res => {
        const evs = (res.data.events || []).filter(e => ["Completed","Ongoing"].includes(e.status));
        setEvents(evs);
        if (evs.length) setSelected(evs[0]._id);
      })
      .finally(() => setEvLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true); setFeedback(null);
    const q = filter ? `?rating=${filter}` : "";
    axios.get(`${API}/feedback/event/${selected}${q}`)
      .then(res => setFeedback(res.data))
      .catch(() => setFeedback(null))
      .finally(() => setLoading(false));
  }, [selected, filter]);

  const avg = feedback?.average || 0;
  const total = feedback?.total || 0;
  const dist = feedback?.distribution || {};

  const StarDisplay = ({ rating, size = "1rem" }) => (
    <span style={{ fontSize: size }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} style={{ color: s <= rating ? "#fbbf24" : "#334155" }}>★</span>
      ))}
    </span>
  );

  return (
    <div style={s.page}>
      <OrganizerNavBar />
      <div style={s.wrap}>
        <h1 style={s.pageTitle}>Event Feedback</h1>
        <p style={s.pageSub}>Anonymous participant feedback for your events</p>

        {evLoading ? (
          <div style={s.center}><div style={s.spinner}/></div>
        ) : events.length === 0 ? (
          <div style={s.empty}>No completed or ongoing events yet.</div>
        ) : (
          <div style={s.layout}>
            {/* Event selector */}
            <div style={s.sidebar}>
              <div style={s.sideTitle}>Events</div>
              {events.map(e => (
                <div key={e._id}
                  style={{ ...s.eventItem, ...(selected===e._id ? s.eventItemOn : {}) }}
                  onClick={() => { setSelected(e._id); setFilter(0); }}>
                  {e.eventName}
                </div>
              ))}
            </div>

            {/* Feedback display */}
            <div style={s.main}>
              {loading ? (
                <div style={s.center}><div style={s.spinner}/></div>
              ) : !feedback ? (
                <div style={s.empty}>No feedback data.</div>
              ) : (
                <>
                  {/* Summary */}
                  <div style={s.summary}>
                    <div style={s.avgBlock}>
                      <div style={s.avgNum}>{avg}</div>
                      <StarDisplay rating={Math.round(avg)} size="1.5rem" />
                      <div style={s.totalLabel}>{total} response{total !== 1 ? "s" : ""}</div>
                    </div>

                    <div style={s.distBlock}>
                      {[5,4,3,2,1].map(star => {
                        const count = dist[star] || 0;
                        const pct   = total ? Math.round(count / total * 100) : 0;
                        return (
                          <div key={star} style={s.distRow}>
                            <span style={s.distStar}>{star} ★</span>
                            <div style={s.distTrack}>
                              <div style={{ ...s.distFill, width:`${pct}%`,
                                background: star >= 4 ? "#4ade80" : star === 3 ? "#fbbf24" : "#f87171"
                              }}/>
                            </div>
                            <span style={s.distCount}>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Filter by rating */}
                  <div style={s.filterRow}>
                    <span style={s.filterLabel}>Filter by rating:</span>
                    {[0,5,4,3,2,1].map(r => (
                      <button key={r}
                        style={{ ...s.filterBtn, ...(filter===r ? s.filterBtnOn : {}) }}
                        onClick={() => setFilter(r)}>
                        {r === 0 ? "All" : `${r} ★`}
                      </button>
                    ))}
                  </div>

                  {/* Comments */}
                  <div style={s.commentList}>
                    {(feedback.feedbacks || []).length === 0 ? (
                      <div style={s.empty}>No comments for this filter.</div>
                    ) : (
                      (feedback.feedbacks || []).map(f => (
                        <div key={f._id} style={s.commentCard}>
                          <div style={s.commentHeader}>
                            <StarDisplay rating={f.rating} />
                            <span style={s.commentDate}>
                              {new Date(f.createdAt).toLocaleDateString("en-IN")}
                            </span>
                          </div>
                          {f.comment ? (
                            <p style={s.commentText}>{f.comment}</p>
                          ) : (
                            <p style={s.commentEmpty}>No written comment.</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page:        { background:"#0f172a", minHeight:"100vh", width:"100vw", color:"#f1f5f9", fontFamily:"'DM Sans',system-ui,sans-serif" },
  wrap:        { maxWidth:1000, margin:"0 auto", padding:"2rem" },
  pageTitle:   { fontSize:"1.5rem", fontWeight:800, color:"#f8fafc", margin:0 },
  pageSub:     { color:"#64748b", fontSize:"0.875rem", margin:"0.25rem 0 1.5rem" },
  center:      { display:"flex", justifyContent:"center", padding:"3rem" },
  spinner:     { width:32, height:32, border:"3px solid #1e293b", borderTopColor:"#6366f1", borderRadius:"50%", animation:"spin 0.7s linear infinite" },
  empty:       { textAlign:"center", color:"#64748b", padding:"3rem" },
  layout:      { display:"grid", gridTemplateColumns:"220px 1fr", gap:"1.25rem", alignItems:"flex-start" },
  sidebar:     { background:"#1e293b", border:"1px solid #334155", borderRadius:12, padding:"1rem" },
  sideTitle:   { color:"#64748b", fontSize:"0.72rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"0.75rem" },
  eventItem:   { padding:"0.6rem 0.75rem", borderRadius:8, cursor:"pointer", color:"#94a3b8", fontSize:"0.85rem", marginBottom:"0.25rem", border:"1px solid transparent" },
  eventItemOn: { background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.3)", color:"#e2e8f0" },
  main:        { background:"#1e293b", border:"1px solid #334155", borderRadius:12, padding:"1.5rem" },
  summary:     { display:"flex", gap:"2rem", marginBottom:"1.5rem", alignItems:"center", flexWrap:"wrap" },
  avgBlock:    { textAlign:"center", padding:"1rem 1.5rem", background:"#0f172a", borderRadius:12, minWidth:120 },
  avgNum:      { fontSize:"3rem", fontWeight:900, color:"#fbbf24", lineHeight:1 },
  totalLabel:  { color:"#64748b", fontSize:"0.78rem", marginTop:"0.35rem" },
  distBlock:   { flex:1, display:"flex", flexDirection:"column", gap:"0.4rem" },
  distRow:     { display:"flex", alignItems:"center", gap:"0.5rem" },
  distStar:    { color:"#94a3b8", fontSize:"0.78rem", width:28, textAlign:"right", flexShrink:0 },
  distTrack:   { flex:1, height:10, background:"#0f172a", borderRadius:999, overflow:"hidden" },
  distFill:    { height:"100%", borderRadius:999, transition:"width 0.4s ease" },
  distCount:   { color:"#64748b", fontSize:"0.72rem", width:20, textAlign:"right" },
  filterRow:   { display:"flex", gap:"0.35rem", alignItems:"center", marginBottom:"1rem", flexWrap:"wrap" },
  filterLabel: { color:"#64748b", fontSize:"0.78rem" },
  filterBtn:   { padding:"0.3rem 0.75rem", background:"transparent", border:"1px solid #334155", borderRadius:999, color:"#64748b", cursor:"pointer", fontSize:"0.78rem" },
  filterBtnOn: { background:"rgba(251,191,36,0.12)", borderColor:"#fbbf24", color:"#fbbf24" },
  commentList: { display:"flex", flexDirection:"column", gap:"0.75rem" },
  commentCard: { background:"#0f172a", border:"1px solid #1e293b", borderRadius:8, padding:"1rem" },
  commentHeader:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.5rem" },
  commentDate: { color:"#475569", fontSize:"0.75rem" },
  commentText: { color:"#cbd5e1", fontSize:"0.875rem", margin:0, lineHeight:1.6 },
  commentEmpty:{ color:"#475569", fontSize:"0.82rem", fontStyle:"italic", margin:0 },
};