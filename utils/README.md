## Algorithm

From the data I have following inference/assumptions:

1. Store is either active/inactive
2. Some stores have multiple business hours(different non overlapping intervals) for the same day.
3. The fundamental unit for calculation is seconds.
4. There could timestamps without it being in the business hours.

##### Assumptions

5. A timestamp indicate the beginning of a new status, and the end of the previous status(assumption) within business hours.
6. the timestamps are sorted in ascending order

Since I have timezone calculations, I have heavily relied on `moment-timezone` library, which is a wrapper around `moment` library. I have used `moment-timezone` to convert the timestamps to the timezone of the store, and then calculate the difference between the timestamps.

The variables which were used carry the following information:

```js
setDay : The day of the week for which I are calculating the active/inactive hours.
storeHoursArr : The business hours for the store for the day setDay, which is an array of objects, presorted by start_local_time.
lastTimeStamp : The last timestamp which was in the business hours, by default is set to 00:00:00.
localUpTime : The total active time for the store in seconds.
localDownTime : The total inactive time for the store in seconds.
```

This is the core algorithm for calculating the inactive/active hours of a store:

```js
while (i < storeStatus.length && localStoreTime <= endOfLastHour) {
  // localStoreTime is the timestamp converted to the timezone of the store
  localStoreTime = moment(storeStatus[i].timestamp_utc).tz(storeTimezone[0].timezone_str);
  // locaStoreTime is the timestamp converted to the timezone of the store
  const timeStampInHours = localStoreTime.format('HH:mm:ss');
  for (let j = 0; j < storeHoursArr[setDay].length; j += 1) {
    // start_local_time and end_local_time are the already in HH:mm:ss format, but I are converting them to moment objects
    let start = moment(storeHoursArr[setDay][j].start_local_time, 'HH:mm:ss');
    const end = moment(storeHoursArr[setDay][j].end_local_time, 'HH:mm:ss');
    // Checking if the timestamp is in between the business hours
    const isInBetween = timeStampInHours.isBetween(start, end);
    if (isInBetween) {
        ...
    }
  }
  ++i;
}
```

Going inside the `isInBetween` loop, I have the following conditions:

1. `lastTimeStamp.isBetween(start, end, '()', '[]'` checks if the lastTimeStamp is between the current business hours interval. If it is, then I have to update the start time to the lastTimeStamp, and then calculate the difference between the start and end time, and add it to the localUpTime/localDownTime.

2. - If the `lastTimeStamp` is not between the current business hours interval, then it is the case where I have either began a new business hours interval. This new interval could be either the first or some other interval.
   - If its some other interval then I have to calculate the difference between the `lastTimeStamp` and the end of the previous interval, and add it to the `localUpTime`/`localDownTime`.
   - If its the first interval, then I have to calculate the difference between the `lastTimeStamp` and the start of the current interval, and add it to the `localUpTime`/`localDownTime`.
   - Since every `lastTimeStamp` begins with the value `00:00:00`, it can serve as a flag to check if its the first interval or not.

3. At the end of each timestamp within the business hours, I update `lastTimeStamp` to the current timestamp, and `lastTimeStatus` to the current status.

```js
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
```

---

I have used this algorithm to calculate the active/inactive hours for each store, and then I have used the following query to update the database:

To optimise the process, I have three flags

- `hourFlag` : To check if difference between the current time and the previous Timestamps of report generation is less than an hour
- `dayFlag` : To check if the current timestamp and end of last day dont have a difference of more than 24 hours
- `weekFlag` : To check if the current timestamp and end of last week dont have a difference of more than 7 days

Calculation is done only for the respective flag.

Apart from this, I have used the following process to update the database:

1. Divide the number of stores in batches of 1000.
2. For each batch, I have used the following query to update the database:

```js
// mongoose bulk write
const changeQuery = {
  updateOne: { filter: { store_id: storeId }, update: { $set: {} } },
};

if (flag) {
  updateQuery.update.$set.last_day_up_time = Math.round(totalDayUpTime / 3600);
  updateQuery.update.$set.last_day_down_time = Math.round(totalDayDownTime / 3600);
}
...for other flags

Back in the `reportGenerationBatch` function, I have used the following query to update the database:

StoreReport.bulkWrite(batchUpdates);
```

By this, I have been able to optimise the process of updating the database, and also the process of calculating the active/inactive hours.
