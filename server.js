'use strict';

const express = require('express')
const app = express();
const cors = require('cors');
const superagent = require('superagent');
app.use(cors());
require('dotenv').config();
const port = process.env.PORT;
const pg = require('pg');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL,   ssl: { rejectUnauthorized: false } });

app.get('/', (req, res) => {
  res.send('Hello World!');
});
app.get('/location', handleLocation);
app.get('/weather', handleWeather);
app.get('/parks', handleParks);
app.use('*', notFoundHandler);



function handleLocation(req, res) {
  let searchQuery = req.query.city;
  try {
    if (searchQuery == '' || searchQuery == undefined) {
      res.status(500).send(handleErrors(500, "Sorry, something went wrong"))
      return;
    }
    getLocationData(searchQuery).then(result => {
      res.status(200).send(result);
    });
  }
  catch (e) {
    res.status(500).send(e);
  }
};

function getLocationData(searchQuery) {
  console.log('areej')
  return client.query(`SELECT * FROM locations WHERE '${searchQuery}' = search_query `).then(data => {
    if (data.rows.length) return {search_query:data.rows[0].search_query,formatted_query:data.rows[0].formatted_query,latitude:data.rows[0].latitude,longitude:data.rows[0].longitude};
    const query = {
      'key': process.env.GEOCODE_API_KEY,
      'q': searchQuery,
      'limit': 1,
      'format': 'json'
    }
    return superagent.get('https://us1.locationiq.com/v1/search.php').query(query)
      .then(result => {
        console.log('areej1')
        let locObj = new CityLocation(searchQuery, result.body[0].display_name, result.body[0].lat, result.body[0].lon)
        return client.query(`INSERT INTO locations(search_query, formatted_query, latitude, longitude) VALUES ($1,$2,$3,$4)`,[searchQuery, result.body[0].display_name, result.body[0].lat, result.body[0].lon]).then(data => {
          return locObj;
        })
      }).catch(error => console.log(error));
  });

};

function CityLocation(search_query, formatted_query, latitude, longitude) {
  this.search_query = search_query;
  this.formatted_query = formatted_query;
  this.latitude = latitude;
  this.longitude = longitude;
};

function handleWeather(req, res) {
  console.log(req.query)
  try {
    getWeatherData(req.query.latitude, req.query.longitude).then(data => {
      res.status(200).send(data);
    })
  }
  catch (e) {
    res.status(500).send(e);
  }
};

function handleParks(req, res) {
  try {
    getParksData(req.query.search_query).then(data => {
      res.status(200).send(data);
    })
  }
  catch (e) {
    res.status(500).send(e);
  }
};

function CityWeather(forecast, time) {
  this.forecast = forecast;
  this.time = time;
};

function getWeatherData(latitude, longitude) {
  const query = {
    'key': process.env.WEATHER_API_KEY,
    'lat': latitude,
    'lon': longitude
  }
  return superagent.get('https://api.weatherbit.io/v2.0/forecast/daily').query(query)
    .then(result => {
      let weatherArr = result.body['data'].map(ele => {
        return new CityWeather(ele.weather.description, new Date(ele.datetime.split(':').splice(0, 1)[0]).toDateString());
      });
      return weatherArr;
    }).catch(error => console.log(error));

};

function getParksData(name) {
  const query = {
    'api_key': process.env.PARKS_API_KEY,
    'q': name
  }
  return superagent.get('https://developer.nps.gov/api/v1/parks').query(query)
    .then(result => {
      let parksArr = result.body['data'].map(ele => {
        return new Park(ele.fullName, Object.values(ele.addresses[0]).join(' '), ele.entranceFees.cost, ele.description, ele.url);
      });
      return parksArr;
    }).catch(error => console.log(error));

};

function handleErrors(status, responseText) {
  return new ErrorMes(status, responseText);
}

function notFoundHandler(request, response) {
  response.status(404).send('huh?');
}

function ErrorMes(status, responseText) {
  this.status = status;
  this.responseText = responseText;
}

function Park(name, address, fee, description, url) {
  this.name = name;
  this.address = address;
  this.fee = fee;
  this.description = description;
  this.url = url;
}

client.connect().then(() => {
  app.listen(port, () => {
    console.log(`app listening at http://localhost:${port}`);
  });
}).catch(e => {
  console.log(e, 'errrrrroooooorrrr')
})