const axios = require('axios');
const tough = require('tough-cookie');
const cookiejar = new tough.CookieJar();
const baseURL = 'http://localhost:8520';

require('axios-cookiejar-support').default(axios);

const ax = axios.create({
  validateStatus: function (status) {
    return status === 200;
  },
  baseURL,
  withCredentials: true,
  jar: cookiejar
});

module.exports = ax;
