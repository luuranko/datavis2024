import { LitElement, css, html } from 'lit';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/radio-group/radio-group.js';
import '@shoelace-style/shoelace/dist/components/radio/radio.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import './infectionTimeSeries';
import './healthcareTimeSeries';
import './disease-filters';
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
          <div id="diseases-chart" class="has-section-divider">
            <infection-time-series
              .selectedDiseases=${this.selectedDiseases}
              .currentDisease=${this.currentDisease}
              .selectedRegions=${this.selectedRegions}
              .startYear=${this.startYear}
              .endYear=${this.endYear}></infection-time-series>
          </div>
          <div class="filter-container has-section-divider">
            <disease-filters></disease-filters>
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
          <div class="filter-container ">${this.getHealthcareFilters()}</div>
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
    return html`
      <div id="timespan-selection">
        <sl-select
          label="Select start year"
          value=${this.startYear}
          @sl-change=${e => this.changeStartYear(e.target.value)}>
          ${getYears(minYear, this.endYear - 1)}
        </sl-select>
        <sl-select
          label="Select end year"
          value=${this.endYear}
          @sl-change=${e => this.changeEndYear(e.target.value)}>
          ${getYears(this.startYear + 1, maxYear)}
        </sl-select>
      </div>
    `;
  }

  changeStartYear = year => {
    if (year >= this.endYear) return;
    this.startYear = parseInt(year);
    const options = {
      bubbles: true,
      composed: true,
      detail: { startYear: this.startYear },
    };
    this.dispatchEvent(new CustomEvent('change-start-year', options));
  };
  changeEndYear = year => {
    if (year <= this.startYear) return;
    this.endYear = parseInt(year);
    const options = {
      bubbles: true,
      composed: true,
      detail: { endYear: this.endYear },
    };
    this.dispatchEvent(new CustomEvent('change-end-year', options));
  };

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
        <!-- <sl-radio-group
          label="Compare regions by"
          name="Select healthcare metric"
          value=${this.currentHealthcareMetric?.context ===
        this.healthcareContext
          ? this.currentHealthcareMetric?.id
          : null}
          @sl-change=${e => this.switchCurrentHealthcareMetric(e)}>
          ${metricsByContext[this.healthcareContext].map(m => {
          return html` <sl-radio value=${m.id}>${m.name}</sl-radio> `;
        })}
        </sl-radio-group> -->
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

  switchCurrentHealthcareMetric(e) {
    this.currentHealthcareMetric = getMetricById(parseInt(e.target.value));
    const options = {
      bubbles: true,
      composed: true,
      detail: { healthcareMetric: this.currentHealthcareMetric },
    };
    this.dispatchEvent(new CustomEvent('change-healthcare-metric', options));
  }

  static get styles() {
    return css`
      #page {
        height: 100%;
        width: 100%;
      }
      .charts {
        display: grid;
        grid: 43vh 50vh / 3fr 1fr;
      }
      .has-section-divider {
        border-bottom: 2px solid grey;
      }
      .filter-container {
        background-color: var(--sl-color-neutral-100);
      }
      #timespan-selection {
        display: grid;
        grid-template-columns: 1fr 1fr;
        margin: 0 auto 0.5rem;
        min-width: min-content;
        max-width: 30rem;
      }
      #healthcare-filters {
        padding: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        height: 100%;
      }
      .hidden {
        display: none;
      }
    `;
  }
}

window.customElements.define('charts-section', ChartsSection);
