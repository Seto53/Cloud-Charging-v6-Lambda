const axios = require('axios');
const {performance} = require('perf_hooks');

const resetUrl = 'https://b1ra2acctg.execute-api.us-east-1.amazonaws.com/prod/reset-redis';
const chargeUrl = 'https://b1ra2acctg.execute-api.us-east-1.amazonaws.com/prod/charge-request-redis';

async function reset() {
    const start = performance.now();
    const response = await axios.post(resetUrl);
    const end = performance.now();
    console.log(`Reset request completed in ${end - start} ms`);
    console.log(response.data);
    return response.data;
}

async function charge(requestBody) {
    const start = performance.now();
    const response = await axios.post(chargeUrl, requestBody);
    const end = performance.now();
    console.log(`Charge request for ${requestBody.serviceType} with ${requestBody.unit} units completed in ${end - start} ms`);
    console.log(response.data);
    return response.data;
}

async function concurrentCharges(n, requestBody) {
    const start = performance.now();
    const responses = await Promise.all(Array(n).fill().map(() => axios.post(chargeUrl, requestBody)));
    const end = performance.now();
    console.log(`${n} concurrent charge requests for ${requestBody.serviceType} with ${requestBody.unit} units completed in ${end - start} ms`);
    return responses.map(response => {
        console.log(response.data);
        return response.data;
    });
}

describe('Charging Engine Tests', () => {
    test('Reset balance', async () => {
        const response = await reset();
        expect(response).toBeDefined();
    });

    test('Charge voice service', async () => {
        const response = await charge({serviceType: 'voice', unit: 2});
        expect(response).toBeDefined();
    });

    test('Charge data service', async () => {
        const response = await charge({serviceType: 'data', unit: 5});
        expect(response).toBeDefined();
    });

    test('Charge text service', async () => {
        const response = await charge({serviceType: 'text', unit: 10});
        expect(response).toBeDefined();
    });

    test('Concurrent charges for voice service', async () => {
        await reset();
        const responses = await concurrentCharges(15, {serviceType: 'voice', unit: 2});
        responses.forEach(response => {
            expect(response).toBeDefined();
        });
    });
});
