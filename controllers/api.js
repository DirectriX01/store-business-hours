const StoreHours = require('../models/storeHours'),
    StoreStatus = require('../models/storeStatus'),
    StoreTimezone = require('../models/storeTimezone');

module.exports = {
    async createReport(req,res){
        // report creation started, not completed
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json({message: 'Report created', status: 'started', timestamp: new Date()});
        return;
    },
    reportStatus(req,res){
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json({message: 'Report status'});
    }
};