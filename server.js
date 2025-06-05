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
  const prompt = `Crée une note spirituelle strictement au format JSON sans introduction, sans balises, sans texte autour. Exemple :
{
  "verset": "un verset biblique inspirant",
  "prière": "une courte prière",
  "citation": "une citation motivante",
  "note": "une courte réflexion spirituelle du jour"
}`;

  try {
    const response = await axios.post(
      'https://api.cohere.ai/v1/generate',
      {
        model: "command-r-plus",
        prompt: prompt,
        max_tokens: 300,
        temperature: 0.8,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let text = response.data.generations[0].text.trim();

    console.log("Texte brut retourné par l'API:", text); // 🔍 Débogage

    // Nettoyage de texte pour retirer les balises ```json ou autres décorations
    if (text.startsWith("```")) {
      text = text.replace(/```json|```/gi, '').trim();
    }

    // Supprimer lignes introductives éventuelles (garde seulement JSON pur)
    const lines = text.split('\n');
    const jsonStartIndex = lines.findIndex(line => line.trim().startsWith('{'));
    if (jsonStartIndex > 0) {
      lines.splice(0, jsonStartIndex);
      text = lines.join('\n');
    }

    try {
      const parsed = JSON.parse(text);
      return parsed;
    } catch (e) {
      console.error("❌ Erreur JSON parse:", e.message);
      return getDefaultNote();
    }

  } catch (error) {
    console.error("❌ Erreur Cohere API:", error.message);
    return getDefaultNote();
  }
}

function getDefaultNote() {
  return {
    verset: "Jean 3:16 - Car Dieu a tant aimé le monde...",
    prière: "Seigneur, remplis-moi de paix et de lumière.",
    citation: "Chaque jour est un nouveau don de Dieu.",
    note: "Aujourd’hui, sois un canal de bénédictions pour les autres.",
  };
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
  console.log(`✅ App running on http://localhost:${port}`);
});
