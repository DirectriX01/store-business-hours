const mongoose = require('mongoose');

const storeTimezoneSchema = new mongoose.Schema({
  store_id: { type: String, required: true },
  timezone_str: { type: String, required: true },
});

module.exports = mongoose.model('StoreTimezone', storeTimezoneSchema);
