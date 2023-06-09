const express = require('express');

const app = express();
const port = 8080 || process.env.PORT;
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const mongoURI = 'mongodb://localhost:27017/testDB' || process.env.MONGO_URI;

// import routes
const api = require('./routes/api');

app.use('/api', api);

mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    app.listen(port, () => console.log(`Server started on port ${port}`));
  })
  .catch((err) => {
    console.log(err);
  });
