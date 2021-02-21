'use strict';

const express = require('express')
const app = express();
const cors = require('cors');
app.use(cors());
require('dotenv').config();
const port = process.env.PORT;

app.get('/', (req, res) => {
  res.send('Hello World!');
});
app.get('/location', handleLocation);
app.get('/weather', handleWeather);

function handleLocation(req,res){
  let searchQuery = req.query.city;
  let locObj = getLocationData(searchQuery);
  res.status(200).send(locObj);
};

function getLocationData(searchQuery){
  let locationData = require('./data/location.json');
  let longitude = locationData[0].lon;
  let latitude = locationData[0].lat;
  let formatted_query = locationData[0].display_name;
  let resObj = new CityLocation (searchQuery,formatted_query,latitude,longitude)
  return resObj;
};

function CityLocation (search_query,formatted_query,latitude,longitude){
  this.search_query = search_query;
  this.formatted_query = formatted_query;
  this.latitude = latitude;
  this.longitude = longitude;
};

function handleWeather(req,res){
  let weatherObj = getWeatherData();
  res.status(200).send(weatherObj);
};

function CityWeather (forecast,time){
  this.forecast = forecast;
  this.time = time;
};

function getWeatherData(){
  let weatherArr = [];
  let weatherData = require('./data/weather.json');
  console.log(weatherData);
  weatherData['data'].forEach(ele => {
    weatherArr.push(new CityWeather(ele.weather.description, new Date(ele.datetime).toDateString()));
  });

  return weatherArr;
};

app.listen(port, () => {
  console.log(`app listening at http://localhost:${port}`);
});