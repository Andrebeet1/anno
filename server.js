import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import pkg from 'cohere-ai'; // ✅ Import par défaut
const { CohereClient } = pkg; // ✅ Déstructuration

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());

const notes = [];

async function generateNote() {
  const prompt = `Crée une note spirituelle, un verset biblique inspiré, une prière et une citation motivante. Format JSON.`;
  const res = await cohere.generate({
    model: "command-r-plus",
    prompt: prompt,
    maxTokens: 300,
    temperature: 0.8,
  });

  const text = res.generations[0].text;

  try {
    const note = JSON.parse(text);
    return note;
  } catch {
    // fallback si le JSON est invalide
    return {
      verset: "Jean 3:16 - Car Dieu a tant aimé le monde...",
      prière: "Seigneur, remplis-moi de paix et de lumière.",
      citation: "Chaque jour est un nouveau don de Dieu.",
      note: "Aujourd’hui, sois un canal de bénédictions pour les autres.",
    };
  }
}

app.get('/', async (req, res) => {
  const note = await generateNote();
  notes.push(note);
  res.render('index', { noteIndex: 0, note });
});

app.post('/note', async (req, res) => {
  const { direction, index } = req.body;
  let noteIndex = index;

  if (direction === 'next') {
    if (!notes[noteIndex + 1]) {
      const note = await generateNote();
      notes.push(note);
    }
    noteIndex++;
  } else if (direction === 'prev' && noteIndex > 0) {
    noteIndex--;
  }

  res.json({ note: notes[noteIndex], index: noteIndex });
});

app.listen(port, () => {
  console.log(`App running on http://localhost:${port}`);
});
