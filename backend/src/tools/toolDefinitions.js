const weatherToolsSchema = [
    {
        name: 'checkDatesAndHolidays',
        description: 'Checks if the provided dates are within the 16-day valid weather forecast window, and retrieves both Israeli and destination public holidays.',
        parameters: {
            type: 'object',
            properties: {
                destination: {
                    type: 'string'
                },
                startDate: {
                    type: 'string',
                    description: 'Must be exactly in YYYY-MM-DD format'
                },
                endDate: {
                    type: 'string',
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
            type: 'object',
            properties: {
                destination: {
                    type: 'string'
                },
                startDate: {
                    type: 'string',
                    description: 'YYYY-MM-DD'
                },
                endDate: {
                    type: 'string',
                    description: 'YYYY-MM-DD'
                }
            },
            required: ['destination', 'startDate', 'endDate']
        }
    }
];

const budgetToolsSchema = [
    {
        name: 'calculateAndCheckPolicy',
        description: 'Calculates the total offsite cost in ILS and checks it against the company policy (max 3 days, max 2 nights, max 4000 ILS per person). DO NOT calculate costs yourself, use this tool!',
        parameters: {
            type: 'object',
            properties: {
                destination: {
                    type: 'string'
                },
                days: {
                    type: 'integer',
                    description: 'Number of full days'
                },
                nights: {
                    type: 'integer',
                    description: 'Number of nights'
                }
            },
            required: ['destination', 'days', 'nights']
        }
    }
];

const scoutToolsSchema = [
    {
        name: "searchPlaces",
        description: "Search for places in a given city using OpenStreetMap tags to ensure accessibility and dietary requirements can be met.",
        parameters: {
            type: "object",
            properties: {
                city: { type: "string", description: "The city to search in (e.g., Lisbon, Barcelona)" },
                tag: { type: "string", description: "The tag to search for (e.g., vegan, kosher, wheelchair)" }
            },
            required: ["city", "tag"]
        }
    },
    {
        name: "getWeatherForecast",
        description: "Check the weather forecast for a destination to help decide if it's a good place to visit.",
        parameters: {
            type: "object",
            properties: {
                destination: { type: "string", description: "City name" },
                startDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
                endDate: { type: "string", description: "End date (YYYY-MM-DD)" }
            },
            required: ["destination", "startDate", "endDate"]
        }
    }
];


module.exports = { weatherToolsSchema, budgetToolsSchema, scoutToolsSchema };