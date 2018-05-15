const { promisify } = require('util');
const parse = promisify(require('csv-parse'));
const { readFile } = require('fs-extra');
const { zipObject } = require('lodash');
// const FormData = require('form-data');

const logger = require('./lib/logger');

(async () => {
  const data = await readData();
  // console.log(data.map(projectRestaurant));
})()
  .catch(err => logger.error(err));

function projectRestaurant (o) {
  return {
    name: o.name,
    email: `${o.sid}@zyuco.com`,
    password: `${o.sid}`,
    license: 'mockLicence.pdf',
    products: o.products.map(({ category, products }) => ({
      category,
      products: products.map(projectDish)
    }))
  };
}

function projectDish (o) {
  const dish = {
    name: o.name,
    description: o.desc,
    image_url: o.images,
    tag: []
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
        name: p.sku.replace(dish.name, '').trim(),
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

module.exports = readData;
