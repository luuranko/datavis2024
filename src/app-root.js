import { LitElement, css, html } from 'lit';
import { setUpIndices } from './dataService';
import { Task } from '@lit/task';
import './components/chartsSection';
import './components/whole-country-charts';
import './components/selectionFromMap';
import '@shoelace-style/shoelace/dist/components/popup/popup.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import { maxYear, minYear } from './globals';
import { commonStyles } from './components/commonStyles';

export class MyElement extends LitElement {
  static properties = {
    selectedDiseases: { type: Array },
    currentDisease: { type: Object },
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
    return html` <div id="page">
      ${this._setUpTask.render({
        initial: () => html`<div class="overlay"><span>Loading...</span></div>`,
        pending: () => html`<div class="overlay"><span>Loading...</span></div>`,
        complete: () => html`
          <selection-from-map
            @change-selected-regions=${e =>
              (this.selectedRegions = e.detail.regions)}></selection-from-map>
          <charts-section
            .selectedRegions=${this.selectedRegions}
            .currentDisease=${this.currentDisease}
            .selectedDiseases=${this.selectedDiseases}
            .startYear=${this.startYear}
            .endYear=${this.endYear}
            @change-start-year=${e => (this.startYear = e.detail.startYear)}
            @change-end-year=${e => (this.endYear = e.detail.endYear)}
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
              .currentHealthcareMetric}></whole-country-charts>
        `,
        error: e =>
          html`<div class="overlay">
            <span class="error">Error ${e}</span>
          </div>`,
      })}
      ${this.getCredits()}
    </div>`;
  }

  getCredits() {
    return html` <div id="credits">
      <sl-popup placement="top-start">
        <sl-button
          variant="text"
          size="small"
          slot="anchor"
          @click=${() =>
            (this.renderRoot.querySelector('sl-popup').active =
              !this.renderRoot.querySelector('sl-popup').active)}>
          <sl-icon name="info-circle" slot="prefix"></sl-icon>
          Credits
        </sl-button>
        <div class="credits">
          <p>
            Infectious diseases data from
            <a
              href="https://thl.fi/tilastot-ja-data/aineistot-ja-palvelut/avoin-data#Tartuntataudit"
              >THL Infectious Diseases Register</a
            >
          </p>
          <p>
            Healthcare and population data from
            <a href="https://sotkanet.fi/sotkanet/en/index">Sotkanet</a>,
            indicators used: 127, 4123, 1552, 5077, 1560, 1561, 1268, 1256,
            1260, 1556, 1266, 1254, 1258
          </p>
        </div>
      </sl-popup>
    </div>`;
  }

  static styles = [
    css`
      :host {
        height: 100vh;
        padding: 1rem;
        width: 100vw;
      }
      #map-container {
        width: 100%;
      }
      #page {
        display: grid;
        grid-template-columns: 1fr 3fr 1fr;
        column-gap: 1rem;
        height: 100%;
        width: 100%;
        position: relative;
      }
      #whole-country-data {
        width: 100%;
      }
      selection-from-map {
        height: 95vh;
      }
      .credits {
        font-size: 0.7rem;
        max-width: 30rem;
      }
      #credits {
        margin-top: -3rem;
      }
    `,
    commonStyles,
  ];
}

window.customElements.define('app-root', MyElement);
