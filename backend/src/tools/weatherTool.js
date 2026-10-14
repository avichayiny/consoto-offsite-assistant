const axios = require('axios');

async function getWeatherForecast(destination, startDate, endDate) {

    const today = new Date();
    const targetDate = new Date(startDate);
    const daysDifference = (targetDate - today) / (1000 * 60 * 60 * 24);

    if (daysDifference > 14 || daysDifference < 0) {
        return {
            status: 'UNAVAILABLE',
            reason: 'Forecast unavailable - date is either in the past or too far in the future. Maximum forecast range is 14 days.'
        };
    }

    let coordinates;
    try {
        const response = await axios.get(
            'https://nominatim.openstreetmap.org/search',
            {
                params: {
                    q: destination,
                    format: 'json'
                },
                headers: {
                    'User-Agent': 'ConsotoOffsitePlanner/1.0'
                }
            }
        );
        const result = Array.isArray(response.data) ? response.data[0] : null;

        if (!result || !Number.isFinite(Number(result.lat)) || !Number.isFinite(Number(result.lon))) {
            return {
                status: 'ERROR',
                reason: 'Could not find coordinates for destination'
            };
        }

        coordinates = {
            latitude: Number(result.lat),
            longitude: Number(result.lon)
        };
    } catch (error) {
        console.error('Failed to find destination coordinates:', error);
        return {
            status: 'ERROR',
            reason: 'Could not find coordinates for destination'
        };
    }

    try {
        const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
            params: {
                latitude: coordinates.latitude,
                longitude: coordinates.longitude,
                start_date: startDate,
                end_date: endDate,
                daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
                timezone: 'auto'
            }
        });
        const daily = response.data?.daily;

        if (
            !Array.isArray(daily?.time)
            || !Array.isArray(daily?.temperature_2m_min)
            || !Array.isArray(daily?.temperature_2m_max)
            || !Array.isArray(daily?.precipitation_probability_max)
        ) {
            throw new Error('Open-Meteo returned an invalid daily forecast');
        }

        return daily.time.map((date, index) => ({
            date,
            minTemp: daily.temperature_2m_min[index],
            maxTemp: daily.temperature_2m_max[index],
            precipitationProbability: daily.precipitation_probability_max[index]
        }));
    } catch (error) {
        console.error('Failed to fetch weather forecast:', error);
        return {
            status: 'ERROR',
            reason: 'Could not fetch weather forecast'
        };
    }
}

module.exports = { getWeatherForecast };