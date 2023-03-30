const mongoose = require('mongoose');

const storeStatusSchema = new mongoose.Schema({
    store_id : { type: String, required: true },
    status : { type: String, required: true },
    timestamp_utc : { type: Date, required: true}
});


module.exports = mongoose.model('StoreStatus', storeStatusSchema);
