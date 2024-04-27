import { LitElement, css, html } from 'lit';
import Highcharts from 'highcharts/highmaps';
import {
  getPopulationByRegion,
  getRegions,
  getInfectionNumbers,
  setUpIndices,
  getDiseaseList,
  wellbeingToStateMap,
  getCountyData,
} from './dataService';
import { Task } from '@lit/task';
import '@shoelace-style/shoelace/dist/components/button/button';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';

export class MyElement extends LitElement {
  static get properties() {
    return {
      selectedDisease: { type: String },
      selectedYear: { type: String },
      selectedCounty: { type: String },
    };
  }

  constructor() {
    super();
    this.chart = null;
    this.regions = {};
    this.populationData = {};
    this.infectionData = null;
    this.selectedDisease = 'Norovirus';
    this.selectedYear = 2022;
    this.selectedCounty = null;
    this.diseases = [];
  }

  connectedCallback() {
    super.connectedCallback();
    this._fetchPopulationTask.run();
  }

  _fetchPopulationTask = new Task(this, {
    task: async () => {
      this.finlandTopology = await fetch(
        'https://code.highcharts.com/mapdata/countries/fi/fi-all.topo.json'
      ).then(response => response.json());
      this.regions = await getRegions();
      this.populationData = await getPopulationByRegion();
      console.log(this.populationData);
      await setUpIndices();
      this.diseases = getDiseaseList();
      this._fetchInfectionDataTask.run();
    },
    args: () => [],
  });

  _fetchInfectionDataTask = new Task(this, {
    task: async () => {
      const data = await this.getMapData(
        this.selectedDisease,
        this.selectedYear
      );
      this.infectionData = data;
      return data;
    },
    args: () => [this.selectedDisease, this.selectedYear],
  });

  _fetchCountyDataTask = new Task(this, {
    task: async () => {
      const data = await getCountyData(this.selectedCounty);
      return data;
    },
    args: () => [this.selectedCounty],
  });

  async getMapData(disease, year) {
    console.log(disease, year);
    const d = [];
    for (let i = 0; i < Object.values(this.regions).length; i++) {
      const r = Object.values(this.regions)[i];
      const stateName = wellbeingToStateMap[r.name];
      if (stateName && r.name !== 'Uusimaa') {
        const hcKey = this.finlandTopology.objects.default.geometries.find(
          g => g.properties.name === stateName
        ).properties['hc-key'];
        const values = await getInfectionNumbers([disease], [r.name], [year]);
        const val = values[0];
        const existing = d.find(el => el[0] === hcKey);
        if (existing) {
          existing[1] += val;
        } else {
          d.push([hcKey, val]);
        }
      }
    }
    d.forEach(entry => {
      const stateName = this.finlandTopology.objects.default.geometries.find(
        g => g.properties['hc-key'] === entry[0]
      ).properties.name;
      const wbcName = Object.entries(wellbeingToStateMap).find(
        e => e[1] === stateName
      )[0];
      const population = Object.values(this.populationData).find(
        r => r.name === wbcName
      ).population[year];
      const ratio = (entry[1] / population) * 1000;
      const rounded = Number.parseFloat(ratio.toFixed(2));
      console.log(typeof ratio, typeof rounded);
      console.log(stateName, wbcName, rounded, entry[1], population);
      entry[1] = rounded;
    });
    const data = { year, disease, series: d };
    console.log(data);
    return data;
  }

  finlandMapProvinces(data) {
    const topology = this.finlandTopology;
    const container = this.shadowRoot.querySelector('#container2');
    this.chart = Highcharts.mapChart(container, {
      chart: {
        map: topology,
      },
      title: {
        text: `${data.disease} in ${data.year}`,
      },
      subtitle: { text: 'Cases per 1000 inhabitants' },
      mapNavigation: {
        enabled: true,
        buttonOptions: {
          verticalAlign: 'bottom',
        },
      },
      colorAxis: {
        min: 0,
      },
      series: [
        {
          data: data.series,
          name: 'Cases per 1000 inhabitants',
          allowPointSelect: true,
          states: {
            hover: {
              color: '#BADA55',
            },
            select: {
              color: '#EFFFEF',
              borderColor: 'black',
              dashStyle: 'dot',
            },
          },
          dataLabels: {
            enabled: true,
            format: '{point.name}',
          },
        },
      ],
    });
  }

  populationDataLineChart(region) {
    console.log('getting poopulation');
    // one series: [ [x, y], [x, y]]
    const data = [];
    // Object.keys(this.populationData).forEach(r =>
    //   console.log(
    //     this.populationData[r].name,
    //     region,
    //     typeof this.populationData[r].name,
    //     typeof region,
    //     this.populationData[r].name === region
    //   )
    // );
    const ind = Object.keys(this.populationData).find(
      r => this.populationData[r].name === region
    );
    console.log(ind);
    const pop = this.populationData[ind].population;

    console.log(pop);
    data.push({
      name: region,
      data: Object.entries(pop),
    });
    return data;
  }

