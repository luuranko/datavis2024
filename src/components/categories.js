export const healthcareCategories = {
  Visits: {
    valueType: 'Visits per 1000 inhabitants',
    metrics: [
      {
        id: 4123,
        name: 'Outpatient medical visits (physicians) in primary health care',
        fi: 'Perusterveydenhuollon avosairaanhoidon lääkärikäynnit yhteensä',
        context: 'Primary health care',
      },
      {
        id: 1552,
        name: 'Outpatient physician visits in primary health care',
        fi: 'Perusterveydenhuollon avohoidon kaikki lääkärikäynnit',
        context: 'Primary health care',
      },
      {
        id: 5077,
        name: 'Outpatient specialised health care visits (emergency)',
        fi: 'Päivystyskäynnit erikoissairaanhoidossa',
        context: 'Specialised health care',
      },
      {
        id: 1560,
        name: 'Outpatient visits in specialised health care',
        fi: 'Erikoissairaanhoidon avohoitokäynnit',
        context: 'Specialised health care',
      },
      {
        id: 1561,
        name: 'Outpatient visits in specialised somatic health care',
        fi: 'Somaattisen erikoissairaanhoidon avohoitokäynnit',
        context: 'Specialised health care',
      },
    ],
  },
  Patients: {
    valueType: 'Patients per 1000 inhabitants',
    metrics: [
      {
        id: 1268,
        name: 'Inpatient primary health care patients',
        fi: 'Perusterveydenhuollon vuodeosastohoidon potilaat',
        context: 'Primary health care',
      },
      {
        id: 1256,
        name: 'Hospital care patients',
        fi: 'Sairaalahoidon potilaat',
        context: 'Hospital care',
      },
      {
        id: 1260,
        name: 'Specialised somatic inpatient health care patients',
        fi: 'Somaattisen erikoissairaanhoidon vuodeosastohoidon potilaat',
        context: 'Specialised health care',
      },
      {
        id: 1556,
        name: 'Patients seen by a physician in primary health care',
        fi: 'Perusterveydenhuollon avohoidon lääkärin potilaat yhteensä',
        context: 'Primary health care',
      },
    ],
  },
  'Length of stay': {
    valueType: 'Avg. length of stay in days',
    metrics: [
      {
        id: 1266,
        name: 'Inpatient primary health care duration',
        fi: 'Perusterveydenhuollon vuodeosastohoito',
        context: 'Primary health care',
      },
      {
        id: 1254,
        name: 'Hospital care duration',
        fi: 'Sairaalahoito',
        context: 'Hospital care',
      },
      {
        id: 1258,
        name: 'Specialised somatic inpatient health care duration',
        fi: 'Somaattisen erikoissairaanhoidon vuodeosastohoito',
        context: 'Specialised health care',
      },
    ],
  },
};

export const getAllMetricsGroupedByContext = () => {
  const contexts = Array.from(
    new Set(
      Object.values(healthcareCategories)
        .map(c => c.metrics)
        .flat()
        .map(m => m.context)
    )
  );
  const obj = {};
  contexts.forEach(context => {
    const list = Object.values(healthcareCategories)
      .map(c => c.metrics)
      .flat()
      .filter(m => m.context === context);
    obj[context] = list;
  });
  return obj;
};

export const getAllMetricsOfContext = context => {
  return Object.values(healthcareCategories)
    .map(c => c.metrics)
    .flat()
    .filter(m => m.context === context);
};

export const getMetricsByCategoryAndContext = (category, context) => {
  return healthcareCategories[category].metrics.filter(
    m => m.context === context
  );
};

export const getMetricById = id => {
  return Object.values(healthcareCategories)
    .find(c => c.metrics.find(m => m.id === id))
    .metrics.find(m => m.id === id);
};

export const getCategoryOfMetricById = id => {
  return Object.values(healthcareCategories).find(c =>
    c.metrics.find(m => m.id === id)
  );
};
