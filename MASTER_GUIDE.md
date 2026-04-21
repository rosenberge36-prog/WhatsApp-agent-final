# 👑 WhatsApp AI Agent: Master Edition (Refined)

This is the ultimate version of your personal AI agent, rebuilt for 100% stability on Railway and total control within WhatsApp.

---

## 🎮 How to Control it (Inside WhatsApp)

You don't need a computer or a dashboard to manage this. Just send these commands to your agent's chat:

| Command | Action |
| :--- | :--- |
| `!enable` | **Start** auto-replying to this person/group. |
| `!disable` | **Stop** auto-replying to this person/group. |
| `!status` | Get a live report (Messages, AI Replies, Uptime). |
| `!set personality <text>` | Change how the AI talks (e.g., `!set personality funny`). |
| `!set name <text>` | Change your name so the AI knows who it is. |

---

## 🚀 Step-by-Step Deployment (Zero Friction)

### 1. The Files
- Unzip `whatsapp-agent-master-edition.zip`.
- Upload all files inside to a **new private GitHub repository**.

### 2. The Cloud (Railway)
1. Go to [Railway.app](https://railway.app/) and login with GitHub.
2. Click **"New Project"** -> **"Deploy from GitHub repo"**.
3. Select your repository.
4. **IMPORTANT**: Go to the **"Variables"** tab and add:
   - `OPENAI_API_KEY`: (Your Key)
   - `OPENAI_BASE_URL`: `https://api.manusprime.com/v1`
   - `AI_MODEL`: `gpt-4.1-mini`

### 3. The Connection
1. Once Railway finishes building, click the **public URL** it gives you.
2. Scan the **QR Code** once with your WhatsApp.
3. **You are now live!**

---

## 🧠 Why this version is "Perfect":
- **Master Mode**: Total control without leaving WhatsApp.
- **Deep Search**: It scans your entire history to be accurate.
- **Railway Fix**: Optimized Docker setup so it doesn't crash.
- **Permission-Only**: It stays silent until you type `!enable`.
- **Sounds Like You**: AI prompts are tuned to match your slang and style.
