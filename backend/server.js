const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Stray Dog Management API Running!' });
});

// Routes
app.use('/api/dogs', require('./src/routes/dogs'));

async function start() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dogster';
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected');
  } catch (err) {
    console.warn('MongoDB connection failed, continuing without DB. Set MONGODB_URI to enable.');
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
