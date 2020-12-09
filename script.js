const form = document.querySelector('#form');
const select = document.querySelector('#select');
const a = document.querySelector('a');
const dri = document.querySelector('#dri');
const male = document.querySelector('#male');
const female = document.querySelector('#female');
const foods = document.querySelector('#foods');
const food = document.querySelector('#food');
let boxes;

let data, header, per;
let foodnameIndex, calorieIndex, categoryIndex;
let groups = {};
let toggle = false;

let servingSizes = {};
servingSizes['Vegetables'] = 85;
servingSizes['Fruits'] = 140;
servingSizes['Legumes'] = 130;
servingSizes['Grains'] = 140;
servingSizes['Nuts'] = 30;
const exclude = [0, 1, 2, 4, 5, 35, 39, 54];

// DRI for 19-30 y
const dri_m = '|||||||1.2|1.3|16|5|1.3|2.4|400|3000|90|600|15|120|1000|0.9|8|400|2.3|700|3400|55|1500|11|130|38||||||||||1.6|17||||||||56|||||'.split('|');
const dri_f = '|||||||1.1|1.1|14|5|1.3|2.4|400|2333|75|600|15|90|1000|0.9|18|310|1.8|700|2600|55|1500|8|130|25||||||||||1.1|12||||||||46|||||'.split('|');
let dris = dri_m;

async function getData() {
  await fetch('servings.txt').then((r) => r.text()).then((r) => data = r);
  data = data.split(/\r?\n/);
  header = data[0].split('|');
  foodnameIndex = header.indexOf('Food Name');
  calorieIndex = header.indexOf('Energy (kcal)');
  categoryIndex = header.indexOf('Category');
  data = data.slice(1).map((r) => r.split('|').map((r) => (isNaN(r) || r === '') ? r : Number(r)));
}

function calculateAmount(row, i) {
  if (per == 'gram') return row[i];
  else if (per == 'calorie') return row[i] * 100 / row[calorieIndex];
  else if (per == 'serving') return row[i] * servingSizes[row[categoryIndex]] / 100;
}

function round(i) {
  return i < 1 ? i.toPrecision(1) : i.toFixed(1);
}

function calculatePercent(v, i) {
  if (!dris[i]) return '';
  return `<small>(${(v/dris[i]*100).toFixed(0)}%)</small> `;
}

function sortFoods(i) {
  for (row of data) {
    if (!groups[row[categoryIndex]]) row['v'] = 0; // prevent food from being first (the first food is used to calculate the width)
    else row['v'] = calculateAmount(row, i);
  }
  data.sort((a, b) => {
    if (a[foodnameIndex] == b[foodnameIndex]) return 0;
    if (a['v'] > b['v'] || a['v'] == b['v'] && a[foodnameIndex] < b[foodnameIndex]) return -1;
    return 1;
  })
}

function createDropdown() {
  for (i in header) {
    if (exclude.includes(parseInt(i)))
      continue;
    select.insertAdjacentHTML('beforeend', `<option value=${i}>${header[i]}</option>`);
  }
}

function createGroups() {
  for (i in servingSizes)
    select.insertAdjacentHTML('beforebegin', `<input type="checkbox" id="${i}" checked>
    <label for="${i}">${i}</label>`);
  document.querySelector('label[for=Nuts]').innerHTML = 'Nuts/seeds';
  select.insertAdjacentHTML('beforebegin', `<input type="button" id="all" value="Uncheck all">`)
  const all = document.querySelector('#all');
  boxes = document.querySelectorAll('input[type=checkbox]');
  all.addEventListener('click', () => {
    boxes.forEach((box) => {box.checked = toggle;});
    all.value = toggle ? 'Uncheck all' : 'Check all';
    toggle = !toggle;
    updateList();
  });
}

function getGroups() {
  for (i in servingSizes)
    groups[i] = document.querySelector('#'+i).checked;
}

function updateList() {
  per = document.querySelector('input[type=radio]:checked').id;
  getGroups();
  sortFoods(select.value);
  foods.innerHTML = '';
  let largest = data[0]['v'];
  let unit = header[select.value].split('(').pop().split(')')[0];
  dri.innerHTML = '';
  dris = male.checked ? dri_m : dri_f;
  if (dris[select.value]) {
    dri.innerHTML = `<b>DRI = ${dris[select.value]} ${unit}</b>`;
    gender.style.display = null;
  }
  else
    gender.style.display = 'none';
  for (i in data) {
    if (!groups[data[i][categoryIndex]])
      continue;
    if (data[i][select.value] === '') // leave out foods with no data
      continue;
    let roundedAmount = round(data[i]['v']);
    let percent = calculatePercent(data[i]['v'], select.value);
    let serving = '';
    if (per == 'serving')
      serving = '(' + servingSizes[data[i][categoryIndex]] + 'g)';
    let width = Number(data[i]['v'])/Number(largest);
    foods.insertAdjacentHTML('beforeend', `<div id="_${i}">${roundedAmount} ${unit} ${percent}<b>${data[i][foodnameIndex]}</b> ${serving}<br>
    <div class="bar" style="width:${width*100}%;"></div></div>`);
    document.querySelector('#_'+i).addEventListener('click', printFood);
  }
  updateURL();
}

function printFood(e) {
  let row = data[e.currentTarget.id.substr(1)];
  let g = '100g';
  if (per == 'calorie') g = '100 calories';
  else if (per == 'serving') g = servingSizes[row[categoryIndex]] + 'g';
  food.innerHTML = `<b>${row[foodnameIndex]} (${g})</b><br>`;
  for (i in header) {
    if (exclude.includes(parseInt(i)) || row[i] === '')
      continue;
    let v = calculateAmount(row, i);
    let roundedAmount = round(v);
    let percent = calculatePercent(v, i);
    food.insertAdjacentHTML('beforeend', `${header[i]}: ${roundedAmount} ${percent}<br>`);
  }
}

function getURL() {
  const params = (new URL(document.location)).searchParams;
  let nutrient = params.get('nutrient');
  let groups = params.get('groups');
  let per = params.get('per');
  if (params.has('nutrient'))
    select.selectedIndex = nutrient;
  if (params.has('groups')) {
    groups = groups.split(',');
    boxes.forEach((box) => {box.checked = groups.includes(box.id);});
  }
  if (params.has('per'))
    document.querySelector('#' + per).checked = true;
}

function updateURL() {
  let nutrient = select.selectedIndex;
  let groups = '';
  let allGroups = true;
  for (box of boxes) {
    if (box.checked)
      groups += (groups ? ',' : '') + box.id;
    else
      allGroups = false;
  }
  let per = document.querySelector('input[type=radio]:checked').id;
  let url = `${location.href.split('?')[0]}?nutrient=${nutrient}`;
  if (!allGroups)
    url += `&groups=${groups}`;
  if (per != 'gram')
    url += `&per=${per}`;
  a.href = url;
}

async function init() {
  await getData();
  createDropdown();
  createGroups();
  getURL();
  updateList();
  form.addEventListener('change', updateList);
}

init();