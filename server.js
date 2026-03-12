const express = require("express");
const path = require("path");
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const HF_TOKEN = process.env.HF_TOKEN;
const DETECT_URL = "https://router.huggingface.co/hf-inference/models/Hello-SimpleAI/chatgpt-detector-roberta";
const HUMANIZE_URL = "https://conversantech-humanizer-ai.hf.space/api/predict";

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
    res.send("<pre>Token present: " + !!HF_TOKEN + "\n\nRaw HF response:\n" + raw + "</pre>");
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [text, "Standard"] }),
    });
    const raw = await response.text();
    console.log("Humanizer raw response:", raw);
    const result = JSON.parse(raw);
    const humanized =
      (result.data && typeof result.data[0] === "string" && result.data[0]) ||
      (result.data && result.data[0] && result.data[0].value) ||
      (result.output) ||
      null;
    if (!humanized) {
      console.log("Full result:", JSON.stringify(result));
      return res.status(500).json({ error: "Unexpected response: " + raw.slice(0, 200) });
    }
    res.json({ humanized });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
