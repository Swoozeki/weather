const fahrenheitEl = document.getElementById('fahrenheit');
const celsiusEl = document.getElementById('celsius');
const unitChange = new Event('unit-change');
const locationEl = document.getElementById('location');
const timeEl = document.getElementById('time');
const iconEl = document.getElementById('icon');
const descriptionEl = document.getElementById('description');
const degreeEl = document.getElementById('degree');
const forecastEl = document.getElementById('forecast');
const nextEl = document.getElementById('next');
const previousEl = document.getElementById('previous');
const resetEl = document.getElementById('reset');

function formatTime(date, format= 'dddd, MMM D, hh:mmA'){
  return moment(date).format(format);
}

function displayWeather(weather, current){
  let location, time, observation;

  if(current){
    location = locationEl.textContent= weather.display_location.full;
    time = timeEl.textContent= formatTime(new Date(weather.local_epoch*1000));
    observation= {
      icon: weather.icon_url.replace(/http/, 'https'),
      description: weather.weather,
      degree: localStorage.unit==='celsius'?formatDegree(weather.temp_c,'celsius'):formatDegree(weather.temp_f,'fahrenheit')
    }
  }
  else if(!current){ //ie not current observation
    time = timeEl.textContent= formatTime(new Date(weather.date.epoch*1000));
    observation= {
      icon: weather.icon_url.replace(/http/, 'https'),
      description: weather.conditions,
      degree: localStorage.unit==='celsius'?formatDegree(weather.high.celsius,'celsius'):formatDegree(weather.high.fahrenheit,'fahrenheit')
    }
  }

  iconEl.attributes.src.value= observation.icon;
  descriptionEl.textContent= observation.description;
  degreeEl.textContent= observation.degree;
}

function displayHourlyForecast(forecast){
  forecastEl.innerHTML= '';

  /*
    object that has methods for creating a forecast template
  */
  const create = {
    createElement: (type, className) => {
      const el = document.createElement(type);
      el.setAttribute('class', className);
      return el;
    },
    template: function(){
      const section = this.createElement('section', 'forecast-subsection');
      const icon = this.createElement('img', 'forecast-icon');
      const description = this.createElement('p', 'forecast-description');
      const time = this.createElement('p', 'forecast-time');
      const degree = this.createElement('p', 'forecast-degree');

      section.append(time, icon, description, degree);
      return {section, icon, description, time, degree};
    }

  }
  forecast.forEach((hour, i) => {
      const template = create.template();
      const unformattedTime= new Date(hour.FCTTIME.epoch*1000);
      const time = template.time.textContent= formatTime(new Date(hour.FCTTIME.epoch*1000), 'hh:mmA');
      const observation= {
        icon: hour.icon_url.replace(/http/, 'https'),
        description: hour.condition,
        degree: localStorage.unit==='celsius'?formatDegree(hour.temp.metric, 'celsius'):formatDegree(hour.temp.english, 'fahrenheit') //.english
      };
      template.icon.setAttribute('src', observation.icon);
      template.description.textContent= observation.description;
      template.degree.textContent= observation.degree;

      // forecastEl.style.gridTemplateColumns= `repeat(${i+1}, 20%)`;
      // forecastEl.style.background= `linear-gradient(${unformattedTime.getHours()<=12?'to right':'to left'}, #000, #95a5a6)`;
      forecastEl.appendChild(template.section);
  })

  // Ps.initialize(forecastEl);
}

function getWeather(location){
  const [latitude, longitude] = [location.coords.latitude, location.coords.longitude];
  const key = '8df0ae087100c2f2';
  const endpoint = `https://api.wunderground.com/api/${key}/conditions/hourly10day/forecast10day/q/${latitude},${longitude}.json`

  const xhr= new XMLHttpRequest();
  xhr.open('GET', endpoint);
  xhr.send();

  xhr.onload= function(){
    let dayObserved = 0; //what day's weather is being displayed. 0 is today.
    const weather = JSON.parse(this.response);
    const currentWeather = weather.current_observation;
    const forecast = weather.forecast.simpleforecast.forecastday;
    const hourlyForecast = weather.hourly_forecast.reduce((temp, item, i, array) => {
      if(i == 0) return temp;
      if(array[i].FCTTIME.mday != array[i-1].FCTTIME.mday) temp.push([]);

      temp[temp.length-1].push(item);
      return temp;
    },[[]]);

    displayWeather(currentWeather, hourlyForecast, true); //true signals current weather
    displayHourlyForecast(hourlyForecast[dayObserved]); //defaults to current day
    console.log(weather);
    console.log(hourlyForecast);

    /*
      a convoluted way to change every unit currently displayed on screen
    */
    [fahrenheitEl, celsiusEl].forEach(unit => {
      unit.addEventListener('unit-change', () => {
        const celsius = localStorage.unit==='celsius';
        if(dayObserved===0)
          degreeEl.textContent= celsius?formatDegree(currentWeather.temp_c,'celsius'):formatDegree(currentWeather.temp_f,'fahrenheit')
        else{
          const forecastday= forecast[dayObserved];
          degreeEl.textContent= celsius?formatDegree(forecastday.high.celsius,'celsius'):formatDegree(forecastday.high.fahrenheit, 'fahrenheit');
        }

        [].forEach.call(document.getElementsByClassName('forecast-degree'),(hour, i) => {
          hour.textContent = celsius?formatDegree(hourlyForecast[0][i].temp.metric, 'celsius'):formatDegree(hourlyForecast[0][i].temp.english, 'fahrenheit');
        });
      });
    });

    [nextEl, previousEl].forEach(nav => {
      nav.addEventListener('click', ()=> {
        if((dayObserved===0 && nav.id==='previous')|| (dayObserved === 9 && nav.id==='next')) return false;
        nav.id==='next'?dayObserved+=1:dayObserved-=1;

        displayWeather(forecast[dayObserved], false);
        displayHourlyForecast(hourlyForecast[dayObserved]);

      })
    })

    resetEl.addEventListener('click', ()=>{
      dayObserved = 0;
      displayWeather(currentWeather, true);
      displayHourlyForecast(hourlyForecast[dayObserved]);
    })
  };
}

function formatDegree(degree, type){
  if(type==='celsius') return `${degree} °C`;
  else return `${degree} °F`;
}

/*
  toggles between any number of buttons
  arugments:
    buttons - array or array-like of buttons
    toggleButton - the button amongst the array to be toggled on
*/
function toggle(buttons, toggleButton){
  if(toggleButton.classList.contains('active')) return false;

  buttons.forEach(button=>button.classList.remove('active'));
  toggleButton.classList.add('active');

  localStorage.unit= toggleButton.id;
  toggleButton.dispatchEvent(unitChange);
  // console.log(localStorage.unit);
  return true;
}
function init(){
  if(!localStorage.unit || localStorage.unit==='fahrenheit')
    fahrenheitEl.classList.add('active');
  else celsiusEl.classList.add('active');

  [fahrenheitEl, celsiusEl].forEach((unit, i, units) => {
    unit.addEventListener('click', ()=> toggle(units, unit));
  });

  navigator.geolocation.getCurrentPosition(getWeather);
}

init();
