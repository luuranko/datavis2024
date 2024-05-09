import { LitElement, css, html } from 'lit';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/radio-group/radio-group.js';
import '@shoelace-style/shoelace/dist/components/radio/radio.js';
import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import { diseasesByCategory, findDiseaseByIndex } from '../diseases';
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
    currentDiseaseCategory: { type: String },
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
    this.currentDiseaseCategory = 7; // All diseases
    this.selectedDiseasesByCategory = {};
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

  getDiseaseFilters() {
    const categories = diseasesByCategory();
    const diseases = categories.find(
      c => c.id === this.currentDiseaseCategory
    ).diseases;
    const options = diseases.map(d => {
      return html`<sl-option value=${`${d.index}`}
        >${d.displayName}</sl-option
      >`;
    });
    const selectedValue = this.selectedDiseases.map(d => `${d.index}`);
    return html`
      <div id="diseases-selection">
        <sl-select
          label="Select disease category"
          ?hoist=${true}
          .value=${`${this.currentDiseaseCategory}`}
          @sl-change=${e =>
            (this.currentDiseaseCategory = parseInt(e.target.value))}>
          ${categories.map(c => {
            return html` <sl-option value=${`${c.id}`}>${c.name}</sl-option> `;
          })}
        </sl-select>
        <sl-select
          label="Select diseases"
          id="disease-selector"
          ?hoist=${true}
          ?multiple=${true}
          .value=${selectedValue}
          @sl-change=${e => this.switchSelectedDiseases(e.target.value)}>
          ${options}
        </sl-select>
        <sl-button
          id="clear-selection-btn"
          variant="text"
          size="small"
          class=${this.selectedDiseases.length > 0 ? '' : 'hidden'}
          @click=${() => this.clearSelectedDiseases()}
          >Clear selection</sl-button
        >
        ${this.getSelectCurrentDiseaseFilter()}
      </div>
    `;
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

  clearSelectedDiseases() {
    this.renderRoot.querySelector('#disease-selector').value = [];
    this.switchSelectedDiseases([]);
  }

  switchSelectedDiseases(diseases) {
    const newDiseases = diseases.map(ind => findDiseaseByIndex(parseInt(ind)));
    this.selectedDiseases = newDiseases;
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
      #diseases-selection,
      #healthcare-filters {
        padding: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        height: 100%;
      }
      #clear-selection-btn {
        margin-right: 0;
        margin-left: auto;
      }
      .hidden {
        display: none;
      }
    `;
  }
}

window.customElements.define('charts-section', ChartsSection);
