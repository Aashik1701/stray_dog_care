const express = require('express');
const Dog = require('../models/Dog');

const router = express.Router();

// Create dog (MVP: name + location)
router.post('/', async (req, res) => {
  try {
    const { name, location } = req.body;
    const dog = await Dog.create({ name, location });
    res.status(201).json(dog);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to create dog' });
  }
});

// List dogs
router.get('/', async (_req, res) => {
  try {
    const dogs = await Dog.find().sort({ createdAt: -1 }).limit(50);
    res.json(dogs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});

module.exports = router;
