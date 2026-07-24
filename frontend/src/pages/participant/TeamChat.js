import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import ParticipantNavbar from "../../components/ParticipantNavBar";

const API = "http://localhost:5000/api";
const POLL_INTERVAL = 2000; // 2 seconds

export default function TeamChat() {
  const { teamId } = useParams();
  const { user, loading: authLoading } = useAuth();

  const [team, setTeam] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const lastMsgTime = useRef(null); // ISO string of newest message we have

  useEffect(() => {
    if (authLoading) return;
    axios.get(`${API}/teams/${teamId}`)
      .then(res => setTeam(res.data.team))
      .catch(() => setError("Team not found or you're not a member."))
      .finally(() => setLoading(false));
  }, [teamId, authLoading]);

  useEffect(() => {
    if (authLoading) return;
    axios.get(`${API}/chat/${teamId}/messages`)
      .then(res => {
        const msgs = res.data.messages || [];
        setMessages(msgs);
        if (msgs.length) lastMsgTime.current = msgs[msgs.length - 1].createdAt;
      })
      .catch(() => { });
  }, [teamId, authLoading]);

  // Polling for new messages
  const poll = useCallback(async () => {
    try {
      const since = lastMsgTime.current
        ? `?since=${encodeURIComponent(lastMsgTime.current)}`
        : "";
      const res = await axios.get(`${API}/chat/${teamId}/messages${since}`);
      const newMsgs = res.data.messages || [];
      if (newMsgs.length) {
        setMessages(prev => {
          // Avoid duplicates
          const existingIds = new Set(prev.map(m => m._id));
          const fresh = newMsgs.filter(m => !existingIds.has(m._id));
          if (!fresh.length) return prev;
          lastMsgTime.current = fresh[fresh.length - 1].createdAt;
          return [...prev, ...fresh];
        });
      }
    } catch { }
  }, [teamId]);

  useEffect(() => {
    pollRef.current = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [poll]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content) return;
    setSending(true);
    const optimistic = {
      _id: "tmp-" + Date.now(),
      sender: { _id: user?._id, firstName: user?.firstName, lastName: user?.lastName },
      content,
      createdAt: new Date().toISOString(),
      _optimistic: true,
    };
    setMessages(prev => [...prev, optimistic]);
    setInput("");
    try {
      const res = await axios.post(`${API}/chat/${teamId}/messages`, { content });
      const saved = res.data.message;
      setMessages(prev => prev.map(m => m._id === optimistic._id ? saved : m));
      lastMsgTime.current = saved.createdAt;
    } catch {
      // Remove optimistic on failure
      setMessages(prev => prev.filter(m => m._id !== optimistic._id));
      setInput(content); // restore
    } finally { setSending(false); }
  };

  const handleDelete = async (msgId) => {
    try {
      await axios.delete(`${API}/chat/${teamId}/messages/${msgId}`);
      setMessages(prev => prev.filter(m => m._id !== msgId));
    } catch { }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const isMe = (msg) => msg.sender?._id === user?._id;

  const fmt = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + " " +
      d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  const groupDate = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Today";
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "long" });
  };

  if (loading) return (
    <div style={s.page}><ParticipantNavbar />
      <div style={s.center}><div style={s.spinner} /></div>
    </div>
  );
  if (error) return (
    <div style={s.page}><ParticipantNavbar />
      <div style={s.wrap}><p style={{ color: "#f87171" }}>{error}</p></div>
    </div>
  );

  // Group messages by date
  const grouped = [];
  let lastDate = null;
  messages.forEach(msg => {
    const date = new Date(msg.createdAt).toDateString();
    if (date !== lastDate) { grouped.push({ type: "date", label: groupDate(msg.createdAt) }); lastDate = date; }
    grouped.push({ type: "msg", msg });
  });

  return (
    <div style={s.page}>
      <ParticipantNavbar />
      <div style={s.wrap}>
        <div style={s.header}>
          <div>
            <Link to="/participant/teams" style={s.back}>← Back to Teams</Link>
            <h1 style={s.title}>{team?.teamName} — Chat</h1>
            <p style={s.sub}>{team?.event?.eventName}</p>
          </div>
          <div style={s.memberPills}>
            {team?.members?.filter(m => m.status === "Accepted").map((m, i) => (
              <div key={i} style={s.memberPill} title={m.user?.email}>
                {m.user?.firstName?.[0]?.toUpperCase()}
              </div>
            ))}
            <span style={s.memberCount}>
              {team?.members?.filter(m => m.status === "Accepted").length} members
            </span>
          </div>
        </div>

        <div style={s.chatBox}>
          {/* Messages */}
          <div style={s.msgArea}>
            {messages.length === 0 && (
              <div style={s.emptyChat}>No messages yet — say hello to your team! 👋</div>
            )}
            {grouped.map((item, i) => {
              if (item.type === "date") return (
                <div key={`date-${i}`} style={s.dateLabel}>{item.label}</div>
              );
              const msg = item.msg;
              const me = isMe(msg);
              const name = msg.sender
                ? `${msg.sender.firstName || ""} ${msg.sender.lastName || ""}`.trim()
                : "Unknown";
              const prevItem = grouped[i - 1];
              const showName = !me && (
                !prevItem ||
                prevItem.type === "date" ||
                prevItem.msg?.sender?._id !== msg.sender?._id
              );

              return (
                <div key={msg._id} style={{ ...s.msgWrap, ...(me ? s.msgWrapMe : {}) }}>
                  {!me && (
                    <div style={s.avatar} title={name}>{name[0]?.toUpperCase()}</div>
                  )}
                  <div style={{ maxWidth: "68%" }}>
                    {showName && <div style={s.senderName}>{name}</div>}
                    <div style={{ ...s.bubble, ...(me ? s.bubbleMe : s.bubbleThem), ...(msg._optimistic ? { opacity: 0.6 } : {}) }}>
                      {msg.fileUrl && (
                        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" style={s.fileLink}>
                          📎 Shared link
                        </a>
                      )}
                      {msg.content && <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>}
                    </div>
                    <div style={{ ...s.msgMeta, ...(me ? s.msgMetaMe : {}) }}>
                      <span style={s.msgTime}>{fmt(msg.createdAt)}</span>
                      {me && !msg._optimistic && (
                        <button style={s.deleteBtn} onClick={() => handleDelete(msg._id)} title="Delete">×</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={s.inputBar}>
            <textarea
              style={s.textarea}
              placeholder="Type a message… (Enter to send)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button
              style={{ ...s.sendBtn, ...((!input.trim() || sending) ? s.sendOff : {}) }}
              onClick={handleSend}
              disabled={!input.trim() || sending}
            >
              {sending ? "…" : "➤"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { background: "#0f172a", minHeight: "100vh", width: "100vw", color: "#f1f5f9", fontFamily: "'DM Sans',system-ui,sans-serif" },
  wrap: { maxWidth: 800, margin: "0 auto", padding: "1.5rem", height: "calc(100vh - 64px)", display: "flex", flexDirection: "column" },
  center: { display: "flex", justifyContent: "center", padding: "4rem" },
  spinner: { width: 32, height: 32, border: "3px solid #1e293b", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" },
  back: { color: "#64748b", textDecoration: "none", fontSize: "0.78rem", display: "block", marginBottom: "0.3rem" },
  title: { fontSize: "1.2rem", fontWeight: 800, color: "#f8fafc", margin: 0 },
  sub: { color: "#64748b", fontSize: "0.82rem", margin: "0.2rem 0 0" },
  memberPills: { display: "flex", alignItems: "center", gap: "0.35rem" },
  memberPill: { width: 28, height: 28, borderRadius: "50%", background: "rgba(99,102,241,0.2)", color: "#818cf8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.75rem", cursor: "default" },
  memberCount: { color: "#64748b", fontSize: "0.75rem" },
  chatBox: { flex: 1, display: "flex", flexDirection: "column", background: "#1e293b", border: "1px solid #334155", borderRadius: 12, overflow: "hidden" },
  msgArea: { flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.1rem" },
  emptyChat: { textAlign: "center", color: "#475569", padding: "3rem", fontSize: "0.875rem" },
  dateLabel: { textAlign: "center", color: "#475569", fontSize: "0.72rem", margin: "0.75rem 0", position: "relative" },
  msgWrap: { display: "flex", alignItems: "flex-end", gap: "0.5rem", marginBottom: "0.15rem" },
  msgWrapMe: { flexDirection: "row-reverse" },
  avatar: { width: 28, height: 28, borderRadius: "50%", background: "rgba(99,102,241,0.2)", color: "#818cf8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.72rem", flexShrink: 0, marginBottom: 18 },
  senderName: { color: "#64748b", fontSize: "0.7rem", marginBottom: "0.15rem", paddingLeft: 2 },
  bubble: { padding: "0.55rem 0.85rem", borderRadius: 12, fontSize: "0.875rem", lineHeight: 1.55, wordBreak: "break-word" },
  bubbleThem: { background: "#0f172a", color: "#e2e8f0", borderBottomLeftRadius: 3 },
  bubbleMe: { background: "#6366f1", color: "#fff", borderBottomRightRadius: 3 },
  msgMeta: { display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.15rem", paddingLeft: 2 },
  msgMetaMe: { flexDirection: "row-reverse", paddingRight: 2, paddingLeft: 0 },
  msgTime: { color: "#475569", fontSize: "0.67rem" },
  deleteBtn: { background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: "0.8rem", padding: "0 2px", lineHeight: 1, opacity: 0.6 },
  fileLink: { color: "#93c5fd", textDecoration: "underline", display: "block", marginBottom: 4, fontSize: "0.82rem" },
  inputBar: { borderTop: "1px solid #334155", padding: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "flex-end" },
  textarea: { flex: 1, background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", padding: "0.6rem 0.85rem", fontSize: "0.875rem", fontFamily: "'DM Sans',sans-serif", resize: "none", outline: "none", lineHeight: 1.5, maxHeight: 120, overflowY: "auto" },
  sendBtn: { padding: "0.6rem 1rem", background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "1rem", flexShrink: 0 },
  sendOff: { opacity: 0.35, cursor: "not-allowed" },
};