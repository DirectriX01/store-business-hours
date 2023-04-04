# Store Open Hours Calculation

In this project we are calculating the inactive/active hours of a store based on timestamps of the store's activity.

## Steps to run the project

### Using Docker

1. Clone the repository
2. Run `docker build . -t <your username>/node-web-app` in the root directory of the project
3. Run `docker run -p 49160:8080 -d <your username>/node-web-app` to get into the container

### Without Docker

1. Clone the repository
2. Run `npm install` in the root directory of the project
3. Run `npm start` to start the server

## API

The API has two endpoints:

1.  trigger_report
2.  get_report

## Algorithm

The aglorithm is based on the following assumptions, and has been explained in `utils/reportAlgo.js`
