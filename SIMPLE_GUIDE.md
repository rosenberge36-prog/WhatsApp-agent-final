# 🌟 The "Easiest Way" Guide (No Coding Required)

Follow these 4 steps to get your WhatsApp AI running in the cloud 24/7.

### Step 1: Create a GitHub Account (If you don't have one)
1. Go to [GitHub.com](https://github.com/) and sign up for a free account.
2. This is just a "storage box" for your agent's files so the cloud can see them.

### Step 2: Put the Files on GitHub
1. Create a new "Repository" (click the **+** icon at the top right -> **New repository**).
2. Name it `my-whatsapp-agent`.
3. Instead of "running" the files, **Upload** them:
   - Unzip the `whatsapp-agent-pro.zip` I gave you on your computer.
   - Drag and drop all the files from that folder into your new GitHub repository.
   - Click **"Commit changes"** at the bottom.

### Step 3: Connect to Railway (The Cloud)
1. Go to [Railway.app](https://railway.app/) and login with your GitHub account.
2. Click **"New Project"** -> **"Deploy from GitHub repo"**.
3. Choose the `my-whatsapp-agent` repository you just made.
4. Click **"Variables"** and add these three:
   - `OPENAI_API_KEY`: (Paste your key here)
   - `OPENAI_BASE_URL`: `https://api.manusprime.com/v1`
   - `AI_MODEL`: `gpt-4.1-mini`
5. Click **"Deploy"**.

### Step 4: Scan and You're Done!
1. Once it says "Active", Railway will give you a link (like `https://...railway.app`).
2. Open that link on your phone or computer.
3. You will see the **QR Code**. Scan it with your WhatsApp (Linked Devices).
4. **Important:** Scroll down to "Chat Whitelist" on that same page and turn **ON** the people you want the AI to talk to.

---

### "What if I don't want to use GitHub?"
If you find GitHub too hard, you can use **Railway's CLI**, but GitHub is the standard "One-Click" way. Once you do this once, you never have to touch it again—it will run forever in the cloud!
