const axios = require('axios');

const destinationCountryCodes = {
    Lisbon: 'PT',
    Barcelona: 'ES',
    Athens: 'GR',
    Prague: 'CZ',
    Budapest: 'HU'
};

function parseDate(date) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return null;
    }

    const parsedDate = new Date(`${date}T00:00:00.000Z`);
    return Number.isNaN(parsedDate.getTime())
        || parsedDate.toISOString().slice(0, 10) !== date
        ? null
        : parsedDate;
}

async function checkDatesAndHolidays(destination, startDate, endDate) {
    const countryCode = destinationCountryCodes[destination];
    if (!countryCode) {
        return {
            status: 'ERROR',
            reason: `Unknown destination: ${destination}`
        };
    }

    const parsedStartDate = parseDate(startDate);
    const parsedEndDate = parseDate(endDate);
    if (!parsedStartDate || !parsedEndDate || parsedStartDate > parsedEndDate) {
        return {
            status: 'ERROR',
            reason: 'Invalid date range; expected YYYY-MM-DD dates with startDate on or before endDate'
        };
    }

    const now = new Date();
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const startDay = parsedStartDate.getTime();
    const daysUntilStart = (startDay - today) / 86400000;
    const validForWeatherForecast = daysUntilStart >= 0 && daysUntilStart <= 16;

    let israeliHolidays = [];
    try {
        const response = await axios.get(
            `https://www.hebcal.com/hebcal?v=1&cfg=json&start=${startDate}&end=${endDate}`
        );
        israeliHolidays = (response.data?.items || [])
            .filter(item => item.category === 'holiday' && typeof item.title === 'string')
            .map(item => item.title);
    } catch (error) {
        console.error('Failed to fetch Israeli holidays:', error);
    }

    let destinationHolidays = [];
    try {
        const year = parsedStartDate.getUTCFullYear();
        const response = await axios.get(
            `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`
        );
        destinationHolidays = (Array.isArray(response.data) ? response.data : [])
            .filter(holiday => holiday.date >= startDate && holiday.date <= endDate)
            .map(holiday => holiday.name || holiday.localName)
            .filter(name => typeof name === 'string');
    } catch (error) {
        console.error('Failed to fetch destination holidays:', error);
    }

    return {
        validForWeatherForecast,
        israeliHolidays,
        destinationHolidays
    };
}

module.exports = { checkDatesAndHolidays };
