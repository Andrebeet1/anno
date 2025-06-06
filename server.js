import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());

const notes = [];

async function generateNote() {
  const prompt = `Fournis uniquement un tableau JSON contenant exactement 1 à 2 objets avec les champs suivants :
[
  {
    "verset": "Un verset biblique inspirant avec La référence biblique en grand à la ligne  , sans parenthèses ni guillemets à l’intérieur",
    "prière": "Une prière simple et inspirée",
    "citation": "Une citation motivante sans guillemets ni auteur",
    "note": "Une courte réflexion spirituelle du jour"
  }
]`;

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: "llama3-8b-8192", // ou "llama3-70b-8192", adapte selon ton plan Groq
        messages: [
          { role: "system", content: "Tu es un assistant spirituel bienveillant." },
          { role: "user", content: prompt }
        ],
        max_tokens: 600,
        temperature: 0.8,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Le texte Groq (OpenAI compatible) se trouve ici :
    const raw = response.data?.choices?.[0]?.message?.content?.trim();
    if (!raw) throw new Error("Réponse vide ou invalide de l'API");

    const start = raw.indexOf('[');
    const end = raw.lastIndexOf(']');
    if (start === -1 || end === -1) throw new Error("Format JSON non détecté");

    const cleanText = raw.substring(start, end + 1);
    const json = JSON.parse(cleanText);

    return json;
  } catch (error) {
    console.error("❌ Erreur API ou parsing :", error.message);
    return getDefaultNote();
  }
}

function getDefaultNote() {
  return [
    {
      verset: "Jean 3:16 - Car Dieu a tant aimé le monde...",
      prière: "Seigneur, remplis-moi de paix et de lumière.",
      citation: "Chaque jour est un nouveau don de Dieu.",
      note: "Aujourd’hui, sois un canal de bénédictions pour les autres."
    }
  ];
}

app.get('/', async (req, res) => {
  const noteSet = await generateNote();
  const note = noteSet[0];
  notes.push(note);
  res.render('index', { noteIndex: 0, note });
});

app.post('/note', async (req, res) => {
  const { direction, index } = req.body;
  let noteIndex = index;

  if (direction === 'next') {
    if (!notes[noteIndex + 1]) {
      const newNotes = await generateNote();
      notes.push(newNotes[0]);
    }
    noteIndex++;
  } else if (direction === 'prev' && noteIndex > 0) {
    noteIndex--;
  }

  res.json({ note: notes[noteIndex], index: noteIndex });
});

// ✅ Important : écoute sur 0.0.0.0 pour Render
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ App running on http://0.0.0.0:${port}`);
});