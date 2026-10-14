const agentTools = [
    {
        name: 'checkDatesAndHolidays',
        description: 'Checks if the provided dates are within the 16-day valid weather forecast window, and retrieves both Israeli and destination public holidays.',
        parameters: {
            type: 'OBJECT',
            properties: {
                destination: {
                    type: 'STRING'
                },
                startDate: {
                    type: 'STRING',
                    description: 'Must be exactly in YYYY-MM-DD format'
                },
                endDate: {
                    type: 'STRING',
                    description: 'Must be exactly in YYYY-MM-DD format'
                }
            },
            required: ['destination', 'startDate', 'endDate']
        }
    },
    {
        name: 'getWeatherForecast',
        description: 'Gets the daily weather forecast for a European destination. Use this only if the destination is known and dates are within 16 days.',
        parameters: {
            type: 'OBJECT',
            properties: {
                destination: {
                    type: 'STRING'
                },
                startDate: {
                    type: 'STRING',
                    description: 'YYYY-MM-DD'
                },
                endDate: {
                    type: 'STRING',
                    description: 'YYYY-MM-DD'
                }
            },
            required: ['destination', 'startDate', 'endDate']
        }
    },
    {
        name: 'calculateAndCheckPolicy',
        description: 'Calculates the total offsite cost in ILS and checks it against the company policy (max 3 days, max 2 nights, max 4000 ILS per person). DO NOT calculate costs yourself, use this tool!',
        parameters: {
            type: 'OBJECT',
            properties: {
                destination: {
                    type: 'STRING'
                },
                days: {
                    type: 'INTEGER',
                    description: 'Number of full days'
                },
                nights: {
                    type: 'INTEGER',
                    description: 'Number of nights'
                }
            },
            required: ['destination', 'days', 'nights']
        }
    }
];

module.exports = { agentTools };
