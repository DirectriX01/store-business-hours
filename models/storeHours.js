const mongoose = require('mongoose');

const storeOpenHours = new mongoose.Schema({
  store_id: { type: String, required: true },
  start_time_local: { type: String, required: true },
  end_time_local: { type: String, required: true },
  day: { type: Number, required: true },
});

module.exports = mongoose.model('StoreOpenHours', storeOpenHours);
