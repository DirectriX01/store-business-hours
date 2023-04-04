const json2csv = require('json2csv').parse;
const { reportGenerationAll } = require('../utils/reportAlgo');
const Report = require('../models/report');
const StoreReport = require('../models/storeReport');

module.exports = {
  async createReport(req, res) {
    // create a new report
    const report = new Report({
      status: 'pending',
    });

    await report.save();
    res.status(200).json({
      message: 'Report generation started',
      report_id: report.report_id,
    });
    // 1s delay to simulate report generation
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // call report generation algo
    await reportGenerationAll(report);
  },
  async reportStatus(req, res) {
    // check report status
    try {
      const report = await Report.findOne({
        report_id: req.params.report_id,
      }).exec();
      if (!report) {
        return res.status(404).json({
          message: 'Report not found',
        });
      }
      if (report.status === 'pending') {
        return res.status(200).json({
          message: 'Report generation in progress',
        });
      }
      // get all store reports and send as csv file
      const storeReports = await StoreReport.find({}).exec();
      const fields = [
        'store_id',
        'uptime_last_hour',
        'uptime_last_day',
        'uptime_last_week',
        'downtime_last_hour',
        'downtime_last_day',
        'downtime_last_week',
      ];
      const opts = { fields };
      const csv = json2csv(storeReports, opts);
      res.setHeader('Content-disposition', 'attachment; filename=report.csv');
      // send json response too
      return res.send(csv);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error generating report' });
    }
  },
};
