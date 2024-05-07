import { LitElement, css, html } from 'lit';
import { setUpIndices } from './dataService';
import { Task } from '@lit/task';
import './components/chartsSection';
import './components/whole-country-charts';
import './components/selectionFromMap';
import { maxYear, minYear } from './globals';

export class MyElement extends LitElement {
  static properties = {
    selectedDiseases: { type: Array },
    currentDisease: { type: String },
    currentHealthcareMetric: { type: Object },
    selectedRegions: { type: Array },
    startYear: { type: Number },
    endYear: { type: Number },
  };

  constructor() {
    super();
    this.selectedDiseases = [];
    this.selectedRegions = [];
    this.startYear = minYear;
    this.endYear = maxYear;
  }

  connectedCallback() {
    super.connectedCallback();
    this._setUpTask.run();
  }

  _setUpTask = new Task(this, {
    task: async () => {
      await setUpIndices();
    },
    args: () => [],
    autorun: false,
  });

  render() {
    console.log(
      'App root current params:',
      this.selectedRegions,
      this.selectedDiseases,
      this.currentDisease,
      this.currentHealthcareMetric,
      this.startYear,
      this.endYear
    );
    return html`<div id="page">
      ${this._setUpTask.render({
        initial: () => html`Loading page`,
        pending: () => html`Loading page...`,
        complete: () => html` <selection-from-map
            @change-selected-regions=${e =>
              (this.selectedRegions = e.detail.regions)}></selection-from-map>
          <charts-section
            .selectedRegions=${this.selectedRegions}
            .selectedDiseases=${this.selectedDiseases}
            .startYear=${this.startYear}
            .endYear=${this.endYear}
            @change-selected-diseases=${e => {
              this.selectedDiseases = e.detail.diseases;
              this.currentDisease = e.detail.currentDisease;
            }}
            @change-current-disease=${e =>
              (this.currentDisease = e.detail.currentDisease)}
            @change-healthcare-metric=${e =>
              (this.currentHealthcareMetric = e.detail.healthcareMetric)}>
          </charts-section>
          <whole-country-charts
            .currentYear=${this.endYear}
            .currentDisease=${this.currentDisease}
            .currentHealthcareMetric=${this
              .currentHealthcareMetric}></whole-country-charts>`,
        error: e => html`Error: ${e}`,
      })}
    </div>`;
  }

  static get styles() {
    return css`
      :host {
        height: 100vh;
        padding: 1rem;
        width: 100vw;
      }
      #map-container {
        width: 100%;
        border: 1px dotted grey;
      }
      #page {
        display: grid;
        grid-template-columns: 1fr 3fr 1fr;
        gap: 1rem;
        height: 100%;
        width: 100%;
      }
      #whole-country-data {
        width: 100%;
        border: 1px dotted grey;
      }
    `;
  }
}

window.customElements.define('app-root', MyElement);
