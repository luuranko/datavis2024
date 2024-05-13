import { LitElement, html, css } from 'lit';
import {
  getEmptyMapData,
  getFinlandTopology,
  wellbeingToStateMap,
} from '../dataService';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import Highcharts from 'highcharts/highmaps';

export class SelectionFromMap extends LitElement {
  static get properties() {
    return {
      selectedRegions: { type: Array },
    };
  }

  constructor() {
    super();
    this.selectedRegions = [];
    this.chart = null;
    this.finlandTopology = getFinlandTopology();
  }

  willUpdate(changedProps) {
    if (changedProps.has('selectedRegions')) {
      this.sendRegionSelectionEvent();
    }
  }

  sendRegionSelectionEvent() {
    const options = {
      detail: {
        regions: this.selectedRegions,
      },
      bubbles: true,
      composed: true,
    };
    this.dispatchEvent(new CustomEvent('change-selected-regions', options));
  }

  render() {
    return html`
      <div id="selection-map">
        <div id="map-container" @click=${this.setSelection}></div>
        ${this.getButtons()}
      </div>
    `;
  }

  getButtons() {
    const clearButton = html``;
    return html`
      <div id="buttons">
        <sl-button
          variant="text"
          size="small"
          @click=${() => this.selectAllRegions()}>
          <sl-icon slot="prefix" name="check-all"></sl-icon>
          Select all
        </sl-button>
        <sl-button
          size="small"
          variant="text"
          class="clear"
          ?disabled=${this.selectedRegions.length === 0}
          @click=${() => this.clearRegionSelection()}>
          <sl-icon slot="prefix" name="x"></sl-icon>
          Clear selection
        </sl-button>
      </div>
    `;
  }

  selectAllRegions() {
    this.chart.series[0].data.forEach(point => point.select(true, true));
    this.setSelection();
  }

  clearRegionSelection() {
    this.chart.series[0].data.forEach(point => point.select(false, true));
    this.setSelection();
  }

  firstUpdated() {
    this.getMap();
  }

  getMap() {
    const data = getEmptyMapData();
    const container = this.shadowRoot.querySelector('#map-container');
    this.chart = Highcharts.mapChart(container, {
      chart: {
        map: this.finlandTopology,
      },
      credits: { enabled: false },
      title: {
        text: `Select regions`,
      },
      subtitle: {
        text: 'Select regions by clicking, multiple with Shift or Ctrl',
      },
      legend: { enabled: false },
      tooltip: {
        enabled: true,
        formatter: function () {
          return this.point.name;
        },
      },
      series: [
        {
          data: data,
          allowPointSelect: true,
          states: {
            hover: {
              borderColor: '#0099ca',
              color: '#b9ebfb',
            },
            select: {
              color: '#fff8c3',
              borderColor: 'orange',
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

  setSelection() {
    const selected = this.chart
      .getSelectedPoints()
      .map(
        region =>
          Object.entries(wellbeingToStateMap).find(
            entry => entry[1] === region.name
          )[0]
      );
    if (
      selected.length === this.selectedRegions.length &&
      selected.every(r => this.selectedRegions.includes(r))
    )
      return;
    this.selectedRegions = selected;
  }

  static styles = [
    css`
      #selection-map {
        height: 100%;
        width: 100%;
        position: relative;
      }
      #map-container {
        height: 90vh;
      }
      #buttons {
        position: absolute;
        top: 0;
        right: 0;
        margin-top: 5vh;
        display: flex;
        gap: 1rem;
        flex-direction: column;
        align-items: end;
      }
      sl-button.clear::part(base) {
        color: var(--sl-color-danger-600);
      }
      sl-button.clear::part(base):hover {
        color: var(--sl-color-danger-400);
      }
      sl-button[disabled].clear::part(base):hover {
        color: var(--sl-color-danger-600);
      }
      sl-button.clear::part(base):active {
        color: var(--sl-color-danger-700);
      }
    `,
  ];
}
customElements.define('selection-from-map', SelectionFromMap);
