const moment = require('moment-timezone');
const StoreHours = require('../models/storeHours');
const StoreStatus = require('../models/storeStatus');
const StoreTimezone = require('../models/storeTimezone');
const StoreReport = require('../models/storeReport');
const Report = require('../models/report');

const self = (module.exports = {
  async reportGeneration(store) {
    try {
      const storeId = store.store_id;
      const p1 = StoreTimezone.find({ store_id: storeId }).exec();
      const p2 = StoreHours.find({ store_id: storeId }, { start_time_local: 1, end_time_local: 1, day: 1 }).exec();
      const p3 = StoreReport.findOne({ store_id: storeId }).exec();
      const [storeTimezone, storeHours, storeReport] = await Promise.all([p1, p2, p3]);

      if (storeTimezone.length === 0) {
        storeTimezone.push({ timezone_str: 'America/Chicago' });
      }
      if (!storeReport) {
        throw new Error('Store report not found');
      }

      let hourFlag = false;
      let weekFlag = false;
      let dayFlag = false;
      const queryString = { store_id: storeId };

      // find the last report generated time
      const lastReportTime = moment(storeReport.last_updated).tz(storeTimezone[0].timezone_str);
      const now = moment().tz(storeTimezone[0].timezone_str);

      const startOfLastWeek = now.clone().startOf('week').subtract(1, 'week');
      const endOfLastWeek = now.clone().startOf('week').subtract(1, 'second');

      const startOfLastDay = now.clone().startOf('day').subtract(1, 'day');
      const endOfLastDay = now.clone().startOf('day').subtract(1, 'second');

      const beginningOfLastHour = now.clone().startOf('hour').subtract(1, 'hour');
      const endOfLastHour = now.clone().startOf('hour').subtract(1, 'second');

      // last week report comparison
      if (lastReportTime.diff(endOfLastWeek, 'days') >= 7) weekFlag = true;

      // find if last report generated
      if (lastReportTime.diff(endOfLastDay, 'days') >= 1) dayFlag = true;

      if (lastReportTime.diff(endOfLastHour, 'hours') >= 1) hourFlag = true;

      if (weekFlag) {
        queryString.timestamp_utc = { $gte: startOfLastWeek.toDate() };
      } else if (dayFlag) {
        queryString.timestamp_utc = { $gte: startOfLastDay.toDate() };
      } else if (hourFlag) {
        queryString.timestamp_utc = { $gte: lastReportTime.toDate() };
      }
      const storeStatus = await StoreStatus.find(queryString).sort({ timestamp_utc: 1 }).exec();
      const storeHoursArr = new Array(7).fill(null).map(() => []);

      for (let i = 0; i < storeHours.length; i += 1) {
        storeHoursArr[storeHours[i].day].push(storeHours[i]);
      }

      storeHoursArr.forEach((arr) => {
        arr.sort((a, b) => a.start_time_local.localeCompare(b.start_time_local));
      });

      let setDay = 0;
      let totalWeekUpTime = 0;
      let totalWeekDownTime = 0;
      let totalDayUpTime = 0;
      let totalDayDownTime = 0;
      let totalHourUpTime = 0;
      let lastDayTime = 0;
      let lastTimeStamp = moment('00:00:00', 'HH:mm:ss');
      let totalHourDownTime = 0;
      let lastTimeStatus = '';
      let localUpTime = 0;
      let localDownTime = 0;
      let i = 0;
      let localStoreTime = moment(storeStatus[i].timestamp_utc).tz(storeTimezone[0].timezone_str);
      if (weekFlag) {
        while (i < storeStatus.length && localStoreTime <= endOfLastWeek) {
          localStoreTime = moment(storeStatus[i].timestamp_utc).tz(storeTimezone[0].timezone_str);
          if (i !== 0 && localStoreTime.weekday() !== setDay) {
            if (localUpTime === 0 && localDownTime === 0) {
              for (let j = 0; j < storeHoursArr[setDay].length; j += 1) {
                const start = moment(storeHoursArr[setDay][j].start_local_time, 'HH:mm:ss');
                const end = moment(storeHoursArr[setDay][j].end_local_time, 'HH:mm:ss');
                localUpTime += end.diff(start, 'seconds');
              }
            }
            totalWeekUpTime += localUpTime;
            totalWeekDownTime += localDownTime;
            lastDayTime = [localUpTime, localDownTime];
            localUpTime = localDownTime = 0;
            setDay = localStoreTime.weekday();
            lastTimeStamp = moment('00:00:00', 'HH:mm:ss');
            lastTimeStatus = '';
          } else {
            const timeStampInHours = localStoreTime.format('HH:mm:ss');
            for (let j = 0; j < storeHoursArr[setDay].length; j += 1) {
              let start = moment(storeHoursArr[setDay][j].start_local_time, 'HH:mm:ss');
              const end = moment(storeHoursArr[setDay][j].end_local_time, 'HH:mm:ss');
              const isInBetween = timeStampInHours.isBetween(start, end);
              if (isInBetween) {
                if (lastTimeStamp.isBetween(start, end, '()', '[]')) {
                  start = lastTimeStamp;
                  if (lastTimeStatus === 'active') {
                    localUpTime += timeStampInHours.diff(start, 'seconds');
                  } else {
                    localDownTime += timeStampInHours.diff(start, 'seconds');
                  }
                } else if (localStoreTime[i] === 'active') {
                  localUpTime += localStoreTime.diff(start, 'seconds');
                } else {
                  localDownTime += localStoreTime.diff(start, 'seconds');
                }
                // find the remaining time of last interval
                if (!lastTimeStamp.isSame(moment('00:00:00', 'HH:mm:ss'))) {
                  const previousEnd = moment(storeHoursArr[setDay][j - 1].end_local_time, 'HH:mm:ss');
                  if (lastTimeStatus === 'active') {
                    localUpTime += previousEnd.diff(lastTimeStamp, 'seconds');
                  } else {
                    localDownTime += previousEnd.diff(lastTimeStamp, 'seconds');
                  }
                }
                lastTimeStamp = localStoreTime;
                lastTimeStatus = storeStatus[i].status;
              }
            }
          }
          i++;
        }
      }
      if (dayFlag) {
        // check if endoflastweek is same day as start of last day
        if (endOfLastWeek.startOf('day').isSame(endOfLastDay.startOf('day'))) {
          [totalDayUpTime, totalDayDownTime] = lastDayTime;
        } else {
          setDay = endOfLastDay.weekday();
          localUpTime = localDownTime = 0;
          lastTimeStamp = moment('00:00:00', 'HH:mm:ss');
          lastTimeStatus = '';
          localStoreTime = moment(storeStatus[i].timestamp_utc).tz(storeTimezone[0].timezone_str);
          while (i < storeStatus.length && localStoreTime <= endOfLastDay) {
            localStoreTime = moment(storeStatus[i].timestamp_utc).tz(storeTimezone[0].timezone_str);
            const timeStampInHours = localStoreTime.format('HH:mm:ss');
            for (let j = 0; j < storeHoursArr[setDay].length; j += 1) {
              let start = moment(storeHoursArr[setDay][j].start_local_time, 'HH:mm:ss');
              const end = moment(storeHoursArr[setDay][j].end_local_time, 'HH:mm:ss');
              const isInBetween = timeStampInHours.isBetween(start, end);
              if (isInBetween) {
                if (lastTimeStamp.isBetween(start, end, '()', '[]')) {
                  start = lastTimeStamp;
                  if (lastTimeStatus === 'active') {
                    localUpTime += timeStampInHours.diff(start, 'seconds');
                  } else {
                    localDownTime += timeStampInHours.diff(start, 'seconds');
                  }
                } else if (localStoreTime[i] === 'active') {
                  localUpTime += localStoreTime.diff(start, 'seconds');
                } else {
                  localDownTime += localStoreTime.diff(start, 'seconds');
                }
                if (!lastTimeStamp.isSame(moment('00:00:00', 'HH:mm:ss'))) {
                  const previousEnd = moment(storeHoursArr[setDay][j - 1].end_local_time, 'HH:mm:ss');
                  if (lastTimeStatus === 'active') {
                    localUpTime += previousEnd.diff(lastTimeStamp, 'seconds');
                  } else {
                    localDownTime += previousEnd.diff(lastTimeStamp, 'seconds');
                  }
                }
                lastTimeStamp = localStoreTime;
                lastTimeStatus = storeStatus[i].status;
              }
            }
            ++i;
          }
          totalDayUpTime = localUpTime;
          totalDayDownTime = localDownTime;
        }
      }
      if (hourFlag) {
        // use binary search to find lower bound of beginningOfLastHour
        let lowerBound = 0;
        let upperBound = storeStatus.length - 1;
        let mid = 0;
        while (lowerBound <= upperBound) {
          mid = Math.floor((lowerBound + upperBound) / 2);
          if (
            moment(storeStatus[mid].timestamp_utc).tz(storeTimezone[0].timezone_str).isSameOrBefore(beginningOfLastHour)
          ) {
            lowerBound = mid + 1;
          } else {
            upperBound = mid - 1;
          }
        }
        i = lowerBound;
        localStoreTime = moment(storeStatus[i].timestamp_utc).tz(storeTimezone[0].timezone_str);
        setDay = beginningOfLastHour.weekday();
        localUpTime = localDownTime = 0;
        lastTimeStamp = moment('00:00:00', 'HH:mm:ss');
        lastTimeStatus = '';
        while (i < storeStatus.length && localStoreTime <= endOfLastHour) {
          localStoreTime = moment(storeStatus[i].timestamp_utc).tz(storeTimezone[0].timezone_str);
          const timeStampInHours = localStoreTime.format('HH:mm:ss');
          for (let j = 0; j < storeHoursArr[setDay].length; j += 1) {
            let start = moment(storeHoursArr[setDay][j].start_local_time, 'HH:mm:ss');
            const end = moment(storeHoursArr[setDay][j].end_local_time, 'HH:mm:ss');
            const isInBetween = timeStampInHours.isBetween(start, end);
            if (isInBetween) {
              if (lastTimeStamp.isBetween(start, end, '()', '[]')) {
                start = lastTimeStamp;
                if (lastTimeStatus === 'active') {
                  localUpTime += timeStampInHours.diff(start, 'seconds');
                } else {
                  localDownTime += timeStampInHours.diff(start, 'seconds');
                }
              } else if (localStoreTime[i] === 'active') {
                localUpTime += localStoreTime.diff(start, 'seconds');
              } else {
                localDownTime += localStoreTime.diff(start, 'seconds');
              }
              if (!lastTimeStamp.isSame(moment('00:00:00', 'HH:mm:ss'))) {
                const previousEnd = moment(storeHoursArr[setDay][j - 1].end_local_time, 'HH:mm:ss');
                if (lastTimeStatus === 'active') {
                  localUpTime += previousEnd.diff(lastTimeStamp, 'seconds');
                } else {
                  localDownTime += previousEnd.diff(lastTimeStamp, 'seconds');
                }
              }
              lastTimeStamp = localStoreTime;
              lastTimeStatus = storeStatus[i].status;
            }
          }
          ++i;
        }
        totalHourUpTime = localUpTime;
        totalHourDownTime = localDownTime;
      }

      /// return the total uptime and downtime for bulk write
      const changeQuery = {
        updateOne: { filter: { store_id: storeId }, update: { $set: {} } },
      };
      if (!weekFlag && !dayFlag && !hourFlag) {
        return {};
      }
      const updateQuery = changeQuery.updateOne;
      if (hourFlag) {
        updateQuery.update.$set.last_hour_up_time = Math.round(totalHourUpTime / 60);
        updateQuery.update.$set.last_hour_down_time = Math.round(totalHourDownTime / 60);
      }
      if (dayFlag) {
        updateQuery.update.$set.last_day_up_time = Math.round(totalDayUpTime / 3600);
        updateQuery.update.$set.last_day_down_time = Math.round(totalDayDownTime / 3600);
      }
      if (weekFlag) {
        updateQuery.update.$set.last_week_up_time = Math.round(totalWeekUpTime / 3600);
        updateQuery.update.$set.last_week_down_time = Math.round(totalWeekDownTime / 3600);
      }
      updateQuery.update.$set.last_updated = new Date();
      console.log('updateQuery', updateQuery);
      return changeQuery;
    } catch (err) {
      console.log(err);
      // throw err;
    }
  },
  async reportGenerationBatch(batch) {
    try {
      const batchUpdates = [];
      for (let i = 0; i < batch.length; i++) {
        const singleUpdate = await self.reportGeneration(batch[i]);
        if (singleUpdate && Object.keys(singleUpdate).length > 0) {
          batchUpdates.push(singleUpdate);
        }
      }
      await StoreReport.bulkWrite(batchUpdates);
    } catch (err) {
      console.log(err);
      // throw err;
    }
  },
  async reportGenerationAll(report) {
    const start = new Date();
    try {
      const storeIds = await StoreReport.find({}, { store_id: 1 }).limit(1);
      // batch size of 1000
      const batchSize = 1000;
      const allPromises = [];
      const batchCount = Math.ceil(storeIds.length / batchSize);
      for (let i = 0; i < batchCount; i++) {
        const batch = storeIds.slice(i * batchSize, (i + 1) * batchSize);
        allPromises.push(self.reportGenerationBatch(batch));
      }
      await Promise.all(allPromises).then(async () => {
        const end = new Date();
        console.log('Time taken: ', end - start, ' ms');
        await Report.updateOne({ _id: report._id }, { $set: { status: 'completed' } });
      });
    } catch (err) {
      console.log(err);
      // throw err;
    }
  },
});
