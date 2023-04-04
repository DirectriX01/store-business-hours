const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  store_id: { type: String, required: true },
  uptime_last_hour: { type: Number, default: 0 },
  uptime_last_day: { type: Number, default: 0 },
  uptime_last_week: { type: Number, default: 0 },
  downtime_last_hour: { type: Number, default: 0 },
  downtime_last_day: { type: Number, default: 0 },
  downtime_last_week: { type: Number, default: 0 },
  last_updated: { type: Date, default: Date.now },
});

const Report = mongoose.model('StoreReport', reportSchema);

module.exports = Report;
