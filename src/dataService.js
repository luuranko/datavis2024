import { minYear, maxYear } from './globals';
import { healthcareCategories } from './categories';
import { diseases } from './diseases';

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
let regionIndices = null;
let sotkanetCountyIndices = null;
let finlandTopology = null;
let uusimaaData = null;

const getSotkanetYearsFilterString = (startYear, endYear) => {
  const years = [];
  for (let year = startYear; year <= endYear; year++) {
    years.push(`&years=${year}`);
  }
  return years.join('');
};

const getUusimaaData = async () => {
  const fromLocalStorage = localStorage.getItem('uusimaaData');
  if (!fromLocalStorage) {
    uusimaaData = { population: {} };
    const url = `https://sotkanet.fi/rest/1.1/json?indicator=${127}${getSotkanetYearsFilterString(
      minYear,
      maxYear
    )}&genders=total`;
    const res = await fetch(url);
    const data = await res.json();
    Object.values(data)
      .filter(entry => entry.region === 488)
      .forEach(entry => {
        uusimaaData.population[entry.year] = entry.value;
      });
    localStorage.setItem('uusimaaData', JSON.stringify(uusimaaData));
  } else {
    uusimaaData = JSON.parse(fromLocalStorage);
  }
  return uusimaaData;
};

const getYearIndices = async () => {
  const fromLocalStorage = localStorage.getItem('yearIndices');
  if (!fromLocalStorage) {
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
    localStorage.setItem('yearIndices', JSON.stringify(yearIndices));
  } else {
    yearIndices = JSON.parse(fromLocalStorage);
  }
  return yearIndices;
};

const getRegionIndices = async () => {
  const fromLocalStorage = localStorage.getItem('regionIndices');
  if (!fromLocalStorage) {
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
    localStorage.setItem('regionIndices', JSON.stringify(regionIndices));
  } else {
    regionIndices = JSON.parse(fromLocalStorage);
  }
  return regionIndices;
};

const getSotkanetCountyIndices = async () => {
  const fromLocalStorage = localStorage.getItem('sotkanetCountyIndices');
  if (!fromLocalStorage) {
    sotkanetCountyIndices = {};
    const url = `https://sotkanet.fi/rest/1.1/regions`;
    const res = await fetch(url);
    const data = await res.json();
    data
      .filter(entry => entry.category === 'MAAKUNTA')
      .forEach(entry => (sotkanetCountyIndices[entry.title.en] = entry.id));
    localStorage.setItem(
      'sotkanetCountyIndices',
      JSON.stringify(sotkanetCountyIndices)
    );
  } else {
    sotkanetCountyIndices = JSON.parse(fromLocalStorage);
  }
  return sotkanetCountyIndices;
};

export const setUpIndices = async () => {
  const start = new Date();
  if (!finlandTopology) await setUpFinlandTopology();
  if (!uusimaaData) await getUusimaaData();
  if (!yearIndices) yearIndices = await getYearIndices();
  if (!regionIndices) regionIndices = await getRegionIndices();
  if (!sotkanetCountyIndices)
    sotkanetCountyIndices = await getSotkanetCountyIndices();
  const end = new Date();
  const time = end - start;
};

const setUpFinlandTopology = async () => {
  const fromLocalStorage = localStorage.getItem('finlandTopology');
  if (!fromLocalStorage) {
    finlandTopology = await fetch(
      'https://code.highcharts.com/mapdata/countries/fi/fi-all.topo.json'
    ).then(response => response.json());
    localStorage.setItem('finlandTopology', JSON.stringify(finlandTopology));
  } else {
    finlandTopology = JSON.parse(fromLocalStorage);
  }
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
  if (!Array.isArray(diseases)) return `${diseases.index}.`;
  return diseases.length === 1
    ? `${diseases.index}.`
    : diseases.map(d => d.index).join('.');
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
      name: diseases[i].displayName,
      data: data,
      id: diseases[i].index,
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
    if (value !== null) d.push([year, value]);
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
    return null;
  }
  const cases = Object.values(caseData.dataset.value).reduce(
    (accum, curr) => accum + parseInt(curr),
    0
  );
  // calculate ratio
  const ratio = (cases * 100000) / uusimaaData.population[year];
  return parseFloat(ratio.toFixed(1));
};

const getSotkanetDataForOneRegion = async (ind, regionIndex, yearFilter) => {
  const url = `https://sotkanet.fi/rest/1.1/json?indicator=${ind}${yearFilter}&genders=total`;
  const res = await fetch(url);
  const data = await res.json();
  const values = data
    .filter(entry => entry.region === regionIndex)
    .toSorted((a, b) => a.year - b.year)
    .map(entry => [entry.year, entry.value]);
  return values;
};

export const getHealthcareDataForManyRegions = async (
  ind,
  regions,
  startYear,
  endYear
) => {
  const series = [];
  const regionIndices = regions.map(region => sotkanetCountyIndices[region]);
  const years = getSotkanetYearsFilterString(startYear, endYear);
  const url = `https://sotkanet.fi/rest/1.1/json?indicator=${ind}${years}&genders=total`;
  const res = await fetch(url);
  const data = await res.json();
  const values = data
    .filter(entry => regionIndices.includes(entry.region))
    .toSorted((a, b) => a.year - b.year);
  regions.forEach(region => {
    const data = values
      .filter(val => val.region === sotkanetCountyIndices[region])
      .map(val => [val.year, val.value]);
    series.push({ name: region, id: region, data: data });
  });
  return series;
};

export const getHealthcareDataForRegionByCategory = async (
  category,
  region,
  startYear,
  endYear
) => {
  const series = [];
  const regionIndex = sotkanetCountyIndices[region];
  const years = getSotkanetYearsFilterString(startYear, endYear);
  for (let i = 0; i < healthcareCategories[category].metrics.length; i++) {
    const metric = healthcareCategories[category].metrics[i];
    const { id, name } = metric;
    const data = await getSotkanetDataForOneRegion(id, regionIndex, years);
    series.push({ name, data });
  }
  return series;
};

export const getHealthcareDataWholeCountry = async (ind, year) => {
  const regionIndices = Array.from(
    new Set(Object.values(wellbeingToStateMap))
  ).map(
    region =>
      sotkanetCountyIndices[
        Object.entries(wellbeingToStateMap).find(r => r[1] === region)[0]
      ]
  );
  const years = getSotkanetYearsFilterString(year, year);
  const url = `https://sotkanet.fi/rest/1.1/json?indicator=${ind}${years}&genders=total`;
  const res = await fetch(url);
  const data = await res.json();
  const values = data
    .filter(entry => regionIndices.includes(entry.region))
    .map(entry => [
      getHcKey(
        Object.entries(sotkanetCountyIndices).find(
          i => i[1] === entry.region
        )[0]
      ),
      entry.value,
    ]);
  return values;
};
