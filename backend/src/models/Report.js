const mongoose = require('mongoose');

const ClassificationSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    score: { type: Number, required: true },
  },
  { _id: false }
);

const SentimentSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    score: { type: Number, required: true },
  },
  { _id: false }
);

const EntitySchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    text: { type: String, required: true },
    score: { type: Number, default: 0 },
  },
  { _id: false }
);

const LocationHintSchema = new mongoose.Schema(
  {
    zone: { type: String },
    area: { type: String },
  },
  { _id: false }
);

const ReportSchema = new mongoose.Schema(
  {
    raw_text: { type: String, required: true },
    translated_text: { type: String },
    classification: { type: [ClassificationSchema], default: [] },
    sentiment: { type: SentimentSchema },
    urgency_score: { type: Number, default: 0 },
    entities: { type: [EntitySchema], default: [] },
    summary: { type: String },
    embedding: { type: [Number], required: true },
    location_hint: { type: LocationHintSchema },
    duplicate_of: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', default: null },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('Report', ReportSchema);
