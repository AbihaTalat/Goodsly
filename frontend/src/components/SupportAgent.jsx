import React, { useState } from "react";
import { FiMessageCircle, FiSend, FiX } from "react-icons/fi";
import { api } from "../utils/api";

const MAX_MESSAGE_LENGTH = 2000;
const greeting = {
  role: "model",
  text: "Hi! I’m Goodsly Support. Ask me about products, orders, shipping, or returns.",
};

const cleanSupportText = (text) => String(text || "")
  .replace(/\*\*(.*?)\*\*/g, "$1")
  .replace(/__(.*?)__/g, "$1")
  .replace(/^\s*#{1,6}\s*/gm, "")
  .replace(/^\s*[*+]\s+/gm, "• ")
  .replace(/^\s*-\s+/gm, "• ")
  .replace(/`([^`]+)`/g, "$1")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

const SupportAgent = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([greeting]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendMessage = async (event) => {
    event.preventDefault();
    const message = input.trim();
    if (!message || loading) return;
    if (message.length > MAX_MESSAGE_LENGTH) {
      setError(`Please keep messages under ${MAX_MESSAGE_LENGTH} characters.`);
      return;
    }

    const history = messages.slice(1).slice(-6).map(({ role, text }) => ({ role, text }));
    setMessages((current) => [...current, { role: "user", text: message }]);
    setInput("");
    setError("");
    setLoading(true);
    try {
      const response = await api.support(message, history);
      setMessages((current) => [...current, { role: "model", text: response.reply }]);
    } catch (requestError) {
      setError(requestError.message || "Support is unavailable right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`support-agent ${isOpen ? "support-agent-open" : ""}`}>
      {isOpen && (
        <section className="support-panel" aria-label="Goodsly Support">
          <div className="support-heading">
            <div>
              <p className="eyebrow">Goodsly Support</p>
              <h2>How can we help?</h2>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Close support chat"><FiX /></button>
          </div>
          <div className="support-messages" aria-live="polite">
            {messages.map((item, index) => (
              <p className={`support-message ${item.role === "user" ? "support-message-user" : ""}`} key={`${item.role}-${index}`}>
                {cleanSupportText(item.text)}
              </p>
            ))}
            {loading && <p className="support-message support-message-status">Goodsly Support is thinking…</p>}
          </div>
          {error && <p className="support-error" role="alert">{error}</p>}
          <form className="support-form" onSubmit={sendMessage}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about an order or product..."
              aria-label="Message Goodsly Support"
              maxLength={MAX_MESSAGE_LENGTH}
              disabled={loading}
            />
            <button type="submit" aria-label="Send support message" disabled={loading || !input.trim()}><FiSend /></button>
          </form>
          <small className="support-disclaimer">AI support covers Goodsly products, orders, shipping, and returns.</small>
        </section>
      )}
      <button className="support-launcher" type="button" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen} aria-label={isOpen ? "Close Goodsly Support" : "Open Goodsly Support"}>
        {isOpen ? <FiX /> : <FiMessageCircle />}
        <span>{isOpen ? "Close" : "Support"}</span>
      </button>
    </div>
  );
};

export default SupportAgent;
