const { promisify } = require('util');
const parse = promisify(require('csv-parse'));
const { readFile, writeJson } = require('fs-extra');
const { zipObject } = require('lodash');
const FormData = require('form-data');

const logger = require('./lib/logger');
const ax = require('./lib/ax');

(async () => {
  logger.info('reading mock data...');
  const data = await readData();
  // await writeJson('./data.json', data, { spaces: 2 });
  logger.info(`read ${data.length} restaurants`);

  for (const restaurant of data) {
    await mock(restaurant);
  }
  logger.info('done');
})()
  .catch(err => {
    if (err.response && err.response.data) {
      logger.error(`code: ${err.response.status}`);
      logger.error(err.response.data);
    } else {
      logger.error(err.message);
    }
  });

async function mock (r) {
  logger.info(`start mocking ${r.name}`);
  await regist(r);
  logger.info(`${r.name}: regist done`);

  await ax.post('/restaurant/session', { email: r.email, password: r.password }); // login
  logger.info(`${r.name}: logged in`);

  await ax.put('/restaurant/self', { logo_url: r.logo });
  logger.info(`${r.name}: logo updated`);

  logger.info(`${r.name}: start mocking categories. total ${r.products.length}`);
  for (const cate of r.products) {
    const { data: { category_id } } = await ax.post('/category', { name: cate.category });
    logger.info(`${r.name}: category - ${cate.category} created`);
    logger.info(`${r.name}: category - ${cate.category} mocking dishes. total ${cate.products.length}`);
    for (const dish of cate.products) {
      await ax.post('/dish', { ...dish, category_id });
      logger.info(`${r.name}: category - ${cate.category} - ${dish.name} created`);
    }
  }
  ax.delete('/restaurant/session'); // logout
  logger.info(`${r.name}: logged out, done`);
}

async function regist (r) { // r: restaurant
  const form = new FormData();
  form.append('email', r.email);
  form.append('password', r.password);
  form.append('name', r.name);
  form.append('license', '123', 'a.docx');
  return ax.post('/restaurant', form, {
    headers: form.getHeaders()
  });
}

function projectRestaurant (o) {
  return {
    name: normalize(o.name),
    email: `${o.sid}@zyuco.com`,
    password: `${o.sid}`.padStart(6, '0'),
    license: 'mockLicence.pdf',
    products: o.products.map(({ category, products }) => ({
      category: normalize(category),
      products: products.map(projectDish)
    })),
    logo: o.logo
  };
}

function projectDish (o) {
  const dish = {
    name: normalize(o.name),
    description: normalize(o.desc) || null,
    image_url: o.images.length ? o.images : null
    // tag: []
  };
  // dish.origin = o;
  const spec = o.sku_detail;
  if (spec.length === 1) {
    dish.specifications = null;
    dish.price = Number(spec[0].price);
  } else {
    dish.price = Math.min(...spec.map(o => Number(o.price)));
    dish.specifications = [{ // 饿了么网页版里，规格只有一个“问题”
      name: '规格',
      require: true,
      default: 0,
      options: spec.map(p => ({
        name: normalize(p.sku.replace(dish.name, '')),
        delta: Number(p.price) - dish.price
      }))
    }];
  }
  return dish;
}

async function readData () {
  const file = await readFile('data.csv', { encoding: 'utf8' });
  const [_header, ...rows] = await parse(file, { delimiter: ',' });
  const header = _header.filter(s => !!s).map(str => str.match(/\((.+?)\)$/)[1]);
  return rows.map(row => zipObject(header, row.map(tryParse))).map(projectRestaurant);
}

function tryParse (str) {
  try {
    return JSON.parse(str);
  } catch (err) {
    return str;
  }
}

function normalize (str) {
  return str.trim().replace(/\s+/g, '');
}

module.exports = readData;
