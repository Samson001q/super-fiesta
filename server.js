const express = require("express");
const path = require("path");
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const HF_TOKEN = process.env.HF_TOKEN;
const DETECT_URL = "https://router.huggingface.co/hf-inference/models/Hello-SimpleAI/chatgpt-detector-roberta";
const HUMANIZE_URL = "https://router.huggingface.co/v1/chat/completions";
const HUMANIZE_MODEL = "HuggingFaceH4/zephyr-7b-beta";

app.get("/debug", async (req, res) => {
  try {
    const response = await fetch(DETECT_URL, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + HF_TOKEN,
        "Content-Type": "application/json",
        "x-wait-for-model": "true",
      },
      body: JSON.stringify({ inputs: "This is a test sentence." }),
    });
    const raw = await response.text();
    res.send("<pre>Token present: " + !!HF_TOKEN + "\n\n" + raw + "</pre>");
  } catch (err) {
    res.send("Error: " + err.message);
  }
});

app.post("/detect", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "No text provided" });
  try {
    let result;
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch(DETECT_URL, {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + HF_TOKEN,
          "Content-Type": "application/json",
          "x-wait-for-model": "true",
        },
        body: JSON.stringify({ inputs: text }),
      });
      result = await response.json();
      if (!result.error) break;
      if (attempt < 2) await new Promise(r => setTimeout(r, 10000));
    }
    if (result.error) return res.status(503).json({ error: result.error });
    const labels = result[0];
    const ai    = (labels.find(l => l.label === "ChatGPT") || {}).score || 0;
    const human = (labels.find(l => l.label === "Human")   || {}).score || 0;
    res.json({ ai, human });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/humanize", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "No text provided" });
  try {
    const response = await fetch(HUMANIZE_URL, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + HF_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: HUMANIZE_MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: "system",
            content: "You are a human writer. Rewrite the text given to you so it sounds natural and human-written. Use contractions, vary sentence lengths dramatically, add a casual personal observation, avoid formal transitions like 'furthermore' or 'moreover', use active voice, and keep it conversational. Return ONLY the rewritten text with no explanations."
          },
          {
            role: "user",
            content: text
          }
        ]
      }),
    });
    const result = await response.json();
    const humanized = result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content;
    if (!humanized) return res.status(500).json({ error: "No output. Raw: " + JSON.stringify(result).slice(0, 300) });
    res.json({ humanized });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
