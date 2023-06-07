"use strict";
Object.defineProperty(exports, "__esModule", {value: true});
const redis = require("redis");
const util = require("util");
const KEY = `account1/balance`;

exports.chargeRequestRedis = async function (input) {
    const redisClient = await getRedisClient();
    if (!input || !input.serviceType || !input.unit) {
        await disconnectRedis(redisClient);
        return {
            remainingBalance: 0,
            isAuthorized: false,
            charges: 0
        }
    }
    const charges = getCharges(input.serviceType, input.unit);
    if (charges === -1) {
        await disconnectRedis(redisClient);
        return {
            remainingBalance: 0,
            isAuthorized: false,
            charges: 0
        }
    }
    let remainingBalance;
    let isAuthorized;
    let response;

    const transaction = redisClient.multi();
    transaction.get(KEY);

    await new Promise((resolve, reject) => {
        transaction.exec(async (err, replies) => {
            if (err) {
                console.error('Error executing transaction:', err);
                reject(err);
            }
            remainingBalance = parseInt(replies[0] || "0");
            isAuthorized = authorizeRequest(remainingBalance, charges);
            if (!isAuthorized) {
                response = {
                    remainingBalance,
                    isAuthorized,
                    charges: 0
                };
            } else {
                remainingBalance = await chargeRedis(redisClient, KEY, charges);
                response = {
                    remainingBalance,
                    charges,
                    isAuthorized,
                };
            }
            resolve();
        });
    });

    await disconnectRedis(redisClient);
    return response;
};


function getCharges(serviceType, unit) {
    // Define the cost per unit for each service type
    const costPerUnit = {
        voice: 5,
        data: 10,
        text: 1,
    };
    if (!costPerUnit[serviceType]) return -1;

    // Calculate the charges based on the service type and unit
    return costPerUnit[serviceType] * unit;
}


async function getRedisClient() {
    return new Promise((resolve, reject) => {
        try {
            const client = new redis.RedisClient({
                host: process.env.ENDPOINT,
                port: parseInt(process.env.PORT || "6379"),
            });
            client.on("ready", () => {
                console.log('redis client ready');
                resolve(client);
            });
        } catch (error) {
            reject(error);
        }
    });
}

async function disconnectRedis(client) {
    return new Promise((resolve, reject) => {
        client.quit((error, res) => {
            if (error) {
                reject(error);
            } else if (res === "OK") {
                console.log('redis client disconnected');
                resolve(res);
            } else {
                reject("unknown error closing redis connection.");
            }
        });
    });
}

function authorizeRequest(remainingBalance, charges) {
    return remainingBalance >= charges;
}

async function chargeRedis(redisClient, key, charges) {
    return util.promisify(redisClient.decrby).bind(redisClient).call(redisClient, key, charges);
}
