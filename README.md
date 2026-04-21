# 🤖 WhatsApp AI Agent (Master Edition)

An intelligent WhatsApp automation agent with **In-App Control**. You can manage everything directly from your WhatsApp chat without opening the dashboard.

---

## 🎮 Master Mode (WhatsApp Commands)

You can send these commands to your own agent or in any chat to control it:

| Command | Description |
|---|---|
| `!enable` | Enable AI auto-reply for the current chat |
| `!disable` | Disable AI auto-reply for the current chat |
| `!status` | Get a live report of messages and uptime |
| `!set personality <text>` | Change the AI's tone (e.g., `!set personality funny and sarcastic`) |
| `!set name <text>` | Change the name the AI uses for you |

---

## 🚀 One-Click Cloud Deployment (Railway)

1. **GitHub**: Upload these files to a new GitHub repository.
2. **Railway**: Create a new project from that GitHub repo.
3. **Variables**: Add your `OPENAI_API_KEY` in the Railway variables tab.
4. **Done**: Railway will use the included `Dockerfile` to set up everything automatically.

---

## 🧠 Pro Features

- **Permission-Only**: The agent is silent by default. It only replies if you type `!enable` in a chat.
- **Deep Memory**: It searches your entire past chat history to find references and stay accurate.
- **Status Reactions**: Automatically reacts to status updates with 👍 or ❤️.
- **Railway Optimized**: Includes a custom Docker setup to ensure Chromium runs perfectly in the cloud.

---

## 🛠️ Setup

1. `npm install`
2. `cp .env.example .env` (Add your API Key)
3. `npm start`
