# 🚀 One-Click Cloud Deployment Guide

This is the simplest way to get your WhatsApp AI Agent running 24/7 in the cloud.

## Option 1: Deploy to Railway (Recommended)

1.  **Fork this project** (or upload the files) to your GitHub account.
2.  Go to [Railway.app](https://railway.app/) and create an account.
3.  Click **"New Project"** → **"Deploy from GitHub repo"**.
4.  Select your repository.
5.  Click **"Add Variables"** and add:
    *   `OPENAI_API_KEY`: Your OpenAI API Key.
    *   `OPENAI_BASE_URL`: `https://api.manusprime.com/v1` (or your preferred provider).
    *   `AI_MODEL`: `gpt-4.1-mini`.
6.  Railway will automatically detect the `Dockerfile` and start your agent.
7.  Once deployed, Railway will give you a public URL (e.g., `https://your-project.up.railway.app`).
8.  Open that URL, scan the QR code, and you're live!

---

## Option 2: Deploy to Render

1.  Create a [Render.com](https://render.com/) account.
2.  Click **"New"** → **"Web Service"**.
3.  Connect your GitHub repository.
4.  Select **"Docker"** as the runtime.
5.  Add the same Environment Variables as above.
6.  Click **"Deploy"**.

---

## How to use the "Permission System"

1.  Once the agent is running and you've scanned the QR code, open your dashboard.
2.  Scroll down to the **"Chat Whitelist"** section.
3.  Click **"Refresh Chats"**.
4.  Toggle the switch **ON** for only the people or groups you want the AI to reply to.
5.  **The agent will never reply to anyone else.**

---

## How "Deep Memory" works

The agent now automatically:
- Searches your entire past chat history if someone mentions a keyword or a link.
- Remembers what you said weeks ago to keep the conversation accurate.
- Uses this "Deep Context" to make sure it doesn't make mistakes about your past plans or info.
