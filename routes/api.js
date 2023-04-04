const express = require('express');
const { createReport, reportStatus } = require('../controllers/api');

const router = express.Router();

router.get('/trigger_report', createReport);

router.get('/get_report/:report_id', reportStatus);

module.exports = router;
