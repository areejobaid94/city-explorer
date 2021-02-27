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
app.get('/movies', handleMovies);
app.get('/yelp', handleYelp);
app.use('*', notFoundHandler);

function handleMovies(req, res){
  let searchQuery = req.query.search_query;
  try {
    getMovieData(searchQuery).then(result => {
      res.status(200).send(result);
    });
  }
  catch (e) {
    res.status(500).send(e);
  }
}



function getMovieData(searchQuery) {
    const query = {
      'api_key': process.env.MOVIE_API_KEY,
      'query': searchQuery,
    }
    return superagent.get('https://api.themoviedb.org/3/search/movie').query(query)
    .then(result => {
      let mobiesArr = result.body['results'].map(ele => {
        return new Movie(ele);
      });
      return mobiesArr;
    }).catch(error => console.log(error));
};


function handleYelp(req, res){
  try {
    console.log(req.query)
    getYelpData(req.query.search_query,req.query.page).then(data => {
      res.status(200).send(data);
    })
  }
  catch (e) {
    res.status(500).send(e);
  };
}

let offset = 1;

function getYelpData(search_query,page) {
  let key = process.env.YELP_API_KEY;
  let limit = 5;
  let newoffset = (offset - 1 )* limit + 1;
  const query = {
    'location': search_query,
    'limit':limit,
    'offset':newoffset
  }
  offset = offset + 1;
  return superagent.get('https://api.yelp.com/v3/businesses/search').query(query).set({ "Authorization": `Bearer ${key}` })
 .then(data => {
       let YelpsArray = data.body.businesses.map(ele =>{
         return new Yelp(ele);
       })
      return YelpsArray;
 })
 .catch(err => {console.log(err)})
} 

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

function Yelp(yelpObj) {
  this.name = yelpObj.name;
  this.image_url = yelpObj.image_url;
  this.price = yelpObj.price;
  this.rating = yelpObj.rating;
  this.url = yelpObj.url;
};

function Movie(movieObj){
  this.title = movieObj.original_title;
  this.overview = movieObj.overview;
  this.average_votes = movieObj.vote_average;
  this.total_votes = movieObj.vote_count;
  this.image_url = `https://image.tmdb.org/t/p/w500${movieObj.poster_path}` || 'https://germistoncitynews.co.za/wp-content/uploads/sites/31/2016/04/Movies.jpg',
  this.popularity = movieObj.popularity,
  this.released_on = movieObj.release_date
}

client.connect().then(() => {
  app.listen(port, () => {
    console.log(`app listening at http://localhost:${port}`);
  });
}).catch(e => {
  console.log(e, 'errrrrroooooorrrr')
})