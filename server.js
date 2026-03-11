require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.static(path.join(__dirname)));  // ✅ FIXED: was path.join(__dirname, "public")

// ── Groq Client ────────────────────────────────────
let groq;
try {
  const Groq = require("groq-sdk");
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
} catch (e) {
  console.warn("groq-sdk not found. Run: npm install");
}

const MODEL = "llama-3.3-70b-versatile";

async function ask(system, user, maxTokens = 2048) {
  if (!groq) throw new Error("Groq SDK not installed. Run: npm install");
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "your_groq_api_key_here") {
    throw new Error("GROQ_API_KEY not set. Add it to your .env file from console.groq.com");
  }
  const res = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
    temperature: 0.7,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  });
  return res.choices[0].message.content;
}

function parseJSON(raw) {
  const cleaned = raw
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();
  const start = cleaned.search(/[{\[]/);
  const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (start === -1 || end === -1) throw new Error("No JSON found in response");
  return JSON.parse(cleaned.substring(start, end + 1));
}

function sendError(res, msg, status = 500) {
  console.error("[ERROR]", msg);
  return res.status(status).json({ success: false, error: String(msg) });
}

// ── PDF Upload ────────────────────────────────────
app.post("/api/upload-pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return sendError(res, "No file uploaded.", 400);
    if (path.extname(req.file.originalname).toLowerCase() !== ".pdf")
      return sendError(res, "Only PDF files supported.", 400);
    let pdfParse;
    try { pdfParse = require("pdf-parse"); } catch (e) {
      return sendError(res, "pdf-parse not installed. Run: npm install pdf-parse");
    }
    const data = await pdfParse(req.file.buffer);
    const text = data.text.replace(/\s+/g, " ").trim().substring(0, 8000);
    res.json({ success: true, text, pages: data.numpages, filename: req.file.originalname });
  } catch (e) {
    sendError(res, "PDF extraction failed: " + e.message);
  }
});

// ── Summarize ──────────────────────────────────────
app.post("/api/summarize", async (req, res) => {
  try {
    const { notes } = req.body;
    if (!notes || notes.trim().length < 10) return sendError(res, "Please provide valid notes.", 400);
    const raw = await ask(
      "You are an expert academic summarizer. You MUST return ONLY valid JSON with no markdown, no explanation, no extra text.",
      `Summarize the following notes. Return ONLY this exact JSON structure, nothing else:
{"title":"A descriptive title for these notes","overview":"A 2-3 sentence overview","keyPoints":["point 1","point 2","point 3","point 4","point 5"],"importantTerms":[{"term":"Term Name","definition":"Clear definition"}],"conclusion":"One powerful takeaway sentence"}

NOTES:
${notes.substring(0, 6000)}`
    );
    res.json({ success: true, data: parseJSON(raw) });
  } catch (e) { sendError(res, e.message); }
});

// ── Flashcards ────────────────────────────────────
app.post("/api/flashcards", async (req, res) => {
  try {
    const { notes, count = 8 } = req.body;
    if (!notes || !notes.trim()) return sendError(res, "Please provide notes.", 400);
    const raw = await ask(
      "You are an expert educator. You MUST return ONLY valid JSON with no markdown, no explanation.",
      `Generate exactly ${count} flashcards from these notes. Return ONLY this JSON:
{"flashcards":[{"id":1,"front":"Clear concise question","back":"Accurate answer","difficulty":"easy","topic":"topic tag"},{"id":2,"front":"...","back":"...","difficulty":"medium","topic":"..."}]}
Difficulty must be one of: easy, medium, hard.

NOTES:
${notes.substring(0, 5000)}`
    );
    res.json({ success: true, data: parseJSON(raw) });
  } catch (e) { sendError(res, e.message); }
});

// ── Quiz ──────────────────────────────────────────
app.post("/api/quiz", async (req, res) => {
  try {
    const { notes, count = 5, difficulty = "medium" } = req.body;
    if (!notes || !notes.trim()) return sendError(res, "Please provide notes.", 400);
    const raw = await ask(
      "You are an expert quiz creator. You MUST return ONLY valid JSON with no markdown.",
      `Generate exactly ${count} multiple-choice questions at ${difficulty} difficulty. Return ONLY this JSON:
{"quiz":[{"id":1,"question":"Question text here?","options":["A) First option","B) Second option","C) Third option","D) Fourth option"],"answer":"A","explanation":"Why A is correct","topic":"topic tag"}]}
The answer field must be exactly one of: A, B, C, or D.

NOTES:
${notes.substring(0, 5000)}`
    );
    res.json({ success: true, data: parseJSON(raw) });
  } catch (e) { sendError(res, e.message); }
});

// ── Doubt Solver ──────────────────────────────────
app.post("/api/doubt", async (req, res) => {
  try {
    const { question, context = "" } = req.body;
    if (!question || !question.trim()) return sendError(res, "Please enter a question.", 400);
    const raw = await ask(
      "You are a friendly, expert college tutor. You MUST return ONLY valid JSON with no markdown.",
      `Answer this student question thoroughly. Return ONLY this JSON:
{"answer":"Detailed explanation in plain language","keyInsight":"The single most important thing to remember","example":"A concrete real-world example, or null if not applicable","steps":["Step 1","Step 2","Step 3"],"relatedTopics":["related topic 1","related topic 2","related topic 3"]}
${context ? `Context from student notes: ${context.substring(0, 500)}\n` : ""}
Question: ${question}`
    );
    res.json({ success: true, data: parseJSON(raw) });
  } catch (e) { sendError(res, e.message); }
});

