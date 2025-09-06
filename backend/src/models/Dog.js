const mongoose = require('mongoose');

const DogSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    description: { type: String, trim: true },
    breed: { type: String, trim: true },
    color: { type: String, trim: true },
    ageApprox: { type: Number, min: 0 },
    gender: { type: String, enum: ['male', 'female', 'unknown'], default: 'unknown' },
    location: {
      lat: { type: Number },
      lng: { type: Number },
      address: { type: String, trim: true },
    },
    photos: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Dog', DogSchema);
