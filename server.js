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
  const prompt = `Crée une note spirituelle au format JSON contenant uniquement les champs suivants, sans texte avant ni après :
  {
    verset: "un verset biblique inspirant, sans parenthèses ni citations supplémentaires",
    prière: "une courte prière",
    citation: "une citation motivante sans guillemets ni nom d’auteur à l’intérieur",
    note: "une courte réflexion spirituelle du jour"
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

    console.log("Texte brut retourné par l'API:", text);

    // Force correction basique du JSON
    if (!text.startsWith('{')) text = '{' + text;
    if (!text.endsWith('}')) text += '}';

    // Supprime les caractères invalides ou noms d’auteurs entre guillemets mal fermés
    text = text.replace(/,\s*("[^"]+":\s*".+?)["“”]?[.,)]?/g, '$1"'); // tente de fermer correctement

    try {
      const note = JSON.parse(text);
      return note;
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
