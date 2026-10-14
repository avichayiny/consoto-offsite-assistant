const axios = require('axios');
const consotoData = require('../data/consotoData.json');

async function calculateAndCheckPolicy(destination, days, nights) {
    const { destinationCosts, policyRules } = consotoData;

    if (days > policyRules.maxDays || nights > policyRules.maxNights) {
        return {
            status: 'REJECTED',
            reason: 'Exceeds max days/nights'
        };
    }

    const costs = destinationCosts[destination];
    if (!costs) {
        return {
            status: 'ERROR',
            reason: `Unknown destination: ${destination}`
        };
    }

    let exchangeRate = 4.0;
    try {
        const response = await axios.get(
            'https://api.frankfurter.app/latest?from=EUR&to=ILS'
        );
        const fetchedRate = response.data?.rates?.ILS;

        if (!Number.isFinite(fetchedRate) || fetchedRate <= 0) {
            throw new Error('Frankfurter returned an invalid EUR to ILS rate');
        }

        exchangeRate = fetchedRate;
    } catch (error) {
        console.error('Failed to fetch EUR to ILS exchange rate; using fallback:', error);
    }

    const breakdownEUR = {
        flight: costs.returnFlight,
        hotel: costs.hotelPerNight * nights,
        meals: costs.mealsPerDay * days,
        activities: costs.activitiesPerDay * days
    };
    breakdownEUR.total = breakdownEUR.flight
        + breakdownEUR.hotel
        + breakdownEUR.meals
        + breakdownEUR.activities;

    const totalILS = breakdownEUR.total * exchangeRate;
    const status = totalILS <= policyRules.maxBudgetPerPersonILS
        ? 'APPROVED'
        : 'REQUIRES_CFO_APPROVAL';

    return {
        status,
        breakdownEUR,
        exchangeRate,
        totalILS,
        message: status === 'APPROVED'
            ? `Estimated cost is within the per-person budget of ${policyRules.maxBudgetPerPersonILS} ILS.`
            : `Estimated cost exceeds the per-person budget of ${policyRules.maxBudgetPerPersonILS} ILS and requires CFO approval.`
    };
}

module.exports = { calculateAndCheckPolicy };
