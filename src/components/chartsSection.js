import { LitElement, css, html } from 'lit';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/radio-group/radio-group.js';
import '@shoelace-style/shoelace/dist/components/radio/radio.js';
import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js';
import { diseases, findDiseaseByIndex } from '../diseases';
import './infectionTimeSeries';
import './healthcareTimeSeries';
import { minYear, maxYear } from '../globals';
import { getAllMetricsGroupedByContext, getMetricById } from '../categories';

export class ChartsSection extends LitElement {
  static properties = {
    selectedRegions: { type: Array },
    selectedDiseases: { type: Array },
    currentDisease: { type: String },
    healthcareCategory: { type: String },
    currentHealthcareMetric: { type: Object },
    healthcareContext: { type: String },
    startYear: { type: Number },
    endYear: { type: Number },
  };

  constructor() {
    super();
    this.selectedRegions = [];
    this.selectedDiseases = [];
    this.currentDisease = null;
    this.healthcareCategory = 'Visits';
    this.healthcareContext = Object.keys(getAllMetricsGroupedByContext())[0];
    this.currentHealthcareMetric = null;
    this.startYear = minYear;
    this.endYear = maxYear;
  }

  render() {
    return this.getContent();
  }

  getContent() {
    return html`
      <div id="page">
        ${this.getYearSelection()}
        <div class="charts">
          <div id="diseases-chart" class="chart-container">
            <infection-time-series
              .selectedDiseases=${this.selectedDiseases}
              .currentDisease=${this.currentDisease}
              .selectedRegions=${this.selectedRegions}
              .startYear=${this.startYear}
              .endYear=${this.endYear}></infection-time-series>
          </div>
          <div id="disease-selection-container">
            ${this.getDiseaseFilters()}
          </div>
          <div id="healthcare">
            <healthcare-time-series
              .selectedRegions=${this.selectedRegions}
              .startYear=${this.startYear}
              .endYear=${this.endYear}
              .currentCategory=${this.healthcareCategory}
              .healthcareContext=${this.healthcareContext}
              @change-healthcare-category=${e =>
                (this.healthcareCategory =
                  e.detail.healthcareCategory)}></healthcare-time-series>
          </div>
          <div id="healthcare-filters-container">
            ${this.getHealthcareFilters()}
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
      if (year <= this.endYear) this.startYear = parseInt(year);
    };
    const changeEndYear = year => {
      if (year >= this.startYear) this.endYear = parseInt(year);
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
    const options = diseases.map(d => {
      return html`<sl-option value=${`${d.index}`}
        >${d.displayName}</sl-option
      >`;
    });
    const selectedValue = this.selectedDiseases.map(d => `${d.index}`);
    return html`<div id="diseases-selection">
      <sl-select
        label="Select diseases"
        ?hoist=${true}
        ?multiple=${true}
        .value=${selectedValue}
        @sl-change=${e => this.switchSelectedDiseases(e)}>
        ${options}
      </sl-select>
      ${this.getSelectCurrentDiseaseFilter()}
    </div> `;
  }

  getSelectCurrentDiseaseFilter() {
    if (this.selectedDiseases.length < 2 || !this.currentDisease) return '';
    const selectedOptions = this.selectedDiseases.map(d => {
      return html`<sl-radio value=${`${d.index}`}>${d.displayName}</sl-radio>`;
    });
    return html`
      <sl-radio-group
        label="Compare regions by"
        name="Select current disease"
        value=${`${this.currentDisease.index}`}
        @sl-change=${e => this.switchCurrentDisease(e)}>
        ${selectedOptions}
      </sl-radio-group>
    `;
  }

  getHealthcareFilters() {
    const metricsByContext = getAllMetricsGroupedByContext();
    const contexts = Object.keys(metricsByContext);
    return html`
      <div id="healthcare-filters">
        <sl-select
          label="Select healthcare context"
          value=${this.healthcareContext.replaceAll(' ', '_')}
          name="Select healthcare context"
          placement="bottom"
          @sl-change=${e =>
            (this.healthcareContext = e.target.value.replaceAll('_', ' '))}>
          ${contexts.map(c => {
            return html`
              <sl-option value=${c.replaceAll(' ', '_')}>${c}</sl-option>
            `;
          })}
        </sl-select>
        <sl-select
          label="Compare regions by"
          value=${this.currentHealthcareMetric?.context ===
          this.healthcareContext
            ? this.currentHealthcareMetric?.id
            : null}
          name="Select healthcare metric"
          placement="bottom"
          @sl-change=${e => this.switchCurrentHealthcareMetric(e)}>
          ${metricsByContext[this.healthcareContext].map(m => {
            return html` <sl-option value=${m.id}>${m.name}</sl-option> `;
          })}
        </sl-select>
      </div>
    `;
  }

  switchCurrentDisease(e) {
    this.currentDisease = findDiseaseByIndex(parseInt(e.target.value));
    const options = {
      bubbles: true,
      composed: true,
      detail: { currentDisease: this.currentDisease },
    };
    this.dispatchEvent(new CustomEvent('change-current-disease', options));
  }

  switchCurrentHealthcareMetric(e) {
    this.currentHealthcareMetric = getMetricById(parseInt(e.target.value));
    const options = {
      bubbles: true,
      composed: true,
      detail: { healthcareMetric: this.currentHealthcareMetric },
    };
    this.dispatchEvent(new CustomEvent('change-healthcare-metric', options));
  }

  switchSelectedDiseases(e) {
    this.selectedDiseases = e.target.value.map(ind =>
      findDiseaseByIndex(parseInt(ind))
    );
    if (this.selectedDiseases.length > 0) {
      if (
        !this.currentDisease ||
        !this.selectedDiseases.includes(this.currentDisease)
      ) {
        this.currentDisease = this.selectedDiseases[0];
      }
    } else {
      this.currentDisease = null;
    }
    const options = {
      bubbles: true,
      composed: true,
      detail: {
        diseases: this.selectedDiseases,
        currentDisease: this.currentDisease,
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
      .charts {
        display: grid;
        grid: 1fr 1fr / 3fr 1fr;
      }
      #healthcare {
      }
      #disease-selection-container {
        border-bottom: 2px solid grey;
        background-color: var(--sl-color-neutral-100);
      }
      #healthcare-filters-container {
        background-color: var(--sl-color-neutral-100);
      }
      #timespan-selection {
        display: grid;
        grid-template-columns: 1fr 1fr;
        margin: 0 auto 0.5rem;
        min-width: min-content;
        max-width: 30rem;
      }
      #diseases-selection {
        padding: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        height: 100%;
      }
      #healthcare-filters {
        padding: 0.5rem;
        gap: 1rem;
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      #diseases-chart {
        background-color: pink;
        border-bottom: 2px solid grey;
      }
      sl-tooltip {
        --show-delay: 750;
      }
    `;
  }
}

window.customElements.define('charts-section', ChartsSection);
