const { createReport, reportStatus } = require('../controllers/api'),
        express = require('express'),
        router = express.Router();

router.get('/trigger_report', createReport);

router.get('/get_report', reportStatus);

module.exports = router;