# 🎬 CineCircle – Real-Time Watch Party Platform

CineCircle is a modern **real-time multi-user watch party web application** that allows people to watch videos together from anywhere in the world. It combines synchronized video playback, live chat, emoji reactions, and interactive camera circles to create a shared viewing experience — just like watching movies with friends in the same room.

---

## 🌟 Key Highlights

- 🌍 Watch movies together remotely
- ⚡ Real-time synchronization using WebSockets
- 👥 Multi-user room system
- 🎥 Interactive camera circles (simulated or real)
- 💬 Live chat with instant updates
- 😂 Animated emoji reactions
- 🔗 Easy invite via room code or link
- 📱 Fully responsive design

---

## 🚀 Features

### 🎬 Watch Together
- Load videos via direct URL (.mp4, .webm)
- Demo video support (Big Buck Bunny)
- Smooth playback across all users

### ⏯ Playback Controls
- Play / Pause sync across users
- Skip forward / backward (±10 seconds)
- Clickable progress bar (seek functionality)
- Volume control

### 👥 Room System
- Create room with custom name
- Join room using unique room code
- Shareable invite link

### 💬 Real-Time Chat
- Instant messaging with all participants
- Auto-scroll and timestamps
- System messages (join/leave notifications)

### 😂 Emoji Reactions
- Floating animated emojis
- Real-time reaction sharing

### 🎥 Camera Circles
- Circular video/avatar UI
- Simulated camera feed (works without permission)
- Real camera support (on HTTPS/localhost)

---


## 🛠️ Tech Stack

| Layer        | Technology |
|-------------|------------|
| Frontend     | HTML, CSS, JavaScript |
| Backend      | Node.js, Express |
| Realtime     | Socket.IO |
| Media Player | HTML5 Video API |
| Styling      | Custom CSS (Dark UI) |
| Future       | WebRTC, MongoDB |

---

🧪 How to Use
Open the app in browser
Create a room or join using room code
Share room code with friends
Load a video URL
Start watching together 🎬

---
<img width="1920" height="1080" alt="cinecircle" src="https://github.com/user-attachments/assets/2a89a80f-bd32-4e68-af07-aacc502b67f7" />

## ⚙️ Installation & Setup

### 1️⃣ Clone Repository

```bash
git clone https://github.com/your-username/cinecircle.git
cd cinecircle

npm install

node server.js

http://localhost:3000

