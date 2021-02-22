'use strict';

const express = require('express')
const app = express();
const cors = require('cors');
const superagent = require('superagent')
app.use(cors());
require('dotenv').config();
const port = process.env.PORT;

app.get('/', (req, res) => {
  res.send('Hello World!');
});
app.get('/location', handleLocation);
app.get('/weather', handleWeather);
app.get('/parks', handleParks);
app.use('*', notFoundHandler);



function handleLocation(req,res){
  let searchQuery = req.query.city;
  try{
    if (searchQuery == ''|| searchQuery == undefined){
      res.status(500).send(handleErrors(500, "Sorry, something went wrong"))
      return;
    }
    getLocationData(searchQuery).then(result =>{
    res.status(200).send(result);
    });
  }
  catch(e){
    res.status(500).send(e);
  }
};

function getLocationData(searchQuery){
  const query = {
    'key':process.env.GEOCODE_API_KEY,
    'q':searchQuery,
    'limit':1,
    'format':'json'
  }
  return superagent.get('https://us1.locationiq.com/v1/search.php').query(query)
  .then(result =>{
    let locObj= new CityLocation(searchQuery,result.body[0].display_name, result.body[0].lat,result.body[0].lon)
    return locObj;
  }).catch(error => console.log(error));
};

function CityLocation (search_query,formatted_query,latitude,longitude){
  this.search_query = search_query;
  this.formatted_query = formatted_query;
  this.latitude = latitude;
  this.longitude = longitude;
};

function handleWeather(req,res){
  console.log(req.query)
  getWeatherData(req.query.latitude,req.query.longitude).then(data=>{
    res.status(200).send(data);
  });
};

function handleParks(req,res){
  getParksData(req.query.latitude,req.query.longitude).then(data=>{
    res.status(200).send(data);
  });
};

function CityWeather (forecast,time){
  this.forecast = forecast;
  this.time = time;
};

function getWeatherData(latitude,longitude){
  const query = {
    'key':process.env.WEATHER_API_KEY,
    'lat':latitude,
    'lon':longitude
  }
  return superagent.get('https://api.weatherbit.io/v2.0/current').query(query)
  .then(result =>{
    let weatherArr = result.body['data'].map(ele => {
      return new CityWeather(ele.weather.description, new Date(ele.datetime.split(':').splice(0,1)[0]).toDateString());
    });
    return weatherArr;
  }).catch(error => console.log(error));

};

function getParksData(latitude,longitude){
  const query = {
    'api_key':process.env.PARKS_API_KEY,
    'stateCode':[latitude,longitude],
  }
  return superagent.get('https://developer.nps.gov/api/v1/parks').query(query)
  .then(result =>{
    let parksArr = result.body['data'].map(ele => {
      return new Park(ele.fullName, Object.values(ele.addresses[0]).join(' '),ele.entranceFees.cost,ele.description,ele.url);
    });
    return parksArr;
  }).catch(error => console.log(error));

};

function handleErrors(status, responseText){
  return new ErrorMes(status, responseText);
}

function notFoundHandler(request, response) {
  response.status(404).send('huh?');
}

function ErrorMes(status,responseText){
  this.status = status;
  this.responseText = responseText;
}

function Park(name,address,fee,description,url){
  this.name = name;
  this.address = address;
  this.fee = fee;
  this.description = description;
  this.url = url;
}

app.listen(port, () => {
  console.log(`app listening at http://localhost:${port}`);
});