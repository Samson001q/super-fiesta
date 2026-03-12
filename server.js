const express = require("express");
const app = express();
app.use(express.json());

const HF_TOKEN = process.env.HF_TOKEN;
const MODEL_URL =
  "https://router.huggingface.co/hf-inference/models/openai-community/roberta-base-openai-detector";

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>AI Text Detector</title>
  <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;700;800&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0a0a0f;
      --surface: #111118;
      --border: #1e1e2e;
      --accent: #00ff88;
      --danger: #ff4d6d;
      --text: #e8e8f0;
      --muted: #555570;
    }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Space Mono', monospace;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 20px 60px;
    }
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background-image:
        linear-gradient(rgba(0,255,136,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,255,136,0.03) 1px, transparent 1px);
      background-size: 40px 40px;
      pointer-events: none;
      z-index: 0;
    }
    .container { width: 100%; max-width: 720px; position: relative; z-index: 1; }
    header { margin-bottom: 48px; text-align: center; }
    .tag {
      display: inline-block;
      font-size: 10px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--accent);
      border: 1px solid var(--accent);
      padding: 3px 10px;
      margin-bottom: 16px;
    }
    h1 {
      font-family: 'Syne', sans-serif;
      font-size: clamp(2rem, 6vw, 3.2rem);
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.1;
    }
    h1 span { color: var(--accent); }
    .subtitle { margin-top: 12px; color: var(--muted); font-size: 12px; letter-spacing: 0.05em; }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 28px;
      margin-bottom: 20px;
    }
    .label { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; }
    textarea {
      width: 100%;
      min-height: 180px;
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      font-family: 'Space Mono', monospace;
      font-size: 13px;
      line-height: 1.7;
      padding: 14px;
      resize: vertical;
      outline: none;
      transition: border-color 0.2s;
    }
    textarea:focus { border-color: var(--accent); }
    textarea::placeholder { color: var(--muted); }
    .word-count { text-align: right; font-size: 11px; color: var(--muted); margin-top: 8px; }
    button {
      width: 100%;
      padding: 16px;
      background: var(--accent);
      color: #000;
      border: none;
      font-family: 'Space Mono', monospace;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      cursor: pointer;
      transition: opacity 0.2s;
      margin-top: 16px;
    }
    button:hover { opacity: 0.85; }
    button:disabled { opacity: 0.4; cursor: not-allowed; }
    #result { display: none; }
    #result.show { display: block; }
    .result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .verdict { font-family: 'Syne', sans-serif; font-size: 1.6rem; font-weight: 800; }
    .verdict.ai { color: var(--danger); }
    .verdict.human { color: var(--accent); }
    .confidence-label { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
    .bar-track { width: 100%; height: 6px; background: var(--border); overflow: hidden; }
    .bar-fill { height: 100%; width: 0%; transition: width 1s ease; }
    .bar-fill.ai { background: var(--danger); }
    .bar-fill.human { background: var(--accent); }
    .scores { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px; }
    .score-box { background: var(--bg); border: 1px solid var(--border); padding: 14px; }
    .score-box .s-label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
    .score-box .s-value { font-family: 'Syne', sans-serif; font-size: 1.8rem; font-weight: 800; }
    .score-box.ai .s-value { color: var(--danger); }
    .score-box.human .s-value { color: var(--accent); }
    .disclaimer { margin-top: 20px; padding: 12px 14px; border-left: 2px solid var(--muted); font-size: 11px; color: var(--muted); line-height: 1.6; }
    .error-msg { color: var(--danger); font-size: 12px; margin-top: 10px; display: none; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="tag">Forensic Analysis Tool</div>
      <h1>AI Text<br/><span>Detector</span></h1>
      <p class="subtitle">Powered by RoBERTa · OpenAI Community · HuggingFace</p>
    </header>
    <div class="card">
      <div class="label">// Input Text</div>
      <textarea id="input" placeholder="Paste the text you want to analyse here. Longer text (150+ words) gives more reliable results..."></textarea>
      <div class="word-count"><span id="wc">0</span> words</div>
      <div class="error-msg" id="error"></div>
      <button id="btn" onclick="analyse()">Run Analysis</button>
    </div>
    <div class="card" id="result">
      <div class="result-header">
        <div>
          <div class="label">// Verdict</div>
          <div class="verdict" id="verdict-text"></div>
        </div>
      </div>
      <div class="confidence-label">// Confidence</div>
      <div class="bar-track"><div class="bar-fill" id="bar"></div></div>
      <div class="scores">
        <div class="score-box ai">
          <div class="s-label">AI Generated</div>
          <div class="s-value" id="ai-score">-</div>
        </div>
        <div class="score-box human">
          <div class="s-label">Human Written</div>
          <div class="s-value" id="human-score">-</div>
        </div>
      </div>
      <div class="disclaimer">
        This model was trained on GPT-2 era outputs. Accuracy on newer models (GPT-4, Claude) is lower.
        Use as a signal, not a verdict.
      </div>
    </div>
  </div>
  <script>
    const input = document.getElementById('input');
    input.addEventListener('input', () => {
      const words = input.value.trim().split(/\s+/).filter(Boolean).length;
      document.getElementById('wc').textContent = words;
    });

    async function analyse() {
      const text = input.value.trim();
      const errEl = document.getElementById('error');
      errEl.style.display = 'none';
      if (!text || text.split(/\s+/).length < 20) {
        errEl.textContent = 'Please enter at least 20 words for a meaningful result.';
        errEl.style.display = 'block';
        return;
      }
      const btn = document.getElementById('btn');
      const resultCard = document.getElementById('result');
      btn.disabled = true;
      btn.textContent = 'Analysing...';
      resultCard.classList.remove('show');
      try {
        const res = await fetch('/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const aiScore  = data.ai    || 0;
        const humScore = data.human || 0;
        const isAI = aiScore > humScore;
        document.getElementById('verdict-text').textContent = isAI ? 'Likely AI-Generated' : 'Likely Human-Written';
        document.getElementById('verdict-text').className = 'verdict ' + (isAI ? 'ai' : 'human');
        document.getElementById('ai-score').textContent = (aiScore * 100).toFixed(1) + '%';
        document.getElementById('human-score').textContent = (humScore * 100).toFixed(1) + '%';
        const bar = document.getElementById('bar');
        bar.className = 'bar-fill ' + (isAI ? 'ai' : 'human');
        resultCard.classList.add('show');
        setTimeout(() => { bar.style.width = (Math.max(aiScore, humScore) * 100) + '%'; }, 100);
      } catch (err) {
        errEl.textContent = 'Error: ' + (err.message || 'Something went wrong.');
        errEl.style.display = 'block';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Run Analysis';
      }
    }
  </script>
</body>
</html>`;

app.get("/", (req, res) => res.send(HTML));

// Debug endpoint - visit /debug to see raw HuggingFace response
app.get("/debug", async (req, res) => {
  try {
    const response = await fetch(MODEL_URL, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + HF_TOKEN,
        "Content-Type": "application/json",
        "x-wait-for-model": "true",
      },
      body: JSON.stringify({ inputs: "This is a test sentence to check the model is working." }),
    });
    const raw = await response.text();
    res.send("<pre>Token present: " + !!HF_TOKEN + "\n\nRaw response:\n" + raw + "</pre>");
  } catch (err) {
    res.send("Fetch error: " + err.message);
  }
});

app.post("/detect", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "No text provided" });

  try {
    let result;
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch(MODEL_URL, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + HF_TOKEN,
          "Content-Type": "application/json",
          "x-wait-for-model": "true",
        },
        body: JSON.stringify({ inputs: text }),
      });
      result = await response.json();
      if (!result.error) break;
      if (attempt < 2) await new Promise(r => setTimeout(r, 10000));
    }

    if (result.error) {
      return res.status(503).json({ error: result.error });
    }

    const labels = result[0];
    const ai    = labels.find((l) => l.label === "Fake") ?.score || 0;
    const human = labels.find((l) => l.label === "Real") ?.score || 0;

    res.json({ ai, human });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
      opacity: 0;
      animation: fadeUp 0.5s ease forwards 0.4s;
    }

    .label {
      font-size: 10px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 10px;
    }

    textarea {
      width: 100%;
      min-height: 180px;
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      font-family: 'Space Mono', monospace;
      font-size: 13px;
      line-height: 1.7;
      padding: 14px;
      resize: vertical;
      outline: none;
      transition: border-color 0.2s;
    }

    textarea:focus { border-color: var(--accent); }
    textarea::placeholder { color: var(--muted); }

    .word-count {
      text-align: right;
      font-size: 11px;
      color: var(--muted);
      margin-top: 8px;
    }

    button {
      width: 100%;
      padding: 16px;
      background: var(--accent);
      color: #000;
      border: none;
      font-family: 'Space Mono', monospace;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.1s;
      margin-top: 16px;
    }

    button:hover { opacity: 0.85; }
    button:active { transform: scale(0.99); }
    button:disabled { opacity: 0.4; cursor: not-allowed; }

    /* Result card */
    #result {
      display: none;
      opacity: 0;
      animation: fadeUp 0.4s ease forwards;
    }

    #result.show { display: block; }

    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .verdict {
      font-family: 'Syne', sans-serif;
      font-size: 1.6rem;
      font-weight: 800;
    }

    .verdict.ai { color: var(--danger); }
    .verdict.human { color: var(--accent); }

    .confidence-label {
      font-size: 10px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 8px;
    }

    .bar-track {
      width: 100%;
      height: 6px;
      background: var(--border);
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      width: 0%;
      transition: width 1s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .bar-fill.ai { background: var(--danger); }
    .bar-fill.human { background: var(--accent); }

    .scores {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 20px;
    }

    .score-box {
      background: var(--bg);
      border: 1px solid var(--border);
      padding: 14px;
    }

    .score-box .s-label {
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 6px;
    }

    .score-box .s-value {
      font-family: 'Syne', sans-serif;
      font-size: 1.8rem;
      font-weight: 800;
    }

    .score-box.ai .s-value { color: var(--danger); }
    .score-box.human .s-value { color: var(--accent); }

    .disclaimer {
      margin-top: 20px;
      padding: 12px 14px;
      border-left: 2px solid var(--muted);
      font-size: 11px;
      color: var(--muted);
      line-height: 1.6;
    }

    .loading {
      text-align: center;
      padding: 30px;
      color: var(--muted);
      font-size: 12px;
      letter-spacing: 0.1em;
    }

    .dot-anim::after {
      content: '';
      animation: dots 1.2s steps(4, end) infinite;
    }

    @keyframes dots {
      0%   { content: ''; }
      25%  { content: '.'; }
      50%  { content: '..'; }
      75%  { content: '...'; }
    }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(14px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .error-msg {
      color: var(--danger);
      font-size: 12px;
      margin-top: 10px;
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="tag">Forensic Analysis Tool</div>
      <h1>AI Text<br/><span>Detector</span></h1>
      <p class="subtitle">Powered by RoBERTa · OpenAI Community · HuggingFace</p>
    </header>

    <div class="card">
      <div class="label">// Input Text</div>
      <textarea id="input" placeholder="Paste the text you want to analyse here. Longer text (150+ words) gives more reliable results..."></textarea>
      <div class="word-count"><span id="wc">0</span> words</div>
      <div class="error-msg" id="error"></div>
      <button id="btn" onclick="analyse()">Run Analysis</button>
    </div>

    <div class="card" id="result">
      <div class="result-header">
        <div>
          <div class="label">// Verdict</div>
          <div class="verdict" id="verdict-text"></div>
        </div>
      </div>

      <div class="confidence-label">// Confidence</div>
      <div class="bar-track">
        <div class="bar-fill" id="bar"></div>
      </div>

      <div class="scores">
        <div class="score-box ai">
          <div class="s-label">AI Generated</div>
          <div class="s-value" id="ai-score">—</div>
        </div>
        <div class="score-box human">
          <div class="s-label">Human Written</div>
          <div class="s-value" id="human-score">—</div>
        </div>
      </div>

      <div class="disclaimer">
        ⚠ This model was trained on GPT-2 era outputs. Accuracy on newer models (GPT-4, Claude) is lower.
        Use as a signal, not a verdict. Not suitable for academic misconduct decisions.
      </div>
    </div>
  </div>

  <script>
    const input = document.getElementById('input');
    input.addEventListener('input', () => {
      const words = input.value.trim().split(/\s+/).filter(Boolean).length;
      document.getElementById('wc').textContent = words;
    });

    async function analyse() {
      const text = input.value.trim();
      const errEl = document.getElementById('error');
      errEl.style.display = 'none';

      if (!text || text.split(/\s+/).length < 20) {
        errEl.textContent = 'Please enter at least 20 words for a meaningful result.';
        errEl.style.display = 'block';
        return;
      }

      const btn = document.getElementById('btn');
      const resultCard = document.getElementById('result');

      btn.disabled = true;
      btn.textContent = 'Analysing';
      btn.classList.add('dot-anim');
      resultCard.classList.remove('show');

      try {
        const res = await fetch('/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const aiScore   = data.ai   ?? 0;
        const humScore  = data.human ?? 0;
        const isAI      = aiScore > humScore;

        document.getElementById('verdict-text').textContent = isAI ? 'Likely AI-Generated' : 'Likely Human-Written';
        document.getElementById('verdict-text').className   = 'verdict ' + (isAI ? 'ai' : 'human');
        document.getElementById('ai-score').textContent     = (aiScore * 100).toFixed(1) + '%';
        document.getElementById('human-score').textContent  = (humScore * 100).toFixed(1) + '%';

        const bar = document.getElementById('bar');
        bar.className = 'bar-fill ' + (isAI ? 'ai' : 'human');

        resultCard.classList.add('show');
        setTimeout(() => { bar.style.width = (Math.max(aiScore, humScore) * 100) + '%'; }, 100);

      } catch (err) {
        errEl.textContent = 'Error: ' + (err.message || 'Something went wrong. Try again.');
        errEl.style.display = 'block';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Run Analysis';
        btn.classList.remove('dot-anim');
      }
    }
  </script>
</body>
</html>`;

app.get("/", (req, res) => res.send(HTML));

app.get("/debug", async (req, res) => {
  try {
    const response = await fetch(MODEL_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${HF_TOKEN}`, "Content-Type": "application/json", "x-wait-for-model": "true" },
      body: JSON.stringify({ inputs: "This is a test sentence to check the model is working." }),
    });
    const raw = await response.text();
    res.send("<pre>" + raw + "</pre>");
  } catch (err) {
    res.send("Fetch error: " + err.message);
  }
});

app.post("/detect", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "No text provided" });

  try {
    // Retry up to 3 times with wait_for_model enabled
    let result;
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch(MODEL_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
          "x-wait-for-model": "true",
        },
        body: JSON.stringify({ inputs: text }),
      });
      result = await response.json();
      if (!result.error) break;
      // Wait 10s before retrying
      if (attempt < 2) await new Promise(r => setTimeout(r, 10000));
    }

    if (result.error) {
      return res.status(503).json({ error: "HuggingFace model is unavailable right now. Please try again in a minute." });
    }

    // Result is an array of [{label, score}]
    const labels = result[0];
    const ai    = labels.find((l) => l.label === "Fake")?.score ?? 0;
    const human = labels.find((l) => l.label === "Real")?.score ?? 0;

    res.json({ ai, human });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
      opacity: 0;
      animation: fadeUp 0.5s ease forwards 0.4s;
    }

    .label {
      font-size: 10px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 10px;
    }

    textarea {
      width: 100%;
      min-height: 180px;
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      font-family: 'Space Mono', monospace;
      font-size: 13px;
      line-height: 1.7;
      padding: 14px;
      resize: vertical;
      outline: none;
      transition: border-color 0.2s;
    }

    textarea:focus { border-color: var(--accent); }
    textarea::placeholder { color: var(--muted); }

    .word-count {
      text-align: right;
      font-size: 11px;
      color: var(--muted);
      margin-top: 8px;
    }

    button {
      width: 100%;
      padding: 16px;
      background: var(--accent);
      color: #000;
      border: none;
      font-family: 'Space Mono', monospace;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.1s;
      margin-top: 16px;
    }

    button:hover { opacity: 0.85; }
    button:active { transform: scale(0.99); }
    button:disabled { opacity: 0.4; cursor: not-allowed; }

    /* Result card */
    #result {
      display: none;
      opacity: 0;
      animation: fadeUp 0.4s ease forwards;
    }

    #result.show { display: block; }

    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .verdict {
      font-family: 'Syne', sans-serif;
      font-size: 1.6rem;
      font-weight: 800;
    }

    .verdict.ai { color: var(--danger); }
    .verdict.human { color: var(--accent); }

    .confidence-label {
      font-size: 10px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 8px;
    }

    .bar-track {
      width: 100%;
      height: 6px;
      background: var(--border);
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      width: 0%;
      transition: width 1s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .bar-fill.ai { background: var(--danger); }
    .bar-fill.human { background: var(--accent); }

    .scores {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 20px;
    }

    .score-box {
      background: var(--bg);
      border: 1px solid var(--border);
      padding: 14px;
    }

    .score-box .s-label {
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 6px;
    }

    .score-box .s-value {
      font-family: 'Syne', sans-serif;
      font-size: 1.8rem;
      font-weight: 800;
    }

    .score-box.ai .s-value { color: var(--danger); }
    .score-box.human .s-value { color: var(--accent); }

    .disclaimer {
      margin-top: 20px;
      padding: 12px 14px;
      border-left: 2px solid var(--muted);
      font-size: 11px;
      color: var(--muted);
      line-height: 1.6;
    }

    .loading {
      text-align: center;
      padding: 30px;
      color: var(--muted);
      font-size: 12px;
      letter-spacing: 0.1em;
    }

    .dot-anim::after {
      content: '';
      animation: dots 1.2s steps(4, end) infinite;
    }

    @keyframes dots {
      0%   { content: ''; }
      25%  { content: '.'; }
      50%  { content: '..'; }
      75%  { content: '...'; }
    }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(14px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .error-msg {
      color: var(--danger);
      font-size: 12px;
      margin-top: 10px;
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="tag">Forensic Analysis Tool</div>
      <h1>AI Text<br/><span>Detector</span></h1>
      <p class="subtitle">Powered by RoBERTa · OpenAI Community · HuggingFace</p>
    </header>

    <div class="card">
      <div class="label">// Input Text</div>
      <textarea id="input" placeholder="Paste the text you want to analyse here. Longer text (150+ words) gives more reliable results..."></textarea>
      <div class="word-count"><span id="wc">0</span> words</div>
      <div class="error-msg" id="error"></div>
      <button id="btn" onclick="analyse()">Run Analysis</button>
    </div>

    <div class="card" id="result">
      <div class="result-header">
        <div>
          <div class="label">// Verdict</div>
          <div class="verdict" id="verdict-text"></div>
        </div>
      </div>

      <div class="confidence-label">// Confidence</div>
      <div class="bar-track">
        <div class="bar-fill" id="bar"></div>
      </div>

      <div class="scores">
        <div class="score-box ai">
          <div class="s-label">AI Generated</div>
          <div class="s-value" id="ai-score">—</div>
        </div>
        <div class="score-box human">
          <div class="s-label">Human Written</div>
          <div class="s-value" id="human-score">—</div>
        </div>
      </div>

      <div class="disclaimer">
        ⚠ This model was trained on GPT-2 era outputs. Accuracy on newer models (GPT-4, Claude) is lower.
        Use as a signal, not a verdict. Not suitable for academic misconduct decisions.
      </div>
    </div>
  </div>

  <script>
    const input = document.getElementById('input');
    input.addEventListener('input', () => {
      const words = input.value.trim().split(/\s+/).filter(Boolean).length;
      document.getElementById('wc').textContent = words;
    });

    async function analyse() {
      const text = input.value.trim();
      const errEl = document.getElementById('error');
      errEl.style.display = 'none';

      if (!text || text.split(/\s+/).length < 20) {
        errEl.textContent = 'Please enter at least 20 words for a meaningful result.';
        errEl.style.display = 'block';
        return;
      }

      const btn = document.getElementById('btn');
      const resultCard = document.getElementById('result');

      btn.disabled = true;
      btn.textContent = 'Analysing';
      btn.classList.add('dot-anim');
      resultCard.classList.remove('show');

      try {
        const res = await fetch('/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const aiScore   = data.ai   ?? 0;
        const humScore  = data.human ?? 0;
        const isAI      = aiScore > humScore;

        document.getElementById('verdict-text').textContent = isAI ? 'Likely AI-Generated' : 'Likely Human-Written';
        document.getElementById('verdict-text').className   = 'verdict ' + (isAI ? 'ai' : 'human');
        document.getElementById('ai-score').textContent     = (aiScore * 100).toFixed(1) + '%';
        document.getElementById('human-score').textContent  = (humScore * 100).toFixed(1) + '%';

        const bar = document.getElementById('bar');
        bar.className = 'bar-fill ' + (isAI ? 'ai' : 'human');

        resultCard.classList.add('show');
        setTimeout(() => { bar.style.width = (Math.max(aiScore, humScore) * 100) + '%'; }, 100);

      } catch (err) {
        errEl.textContent = 'Error: ' + (err.message || 'Something went wrong. Try again.');
        errEl.style.display = 'block';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Run Analysis';
        btn.classList.remove('dot-anim');
      }
    }
  </script>
</body>
</html>`;

app.get("/", (req, res) => res.send(HTML));

app.post("/detect", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "No text provided" });

  try {
    // Retry up to 3 times with wait_for_model enabled
    let result;
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch(MODEL_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
          "x-wait-for-model": "true",
        },
        body: JSON.stringify({ inputs: text }),
      });
      result = await response.json();
      if (!result.error) break;
      // Wait 10s before retrying
      if (attempt < 2) await new Promise(r => setTimeout(r, 10000));
    }

    if (result.error) {
      return res.status(503).json({ error: "HuggingFace model is unavailable right now. Please try again in a minute." });
    }

    // Result is an array of [{label, score}]
    const labels = result[0];
    const ai    = labels.find((l) => l.label === "Fake")?.score ?? 0;
    const human = labels.find((l) => l.label === "Real")?.score ?? 0;

    res.json({ ai, human });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
