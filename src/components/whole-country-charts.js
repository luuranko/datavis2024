import { LitElement, html, css } from 'lit';
import { Task } from '@lit/task';
import { getEmptyMapData, getFinlandTopology } from '../dataService';
import { getInfectionDataForWholeCountryOneYear } from '../dataService';
import Highcharts from 'highcharts/highmaps';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import { minYear, maxYear } from '../globals';

export class WholeCountryCharts extends LitElement {
  static get properties() {
    return {
      currentYear: { type: Number },
      currentDisease: { type: String },
    };
  }

  constructor() {
    super();
    this.currentYear = maxYear;
    this.finlandTopology = null;
    this.infectionData = null;
    this.currentDisease = null;
  }

  _fetchInfectionDataTask = new Task(this, {
    task: async () => {
      if (!this.finlandTopology) this.finlandTopology = getFinlandTopology();
      const data = {
        year: this.currentYear,
        disease: this.currentDisease,
      };
      if (this.currentDisease) {
        const infections = await getInfectionDataForWholeCountryOneYear(
          this.currentDisease,
          this.currentYear
        );
        data.series = infections;
      } else {
        data.series = getEmptyMapData();
      }
      this.infectionData = data;
      this.updateChart();
      return data;
    },
    args: () => [this.currentYear, this.currentDisease],
  });

  render() {
    return html`
      <div id="page">
        ${this.getYearSelection()}
        <div id="charts">
          <div id="country-infections"></div>
          <div id="country-healthcare"></div>
        </div>
        ${this._fetchInfectionDataTask.render({
          initial: () => html`waiting...`,
          pending: () => html`Loading`,
          complete: () => '',
          error: e => html`error ${e}`,
        })}
      </div>
    `;
  }

  firstUpdated() {
    this.finlandMapProvinces();
  }

  getYearSelection() {
    const years = [];
    for (let i = minYear; i <= maxYear; i++) {
      years.push(html` <sl-option value=${i}>${i}</sl-option> `);
    }
    return html`
      <div id="year-selection">
        <sl-icon-button
          name="caret-left-fill"
          label="Go backward one year"
          ?disabled=${this.currentYear - 1 < minYear}
          @click=${() => this.moveYearSelection(-1)}></sl-icon-button>
        <sl-select
          value=${this.currentYear}
          label="Select year"
          @sl-change=${e => this.switchSelectedYear(e)}>
          ${years}
        </sl-select>
        <sl-icon-button
          name="caret-right-fill"
          label="Go forward one year"
          ?disabled=${this.currentYear + 1 > maxYear}
          @click=${() => this.moveYearSelection(1)}>
        </sl-icon-button>
      </div>
    `;
  }

  switchSelectedYear(e) {
    this.currentYear = parseInt(e.target.value);
  }

  moveYearSelection(amount) {
    const target = this.currentYear + amount;
    if (target < minYear || target > maxYear) return;
    this.currentYear = target;
  }

  finlandMapProvinces() {
    const pureValues = this.infectionData.series.map(entry => entry[1]);
    const dataMin = pureValues.length > 0 ? Math.min(...pureValues) : null;
    const dataMax = pureValues.length > 0 ? Math.max(...pureValues) : null;
    const container = this.shadowRoot.querySelector('#country-infections');
    this.chart = Highcharts.mapChart(container, {
      chart: {
        map: this.finlandTopology,
      },
      credits: { enabled: false },
      title: {
        text: ``,
      },
      subtitle: { text: '' },
      // mapNavigation: {
      //   enabled: true,
      //   buttonOptions: {
      //     verticalAlign: 'bottom',
      //   },
      // },
      colorAxis: {
        min: dataMin,
        max: dataMax,
      },
      tooltip: { enabled: false },
      series: [
        {
          data: this.infectionData.series,
          name: 'Cases per 100 000 inhabitants',
          states: {
            hover: {
              borderColor: 'black',
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

  updateChart() {
    if (!this.chart) return;
    const pureValues = this.infectionData.series.map(entry => entry[1]);
    const dataMin = pureValues.length > 0 ? Math.min(...pureValues) : null;
    const dataMax = pureValues.length > 0 ? Math.max(...pureValues) : null;
    this.chart.colorAxis[0].update({
      min: dataMin,
      max: dataMax,
    });
    this.chart.series[0].setData(this.infectionData.series);
    this.chart.title.textStr = this.infectionData.disease
      ? `${this.infectionData.disease.replaceAll('_', ' ')} in ${
          this.infectionData.year
        }`
      : ``;
    this.chart.subtitle.textStr = this.infectionData.disease
      ? 'Cases per 100 000 inhabitants'
      : '';
    this.chart.tooltip.options.enabled = this.infectionData.disease;
    this.chart.redraw();
  }

  static styles = [
    css`
      #page {
        height: 100%;
        width: 100%;
      }
      #year-selection {
        display: flex;
        align-content: center;
        justify-content: center;
        margin-bottom: 0.5rem;
      }
      #charts {
        display: grid;
        grid-template-rows: 1fr 1fr;
      }
      #country-infections {
        height: 45vh;
      }
      #country-healthcare {
        background-color: pink;
      }
      sl-select {
        width: 8rem;
      }
      sl-icon-button {
        font-size: 1.5rem;
        margin-top: 1.3rem;
      }
    `,
  ];
}
customElements.define('whole-country-charts', WholeCountryCharts);
