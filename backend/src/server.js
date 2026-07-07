require('dotenv').config();
const express = require('express');
const cors = require('cors');
const importRouter = require('./routes/import');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'groweasy-csv-importer-backend' }));

app.use('/api', importRouter);

// Fallback 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => {
  console.log(`GrowEasy CSV importer backend listening on port ${PORT}`);
});
