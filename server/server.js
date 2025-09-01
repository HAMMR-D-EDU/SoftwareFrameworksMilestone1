const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());           // allow :4200 → :3000 during dev
app.use(express.json());   // parse JSON bodies

// Health check (quick test)
app.get('/health', (req, res) => res.json({ ok: true }));

// Simple API route
app.post('/api/echo', (req, res) => {
  // echoes back whatever JSON you sent
  res.status(200).json({ youSent: req.body });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Express listening on http://localhost:${PORT}`));