// ── Mind Map ──────────────────────────────────────
app.post("/api/mindmap", async (req, res) => {
  try {
    const { notes } = req.body;
    if (!notes || !notes.trim()) return sendError(res, "Please provide notes.", 400);
    const raw = await ask(
      "You are an expert mind map creator. You MUST return ONLY valid JSON with no markdown.",
      `Create a detailed mind map from these notes. Return ONLY this JSON:
{"center":"Main Topic (2-4 words max)","branches":[{"label":"Branch Name","color":"#f0a500","icon":"📌","nodes":[{"text":"subtopic name","detail":"one line detail"}]}]}
Rules:
- Exactly 5 or 6 branches
- Each branch has 3 to 4 nodes
- Use these colors in order: #f0a500, #4d9fff, #22c55e, #a78bfa, #ef4444, #06b6d4
- Use a relevant emoji for each branch icon

NOTES:
${notes.substring(0, 5000)}`, 2000
    );
    res.json({ success: true, data: parseJSON(raw) });
  } catch (e) { sendError(res, e.message); }
});

// ── Study Planner ─────────────────────────────────
app.post("/api/planner", async (req, res) => {
  try {
    const { notes, subject = "General Study", days = 7, hoursPerDay = 2 } = req.body;
    if (!notes || !notes.trim()) return sendError(res, "Please provide notes.", 400);
    const raw = await ask(
      "You are an expert study planner. You MUST return ONLY valid JSON with no markdown.",
      `Create a ${days}-day study plan for "${subject}" with ${hoursPerDay} hours per day. Return ONLY this JSON:
{"subject":"Subject Name","totalHours":${days * hoursPerDay},"plan":[{"day":"Monday","date":"Day 1","focus":"Main focus topic","tasks":["Specific task 1","Specific task 2","Specific task 3"],"duration":"${hoursPerDay} hours","priority":"high","method":"Pomodoro"}],"tips":["Tip 1","Tip 2","Tip 3"]}
Priority must be one of: high, medium, low. Method must be one of: Pomodoro, Reading, Practice, Review, Writing.
Generate exactly ${days} days in the plan array.

NOTES:
${notes.substring(0, 4000)}`, 3000
    );
    res.json({ success: true, data: parseJSON(raw) });
  } catch (e) { sendError(res, e.message); }
});

// ── Vocabulary ────────────────────────────────────
app.post("/api/vocab", async (req, res) => {
  try {
    const { notes } = req.body;
    if (!notes || !notes.trim()) return sendError(res, "Please provide notes.", 400);
    const raw = await ask(
      "You are an expert vocabulary teacher. You MUST return ONLY valid JSON with no markdown.",
      `Extract 10 to 12 key vocabulary terms from these notes. Return ONLY this JSON:
{"vocab":[{"term":"Word","pronunciation":"prə-NUN-see-AY-shən","partOfSpeech":"noun","definition":"Clear definition","example":"Example sentence using the word naturally","tip":"Memory trick or mnemonic","difficulty":"basic","related":["synonym","related word"]}]}
Difficulty must be one of: basic, intermediate, advanced. partOfSpeech must be one of: noun, verb, adjective, adverb, other.

NOTES:
${notes.substring(0, 5000)}`, 2500
    );
    res.json({ success: true, data: parseJSON(raw) });
  } catch (e) { sendError(res, e.message); }
});

// ── Fill in the Blank ─────────────────────────────
app.post("/api/fillblank", async (req, res) => {
  try {
    const { notes, count = 10 } = req.body;
    if (!notes || !notes.trim()) return sendError(res, "Please provide notes.", 400);
    const raw = await ask(
      "You are an expert at creating cloze deletion exercises. You MUST return ONLY valid JSON with no markdown.",
      `Generate exactly ${count} fill-in-the-blank exercises from these notes. Replace key terms with _____. Return ONLY this JSON:
{"exercises":[{"id":1,"sentence":"The _____ is the powerhouse of the cell.","answer":"mitochondria","hint":"Think energy production","context":"Biology - Cell Structure","difficulty":"easy"}]}
Difficulty must be one of: easy, medium, hard. The answer should be a single word or short phrase.

NOTES:
${notes.substring(0, 5000)}`
    );
    res.json({ success: true, data: parseJSON(raw) });
  } catch (e) { sendError(res, e.message); }
});

// ── AI Chat ───────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [], context = "" } = req.body;
    if (!message || !message.trim()) return sendError(res, "Please enter a message.", 400);
    if (!groq) throw new Error("Groq SDK not installed.");
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "your_groq_api_key_here") {
      throw new Error("GROQ_API_KEY not set.");
    }
    const messages = [
      {
        role: "system",
        content: `You are StudyAI, a friendly and knowledgeable study assistant for college students. 
You help with concepts, answer questions, explain topics clearly, and guide learning. 
Be concise, friendly, and use examples. Keep responses under 200 words unless asked for detail.
${context ? `The student's current notes context: ${context.substring(0, 800)}` : ""}`
      },
      ...history.slice(-8).map(h => ({ role: h.role, content: h.content })),
      { role: "user", content: message }
    ];
    const completion = await groq.chat.completions.create({ model: MODEL, max_tokens: 512, messages });
    res.json({ success: true, reply: completion.choices[0].message.content });
  } catch (e) { sendError(res, e.message); }
});

// ── Serve Frontend ────────────────────────────────
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "index.html")));  // ✅ FIXED: was path.join(__dirname, "public", "index.html")

// ── Start ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║         StudyAI Pro — v3.0.0             ║");
  console.log(`║   Running → http://localhost:${PORT}          ║`);
  console.log("║   Engine  → Groq (llama-3.3-70b)         ║");
  console.log("╚══════════════════════════════════════════╝\n");
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "your_groq_api_key_here") {
    console.warn("⚠️  GROQ_API_KEY not set! Get your free key at https://console.groq.com\n");
  }
});
