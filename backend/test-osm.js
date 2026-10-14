const axios = require('axios');

async function testOverpass() {
    try {
        console.log("Testing Overpass API with clean query...");
        
        // שאילתה קטנה מאוד וממוקדת שלא תעמיס על השרת
        const overpassQuery = `
            [out:json][timeout:15];
            node["amenity"="cafe"](51.5,-0.1,51.51,-0.09);
            out count;
        `;

        const response = await axios({
            method: 'post',
            url: 'https://api.overpass-api.de/api/interpreter',
            data: overpassQuery,
            headers: {
                'User-Agent': 'ConsotoOffsiteChecker/1.0 (student-challenge@example.com)',
                'Content-Type': 'text/plain; charset=utf-8'
            },
            timeout: 15000
        });

        console.log("✅ SUCCESS! Status:", response.status);
        console.log("Response data:", response.data);
    } catch (error) {
        console.error("❌ FAILED:", error.message);
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Body:", error.response.data);
        }
    }
}

testOverpass();