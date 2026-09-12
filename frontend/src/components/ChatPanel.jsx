import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { api } from "../utils/api";

const ChatPanel = () => {
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const token = window.localStorage.getItem("goodsly-token");

  useEffect(() => { api.conversations().then((result) => { setConversations(result.conversations || []); if (result.conversations?.[0]) setActive(result.conversations[0]); }).catch(() => {}); }, []);
  useEffect(() => {
    if (!active) return undefined;
    api.messages(active._id).then((result) => setMessages(result.messages || [])).catch(() => {});
    const socket = io(process.env.REACT_APP_SOCKET_URL || "http://localhost:8000", { auth: { token } });
    socket.emit("conversation:join", active._id);
    socket.on("message:new", (message) => { if (message.conversationId === active._id) setMessages((current) => [...current, message]); });
    return () => socket.disconnect();
  }, [active, token]);
  const send = async (event) => {
    event.preventDefault();
    if (!draft.trim() || !active) return;
    const result = await api.sendMessage(active._id, draft.trim());
    setMessages((current) => [...current, result.message]);
    setDraft("");
  };
  return <section className="dashboard-panel chat-panel"><p className="eyebrow">Buyer · seller</p><h2>Messages</h2>{!conversations.length ? <p className="empty-dashboard">Start a conversation from an order.</p> : <><select value={active?._id || ""} onChange={(event) => setActive(conversations.find((item) => item._id === event.target.value))}>{conversations.map((item) => <option key={item._id} value={item._id}>Conversation {item._id.slice(-6)}</option>)}</select><div className="chat-messages">{messages.map((message) => <p key={message._id}><strong>{message.senderId === JSON.parse(window.localStorage.getItem("goodsly-user") || "{}")._id ? "You" : "Them"}:</strong> {message.body}</p>)}</div><form onSubmit={send} className="chat-form"><input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength="2000" placeholder="Write a message…" /><button className="primary-button" type="submit">Send</button></form></>}</section>;
};
export default ChatPanel;
