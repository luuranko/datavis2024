import { minYear, maxYear } from './globals';

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

let yearIndices = null;
let diseaseIndices = null;
let regionIndices = null;
let finlandTopology = null;
let uusimaaData = null;

// TODO here get population data for Uusimaa so it doesn't need to be fetched every time
// ind 127: total population in region
const getUusimaaData = async () => {
  uusimaaData = { population: {} };
  const years = [];
  for (let year = minYear; year <= maxYear; year++) {
    years.push(`&years=${year}`);
  }
  const yearString = years.join('');
  const url = `https://sotkanet.fi/rest/1.1/json?indicator=${127}${yearString}&genders=total`;
  console.log(url);
  const res = await fetch(url);
  const data = await res.json();
  Object.values(data)
    .filter(entry => entry.region === 488)
    .forEach(entry => {
      uusimaaData.population[entry.year] = entry.value;
    });
  console.log(uusimaaData.population);
  return uusimaaData;
};

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
  console.log(Object.keys(yearIndices));
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
  return regionIndices;
};

export const getDiseaseList = () => {
  const list = {};
  Object.keys(diseaseIndices)
    .toSorted()
    .forEach(d => (list[d] = d.replaceAll(' ', '_')));
  return list;
};

export const setUpIndices = async () => {
  if (!finlandTopology) {
    finlandTopology = await fetch(
      'https://code.highcharts.com/mapdata/countries/fi/fi-all.topo.json'
    ).then(response => response.json());
  }
  if (!uusimaaData) {
    await getUusimaaData();
  }
  if (!yearIndices) yearIndices = await getYearIndices();
  if (!diseaseIndices) diseaseIndices = await getDiseaseIndices();
  if (!regionIndices) regionIndices = await getRegionIndices();
  console.log('Finished setting up topology and indices.');
};

export const getFinlandTopology = () => {
  if (!finlandTopology)
    console.error('Did not initialize Finland map topology yet.');
  return finlandTopology;
};

export const getEmptyMapData = () => {
  const hcKeys = finlandTopology.objects.default.geometries.map(
    entry => entry.properties['hc-key']
  );
  const data = hcKeys.map(key => [key, 0]);
  return data;
};

const getHcKey = wellbeingCountyName => {
  const stateName = wellbeingToStateMap[wellbeingCountyName];
  return finlandTopology.objects.default.geometries.find(
    g => g.properties.name === stateName
  ).properties['hc-key'];
};

const getYearFilter = (startYear, endYear = null) => {
  if (startYear === endYear || !endYear) {
    return `${yearIndices[startYear]}.`;
  }
  const arr = [];
  for (let i = startYear; i <= endYear; i++) {
    arr.push(yearIndices[i]);
  }
  return arr.join('.');
};

const getDiseaseFilter = diseases => {
  if (!Array.isArray(diseases))
    return `${diseaseIndices[diseases.replaceAll('_', ' ')]}.`;
  return diseases.length === 1
    ? `${diseaseIndices[diseases[0].replaceAll('_', ' ')]}.`
    : diseases.map(d => diseaseIndices[d]).join('.');
};

const getRegionFilter = regions => {
  if (!Array.isArray(regions)) {
    return `${regionIndices[regions]}.`;
  }
  return regions.length === 1
    ? `${regionIndices[regions[0]]}.`
    : regions.map(r => regionIndices[r]).join('.');
};

export const getInfectionIncidenceManyDiseases = async (
  diseases,
  region,
  startYear,
  endYear
) => {
  const series = [];
  for (let i = 0; i < diseases.length; i++) {
    const data = await getInfectionIncidenceForOne(
      diseases[i],
      region,
      startYear,
      endYear
    );
    series.push({
      name: diseases[i].replaceAll('_', ' '),
      data: data,
      id: diseases[i],
    });
  }
  return series;
};

export const getInfectionIncidenceManyRegions = async (
  disease,
  regions,
  startYear,
  endYear
) => {
  const series = [];
  for (let i = 0; i < regions.length; i++) {
    const data = await getInfectionIncidenceForOne(
      disease,
      regions[i],
      startYear,
      endYear
    );
    series.push({ name: regions[i], data: data, id: regions[i] });
  }
  return series;
};

