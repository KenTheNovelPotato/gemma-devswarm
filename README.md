# DevSwarm ⚡ Real-Time Multimodal Agent Whiteboard

**DevSwarm** is an interactive, real-time prototyping tool built for the **Gemma 4 x Cerebras 24-Hour Hackathon**. 

It enables developers and product designers to hold a hand-drawn UI sketch or wireframe mockup up to their webcam, automatically snap a picture once it's in focus, and watch a **collaborative swarm of 5 specialized AI agents** design, style, compile, audit, and polish it into a working HTML/Tailwind web application in real-time.

To showcase the power of Cerebras' ultra-fast inference, DevSwarm runs the exact same agent swarm concurrently on a **Local GPU-bound instance (Ollama)**, providing a side-by-side speed visualizer tracking Time to First Token (TTFT), token throughput, and overall compilation latency.

---

## 🌟 Key Features
- **📸 Live Webcam Scanner with Focus Auto-Snap**: Uses a custom edge-gradient sharpness calculation in the browser. Once you bring your paper drawing into focus, it triggers a flash, snaps the frame, and launches the swarm.
- **🔄 Flip Horizontal (Mirror) Control**: Easily invert the camera feed with a toggle to ensure that handwritten text and mockups are read correctly left-to-right by the vision model.
- **🤖 Collaborative Multi-Agent Swarm**:
  1. **Product Manager Agent**: Analyzes the mockup image and writes product specs.
  2. **UX/UI Designer Agent**: Outlines Tailwind color palettes, layouts, and animations.
  3. **Frontend Developer Agent**: Compiles the specs and styling guidelines into clean, responsive HTML/JS/Tailwind code.
  4. **QA Auditor Agent**: Critiques the layout, checks for bugs, and recommends visual polish.
  5. **Polish Pass Developer**: Refines the developer code based on the QA report.
- **⚡ 1,500+ Tokens/Sec Cerebras Engine**: Uses `gemma-4-31b` via Cerebras' OpenAI-compatible endpoint. The massive token generation speed allows a 5-step agent refinement loop to finish in 10-15 seconds, compared to minutes on local GPUs.
- **💻 Live Sandboxed Preview**: Displays the final styled app inside a sandboxed `iframe` so you can click, test, and copy the code instantly.
- **📊 Latency Analytics Dashboard**: Shows a live side-by-side stopwatch, TTFT comparison, tokens/sec speedometer, and a dynamic speed multiplier (e.g. *"Cerebras completed 18.2x quicker!"*).

---

## 🏗️ Project Structure
```
Gemma4CerebrasHackathon/
├── start.bat             # Double-click launcher script
├── README.md             # Project documentation
├── .gitignore            # Git exclusion rules
├── backend/
│   ├── server.js         # Express app running parallel SSE streams
│   ├── package.json      # Backend dependencies (express, cors, node-fetch, openai)
│   ├── .env.example      # Example environment variables
│   └── test-node-fetch.js# Connection test utility
└── frontend/
    ├── package.json      # React + Vite + Tailwind dependencies
    ├── tailwind.config.js# Tailwind theme config
    ├── index.html        # Main app entrypoint (Outfit font, title)
    └── src/
        ├── App.jsx       # Glassmorphic 100vh static control dashboard
        ├── index.css     # Tailwind custom scrollbar and animations config
        └── main.jsx      # React launcher
```

---

## 🚀 Setup & Launch Instructions

### 1. Pre-requisites
- **Node.js** (v18 or higher) installed on your system.
- **Ollama** running locally (usually at `http://localhost:11434`) with the Gemma model pulled:
  ```bash
  ollama pull gemma
  ```

### 2. Configure Keys
Create a file named `.env` in the `backend/` directory and add your Cerebras API key (obtainable at [cloud.cerebras.ai](https://cloud.cerebras.ai)):
```env
PORT=3001
CEREBRAS_API_KEY=your_key_here
```
*(Alternatively, you can type your Cerebras key directly in the UI dashboard when you launch the app; it will save securely in your browser's `localStorage`)*.

### 3. Start DevSwarm
Double-click the **`start.bat`** script in the root directory. This will open two separate terminal windows:
- One running the **Node Express server** (`http://localhost:3001`)
- One running the **React Vite dev server** (`http://localhost:5173`)

Open your browser to `http://localhost:5173` and start building!

---

## 🧠 Why Cerebras + Gemma 4?
Multi-agent swarms have historically been impractical for real-time human-in-the-loop design sessions due to GPU latency bottlenecks. When 5 agents collaborate sequentially (where each agent's output is fed to the next), typical GPU latencies of 30-50 tokens/sec mean the user has to wait 2 to 3 minutes for a single layout.

By leveraging **Gemma 4 31B** running on the **Cerebras wafer-scale engine**, generation speeds shoot up to **1,500+ tokens/sec**. This reduces the entire 5-step PM-to-Developer swarm pipeline to **under 15 seconds**, unlocking true "work at the speed of thought" rapid prototyping.

Built by Ken Goyarola for the Cerebras x Gemma 4 hackathon 6/28/26
