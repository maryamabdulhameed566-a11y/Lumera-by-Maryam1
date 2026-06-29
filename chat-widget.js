// ============================================================
// AI CHAT WIDGET — floating launcher + panel, calls your Cloud Function
// ============================================================
import { CHAT_FUNCTION_URL } from "./firebase-config.js";

const WELCOME = "Hi! I'm the Luméra assistant 🌸 Ask me about ingredients, skin types, or finding the right product — I can't place orders, but I can point you to the right Amazon link.";

export function initChatWidget() {
  const launcher = document.createElement("button");
  launcher.className = "chat-launcher";
  launcher.setAttribute("aria-label", "Open chat with the Luméra assistant");
  launcher.innerHTML = "✨";

  const panel = document.createElement("div");
  panel.className = "chat-panel";
  panel.innerHTML = `
    <div class="chat-head">
      <div>
        <div class="title">Ask Maryam's Assistant</div>
        <div class="sub">USUALLY REPLIES INSTANTLY</div>
      </div>
      <button type="button" aria-label="Close chat" data-chat-close>✕</button>
    </div>
    <div class="chat-body" data-chat-body></div>
    <form class="chat-foot" data-chat-form>
      <input type="text" placeholder="Type a message…" data-chat-input autocomplete="off" />
      <button type="submit" aria-label="Send">➤</button>
    </form>
    <div class="chat-disclaimer">AI-generated answers — for medical concerns, check with a professional.</div>
  `;

  document.body.appendChild(launcher);
  document.body.appendChild(panel);

  const body = panel.querySelector("[data-chat-body]");
  const form = panel.querySelector("[data-chat-form]");
  const input = panel.querySelector("[data-chat-input]");
  let history = [];
  let opened = false;

  function addMessage(role, text) {
    const div = document.createElement("div");
    div.className = `chat-msg ${role}`;
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
  }

  launcher.addEventListener("click", () => {
    panel.classList.toggle("open");
    if (!opened) {
      addMessage("bot", WELCOME);
      opened = true;
    }
  });
  panel.querySelector("[data-chat-close]").addEventListener("click", () => panel.classList.remove("open"));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addMessage("user", text);
    history.push({ role: "user", content: text });
    input.value = "";
    input.disabled = true;

    const typingEl = addMessage("typing", "Typing…");

    try {
      if (CHAT_FUNCTION_URL.startsWith("PASTE_")) {
        throw new Error("not-configured");
      }
      const res = await fetch(CHAT_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok) throw new Error("bad-response");
      const data = await res.json();
      typingEl.remove();
      addMessage("bot", data.reply || "Sorry, I didn't catch that — could you rephrase?");
      history.push({ role: "assistant", content: data.reply || "" });
    } catch (err) {
      typingEl.remove();
      if (err.message === "not-configured") {
        addMessage("bot", "The AI assistant isn't connected yet — the store owner still needs to deploy the chat function (see README step 4).");
      } else {
        addMessage("bot", "I'm having trouble connecting right now. Please try again in a moment.");
      }
    } finally {
      input.disabled = false;
      input.focus();
    }
  });
}
