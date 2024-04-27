let regions = {};
let regionPopulation = {};

export const wellbeingToStateMap = {
  Uusimaa: 'Uusimaa',
  'South Karelia': 'South Karelia',
  'South Ostrobothnia': 'Southern Ostrobothnia',
  'South Savo': 'Southern Savonia',
  'City of Helsinki': 'Uusimaa',
  'East Uusimaa': 'Uusimaa',
  Kainuu: 'Kainuu',
  'Kanta-Häme': 'Tavastia Proper',
  'Central Ostrobothnia': 'Central Ostrobothnia',
  'Central Finland': 'Central Finland',
  'Central Uusimaa': 'Uusimaa',
  Kymenlaakso: 'Kymenlaakso',
  Lapland: 'Lapland',
  'West Uusimaa': 'Uusimaa',
  Pirkanmaa: 'Pirkanmaa',
  Ostrobothnia: 'Ostrobothnia',
  'North Karelia': 'North Karelia',
  'North Ostrobothnia': 'Northern Ostrobothnia',
  'North Savo': 'Northern Savonia',
  'Päijät-Häme': 'Päijät-Häme',
  Satakunta: 'Satakunta',
  'Vantaa and Kerava': 'Uusimaa',
  'Southwest Finland': 'Finland Proper',
};

// regions from 956 - 978
export const getRegions = async () => {
  const response = await fetch('https://sotkanet.fi/rest/1.1/regions');
  const data = await response.json();
  const regionData = data
    .filter(r => r.category === 'HYVINVOINTIALUE')
    .map(r => {
      const base = r.title.en;
      const title = base.includes(' wellbeing services county')
        ? base.split(' wellbeing services county')[0]
        : base;
      return { id: r.id, name: title };
    });
  const regionObject = {};
  regionData.forEach(r => (regionObject[r.id] = r));
  regionObject[488] = { id: 488, name: 'Uusimaa' };
  regions = regionObject;
  return regionObject;
};

const getYearString = (start, end) => {
  const years = [];
  for (let year = start; year <= end; year++) {
    years.push(`&years=${year}`);
  }
  return years.join('');
};

// ind 127: total population in region
export const getPopulationByRegion = async () => {
  if (!regions) regions = await getRegions();
  regionPopulation = { ...regions };
  Object.keys(regionPopulation).forEach(
    r => (regionPopulation[r]['population'] = {})
  );
  const res = await fetch(
    `https://sotkanet.fi/rest/1.1/json?indicator=${127}${getYearString(
      1996,
      2022
    )}&genders=total`
  );
  const data = await res.json();
  Object.keys(data).forEach(key => {
    const entry = data[key];
    if (entry.region in regionPopulation) {
      if (!(entry.year in regionPopulation[entry.region]['population']))
        regionPopulation[entry.region]['population'][entry.year] = {};
      regionPopulation[entry.region]['population'][entry.year] = entry.value;
    }
  });
  return regionPopulation;
};

let yearIndices = null;
let diseaseIndices = null;
let regionIndices = null;

const getYearIndices = async () => {
  yearIndices = {};
  const res = await fetch(
    `https://sampo.thl.fi/pivot/prod/en/ttr/cases/fact_ttr_cases.json?column=yearmonth-878344&filter=measure-877837`
  );
  const data = await res.json();
  Object.keys(data.dataset.dimension.yearmonth.category.label).forEach(y => {
    const name =
      data.dataset.dimension.yearmonth.category.label[y].split('Year ')[1];
    if (!name) yearIndices['all'] = y;
    yearIndices[name] = y;
  });
  return yearIndices;
};

const getDiseaseIndices = async () => {
  diseaseIndices = {};
  const res = await fetch(
    `https://sampo.thl.fi/pivot/prod/en/ttr/cases/fact_ttr_cases.json?row=nidrreportgroup-878152&filter=measure-877837`
  );
  const data = await res.json();
  Object.keys(data.dataset.dimension.nidrreportgroup.category.label).forEach(
    y => {
      const name = data.dataset.dimension.nidrreportgroup.category.label[y];
      diseaseIndices[name] = y;
    }
  );
  return diseaseIndices;
};

const getRegionIndices = async () => {
  regionIndices = {};
  const res = await fetch(
    `https://sampo.thl.fi/pivot/prod/en/ttr/cases/fact_ttr_cases.json?row=wscmunicipality2022-877686&filter=measure-877837`
  );
  const data = await res.json();
  Object.keys(
    data.dataset.dimension.wscmunicipality2022.category.label
  ).forEach(y => {
    const base = data.dataset.dimension.wscmunicipality2022.category.label[y];
    const name =
      base.split(' wellbeing services county').length > 0
        ? base.split(' wellbeing services county')[0]
        : base;
    regionIndices[name] = y;
  });
  console.log('finished regionindices');
  return regionIndices;
};

export const getDiseaseList = () => {
  return Object.keys(diseaseIndices);
};

export const setUpIndices = async () => {
  if (!yearIndices) yearIndices = await getYearIndices();
  if (!diseaseIndices) diseaseIndices = await getDiseaseIndices();
  if (!regionIndices) regionIndices = await getRegionIndices();
};

export const getInfectionNumbers = async (diseases, regions, years) => {
  const diseaseFilter =
    diseases.length === 1
      ? `${diseaseIndices[diseases[0]]}.`
      : diseases.map(d => diseaseIndices[d]).join('.');
  const regionFilter =
    regions.length === 1
      ? `${regionIndices[regions[0]]}.`
      : regions.map(r => regionIndices[r]).join('.');
  const yearFilter =
    years.length === 1
      ? `${yearIndices[years[0]]}.`
      : years.map(y => yearIndices[y]).join('.');
  const res = await fetch(
    `https://sampo.thl.fi/pivot/prod/en/ttr/cases/fact_ttr_cases.json?row=nidrreportgroup-${diseaseFilter}&row=wscmunicipality2022-${regionFilter}&column=yearmonth-${yearFilter}&filter=measure-877837`
  );
  const data = await res.json();
  return Object.values(data.dataset.value).map(val => parseInt(val));
};

export const getCountyData = async county => {
  const data = Object.entries(wellbeingToStateMap).find(
    r => r[1] === county
  )[0];
  console.log(data);
  return data;
};
