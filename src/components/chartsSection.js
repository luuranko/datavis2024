import { LitElement, css, html } from 'lit';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import { getDiseaseList } from '../dataService';
import './infectionTimeSeries';
import { minYear, maxYear } from '../globals';

import { Task } from '@lit/task';
export class ChartsSection extends LitElement {
  static properties = {
    selectedRegions: { type: Array },
    selectedDiseases: { type: Array },
    startYear: { type: Number },
    endYear: { type: Number },
  };

  constructor() {
    super();
    this.selectedRegions = ['North Karelia'];
    this.selectedDiseases = ['Norovirus'];
    this.startYear = minYear;
    this.endYear = maxYear;
    this.infectionData = {};
    this.healthCareData = {};
    this.diseases = {};
  }

  async connectedCallback() {
    super.connectedCallback();
    await this._setUpTask.run();
  }

  _setUpTask = new Task(this, {
    task: async () => {
      this.diseases = getDiseaseList();
    },
    args: () => [],
    autoRun: false,
  });

  _fetchHealthcareDataTask = new Task(this, {
    task: async () => {
      this.healthCareData = {};
      return this.healthCareData;
    },
    args: () => [this.selectedRegions, this.startYear, this.endYear],
  });

  render() {
    return this._setUpTask.render({
      initial: () => html`Loading`,
      pending: () => html`Loading`,
      complete: () => this.getContent(),
      error: e => html`Error ${e}`,
    });
  }

  getContent() {
    return html`
      <div id="page">
        ${this.getYearSelection()}
        <div class="charts">
          <div id="diseases-selection">${this.getDiseaseFilters()}</div>
          <div id="diseases-chart" class="chart-container">
            <infection-time-series
              .selectedDiseases=${this.selectedDiseases}
              .selectedRegions=${this.selectedRegions}
              .startYear=${this.startYear}
              .endYear=${this.endYear}></infection-time-series>
          </div>
          <div>Healthcare filters go here</div>
          <div class="healthcare-section">
            <div id="healthcare-patients-chart" class="chart-container"></div>
            <div id="healthcare-days-chart" class="chart-container"></div>
          </div>
        </div>
      </div>
    `;
  }

  getYearSelection() {
    const getYears = (min, max) => {
      const years = [];
      for (let i = min; i <= max; i++) {
        years.push(html` <sl-option value=${i}>${i}</sl-option> `);
      }
      return years;
    };
    const changeStartYear = year => {
      if (year <= this.endYear) this.startYear = year;
    };
    const changeEndYear = year => {
      if (year >= this.startYear) this.endYear = year;
    };
    return html`
      <div id="timespan-selection">
        <sl-select
          label="Select start year"
          value=${this.startYear}
          @sl-change=${e => changeStartYear(e.target.value)}>
          ${getYears(minYear, this.endYear)}
        </sl-select>
        <sl-select
          label="Select end year"
          value=${this.endYear}
          @sl-change=${e => changeEndYear(e.target.value)}>
          ${getYears(this.startYear, maxYear)}
        </sl-select>
      </div>
    `;
  }

  getDiseaseFilters() {
    const options = Object.keys(this.diseases).map(d => {
      return html`<sl-option value=${this.diseases[d]}>${d}</sl-option>`;
    });
    const selectedValue = this.selectedDiseases.map(d =>
      d.replaceAll(' ', '_')
    );
    return html`<div id="diseases-selection">
      <sl-select
        label="Select diseases"
        ?hoist=${true}
        ?multiple=${true}
        .value=${selectedValue}
        @sl-change=${e => this.switchSelectedDiseases(e)}>
        ${options}
      </sl-select>
    </div> `;
  }

  switchSelectedDiseases(e) {
    this.selectedDiseases = Array.isArray(e.target.value)
      ? e.target.value
      : [e.target.value];
    const options = {
      bubbles: true,
      composed: true,
      detail: {
        diseases: this.selectedDiseases,
      },
    };
    this.dispatchEvent(new CustomEvent('change-selected-diseases', options));
  }

  static get styles() {
    return css`
      #page {
        height: 100%;
        width: 100%;
      }
      sl-select {
        /* width: 8rem; */
      }
      .charts {
        display: grid;
        grid: 1fr 1fr / 1fr 3fr;
      }
      .healthcare-section {
        display: grid;
        grid-template-rows: 1fr 1fr;
      }
      #timespan-selection {
        display: grid;
        grid-template-columns: 1fr 1fr;
        margin: 0 auto 0.5rem;
        min-width: min-content;
        max-width: 100%;
      }
      #diseases-selection {
        background-color: lightblue;
        padding: 0.5rem;
      }
      #diseases-chart {
        background-color: pink;
      }
      #healthcare-patients-chart {
        background-color: lightgreen;
      }
      #healthcare-days-chart {
        background-color: lightyellow;
      }
    `;
  }
}

window.customElements.define('charts-section', ChartsSection);
