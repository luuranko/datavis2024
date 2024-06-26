# Interactive Data Visualization 2024

Project for course Interactive Data Visualization

Tool for visualizing data for infectious diseases and healthcare in Finland

Online link: [Render](https://datavisproject2024.onrender.com/)

When opening the app for the first time it loads needed basic data and saves it
to local storage. Connection issues to the required services may prevent the
page from loading.

The page is mainly designed to be used on Firefox.

## Local installation

System requirements: Node 20+, npm version 10+

Clone the project and run `npm install` in project root. Then run `npm run dev`
and open the specified localhost port (5173 by default).

## Data sources

Infectious diseases data by
[THL Infectious Diseases Register](https://thl.fi/tilastot-ja-data/aineistot-ja-palvelut/avoin-data#Tartuntataudit)

Healthcare and population data by
[Sotkanet](https://sotkanet.fi/sotkanet/en/index?), used indicators: 127, 4123,
1552, 5077, 1560, 1561, 1268, 1256, 1260, 1556, 1266, 1254, 1258