  countyChart(region) {
    const container = this.shadowRoot.querySelector('#container1');
    console.log(region);
    const data = this.populationDataLineChart(region);
    console.log(data);
    Highcharts.chart(container, {
      title: {
        text: `${region}`,
      },
      chart: {
        type: 'spline',
      },
      legend: {
        reversed: true,
        layout: 'vertical',
        align: 'right',
        verticalAlign: 'middle',
      },
      xAxis: {
        title: {
          text: 'Year',
        },
        // type: 'datetime',
        // units: [['year']],
        // labels: {
        //   formatter: function () {
        //     return this.value + ' ' + this.chart.series[0].data.x;
        //   },
        // },
      },
      yAxis: {
        min: 0,
        labels: { format: '{value}' },
        title: 'Population',
      },
      plotOptions: {
        spline: {
          dataLabels: {
            enabled: false,
          },
          marker: {
            enabled: false,
          },
        },
      },
      series: data,
    });
  }
  demoChart() {
    const container = this.shadowRoot.querySelector('#container');
    this.chart = Highcharts.chart(container, {
      title: {
        text: 'Kiva kaavio',
      },
      chart: {
        type: 'bar',
      },
      xAxis: {
        categories: ['Apples', 'Bananas', 'Oranges'],
      },
      yAxis: {
        title: {
          text: 'Fruit eaten',
        },
      },
      series: [
        {
          name: 'Jane',
          data: [1, 0, 4],
        },
        {
          name: 'John',
          data: [5, 7, 3],
        },
      ],
    });
  }

  static get styles() {
    return css`
      :host {
        width: 1200px;
      }
      #page {
        overflow-y: auto;
      }
      #container1 {
        width: 100%;
        // height: 400px;
        border: 1px dotted grey;
      }
      #container2 {
        height: 1000px;
      }
      #page {
        display: grid;
        grid-template-columns: 1fr 2fr 2fr;
      }
    `;
  }

  switchSelectedDisease = e => {
    const name = e.target.value.replaceAll('_', ' ');
    console.log(name);
    this.selectedDisease = name;
  };

  switchSelectedYear = e => {
    const year = e.target.value.replaceAll('_', ' ');
    console.log(year);
    this.selectedYear = year;
  };

  getOption(value) {
    return html`<sl-option value=${value.toString().replaceAll(' ', '_')}
      >${value}</sl-option
    >`;
  }

  getFilters() {
    const diseaseOptions = [];
    this.diseases.sort().forEach(d => diseaseOptions.push(this.getOption(d)));
    const years = [];
    for (let i = 1996; i <= 2022; i++) {
      years.push(this.getOption(i));
    }
    const sel = diseaseOptions.find(d => d.values[1] === this.selectedDisease)
      ?.values[0];
    return html` <div>
      <sl-select
        label="Select disease"
        @sl-change=${e => this.switchSelectedDisease(e)}
        value=${sel}>
        ${diseaseOptions}
      </sl-select>
      <sl-select
        label="Select year"
        @sl-change=${e => this.switchSelectedYear(e)}
        value=${this.selectedYear}>
        ${years}
      </sl-select>
    </div>`;
  }
  // this.populationChart(Object.keys(this.regions));

  handleMapClick() {
    if (this.chart.getSelectedPoints().length === 0) return;
    const county = this.chart.getSelectedPoints()[0].name;
    console.log(county);
    if (this.selectedCounty === county) {
      return;
    }
    this.selectedCounty = county;
  }

  render() {
    console.log(this.selectedDisease);
    return html`<div id="page">
      <div id="filters">${this.getFilters()}</div>
        <div id="container2" @click=${this.handleMapClick}>map goes here</div>
      <div id="container1">Region data goes here</div>
        ${this._fetchPopulationTask.render({
          initial: () => html`waiting...`,
          pending: () => html`Loading`,
          complete: () =>
            html` <div>
              ${this._fetchInfectionDataTask.render({
                pending: () => html`loading infection data`,
                complete: data => this.finlandMapProvinces(data),
              })}
              ${this._fetchCountyDataTask.render({
                pending: () => html`loading county data`,
                complete: data => {
                  this.selectedCounty ? this.countyChart(data) : '';
                },
              })}
            </div>`,
          error: () => html`error`,
        })}
      </div>
    </div>`;
  }
  // ${this.populationChart(Object.keys(this.regions))}
}

window.customElements.define('my-element', MyElement);
