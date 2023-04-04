const mongoose = require('mongoose');
const { customAlphabet } = require('nanoid');

const nanoid = customAlphabet('0123456789ASDFGHJKLQWERTYUIOPZXCVBNMqwertyuiopasdfghjklzxcvbnm', 10);

const ReportSchema = new mongoose.Schema({
  report_id: {
    type: String,
    default: () => nanoid(),
    index: true,
    unique: true,
  },
  date_generated: { type: Date, default: Date.now },
  status: { type: String, required: true },
});

module.exports = mongoose.model('Report', ReportSchema);