export const getInfectionIncidenceForOne = async (
  disease,
  region,
  startYear,
  endYear
) => {
  console.log(disease, region, startYear, endYear);
  if (Array.isArray(region) ? region[0] === 'Uusimaa' : region === 'Uusimaa') {
    const uusimaaValues = await getUusimaaInfectionIncidence(
      disease,
      startYear,
      endYear
    );
    return uusimaaValues;
  }
  const diseaseFilter = getDiseaseFilter(disease);
  const regionFilter = getRegionFilter(region);
  const yearFilter = getYearFilter(startYear, endYear);
  const url = `https://sampo.thl.fi/pivot/prod/en/ttr/cases/fact_ttr_cases.json?row=nidrreportgroup-${diseaseFilter}&row=wscmunicipality2022-${regionFilter}&column=yearmonth-${yearFilter}&filter=measure-931297&fo=1`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.dataset.dimension.yearmonth) {
    console.error('No data found with these params');
    return [];
  }
  const years = Object.values(data.dataset.dimension.yearmonth.category.label)
    .map(y => parseInt(y.split('Year ')[1]))
    .toSorted();
  const values = Object.values(data.dataset.value).map(val => parseFloat(val));
  const d = [];
  for (let i = 0; i < years.length; i++) {
    d.push([years[i], values[i]]);
  }
  return d;
};

const getUusimaaInfectionIncidence = async (disease, startYear, endYear) => {
  const d = [];
  for (let year = startYear; year <= endYear; year++) {
    const value = await getUusimaaIncidenceForOneYear(disease, year);
    d.push([year, value]);
  }
  return d;
};

export const getInfectionDataForWholeCountryOneYear = async (disease, year) => {
  const diseaseFilter = getDiseaseFilter(disease);
  const yearFilter = getYearFilter(year);
  const url = `https://sampo.thl.fi/pivot/prod/en/ttr/cases/fact_ttr_cases.json?row=nidrreportgroup-${diseaseFilter}&row=wscmunicipality2022-737101.878375.737097.737098.737093.737104.737096.877884.737094.877907.737095.878208.878211.737103.737092.737100.737099.&column=yearmonth-${yearFilter}&filter=measure-931297&fo=1`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.dataset.dimension.yearmonth) {
    console.error('No data found with these params');
    return [];
  }
  const d = [];
  Object.keys(
    data.dataset.dimension.wscmunicipality2022.category.index
  ).forEach(ind => {
    const countyName = Object.entries(regionIndices).find(
      entry => entry[1] === ind
    )[0];
    const hcKey = getHcKey(countyName);
    const valInd =
      data.dataset.dimension.wscmunicipality2022.category.index[ind];
    const val = data.dataset.value[valInd];
    d.push([hcKey, val]);
  });
  const uusimaa = await getUusimaaIncidenceForOneYear(disease, year);
  d.push([getHcKey('Uusimaa'), uusimaa]);
  return d;
};

const getUusimaaIncidenceForOneYear = async (disease, year) => {
  const diseaseFilter = getDiseaseFilter(disease);
  const yearFilter = getYearFilter(year);
  // cases
  const url = `https://sampo.thl.fi/pivot/prod/en/ttr/cases/fact_ttr_cases.json?row=nidrreportgroup-${diseaseFilter}&row=wscmunicipality2022-878189.878228.877978.877844.877893.&column=yearmonth-${yearFilter}.&filter=measure-877837&fo=1#`;
  const res1 = await fetch(url);
  const caseData = await res1.json();
  if (!caseData.dataset.dimension.yearmonth) {
    console.error('No data found with these params');
    return [];
  }
  const cases = Object.values(caseData.dataset.value).reduce(
    (accum, curr) => accum + parseInt(curr),
    0
  );
  // // population
  // const url2 = `https://sampo.thl.fi/pivot/prod/en/ttr/cases/fact_ttr_cases.json?row=nidrreportgroup-${diseaseFilter}&row=wscmunicipality2022-878189.878228.877978.877844.877893.&column=yearmonth-${yearFilter}.&filter=measure-433796&fo=1#`;
  // const res2 = await fetch(url2);
  // const popData = await res2.json();
  // const population = Object.values(popData.dataset.value).reduce(
  //   (accum, curr) => accum + parseInt(curr),
  //   0
  // );
  // calculate ratio
  const ratio = (cases * 100000) / uusimaaData.population[year];
  return parseFloat(ratio.toFixed(2));
};
