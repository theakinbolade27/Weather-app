// Handle search form submission
document.getElementById('searchForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const city = document.getElementById('q').value.trim();
  if (!city) return;


  const apiKey = 'YOUR_API_KEY_HERE';d217c6065234e4e19634e02d014fcc89
  const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${city}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        alert('City not found!');
        return;
      }
      
      // Update the weather display
      document.getElementById('cityName').textContent = data.location.name;
      document.getElementById('temperature').textContent = Math.round(data.current.temp_f) + '°F';
      document.getElementById('description').textContent = data.current.condition.text;
      document.getElementById('humidity').textContent = data.current.humidity + '%';
      document.getElementById('windSpeed').textContent = data.current.wind_mph + ' mph';
      if (data.current.uv !== undefined) {
        document.getElementById('uvIndex').textContent = data.current.uv;
      }
      
      document.getElementById('q').value = '';
    })
    .catch(err => {
      console.error('Error:', err);
      alert('Failed to fetch weather data');
    });
});
