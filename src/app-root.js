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
        grid-template-columns: 2fr 3fr 2fr;
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

  render() {
    console.log('Current selected regions:', this.selectedRegions);
    console.log('Current selected diseases:', this.selectedDiseases);
    console.log('Current timespan:', this.startYear, ' - ', this.endYear);
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
            @change-selected-diseases=${e =>
              (this.selectedDiseases = e.detail.diseases)}>
          </charts-section>
          <whole-country-charts
            .currentYear=${this.endYear}
            .selectedDiseases=${this.selectedDiseases}></whole-country-charts>`,
        error: e => html`Error: ${e}`,
      })}
    </div>`;
  }
}

window.customElements.define('app-root', MyElement);
