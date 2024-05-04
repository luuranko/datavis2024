import { LitElement, html, css } from 'lit';
import {
  getEmptyMapData,
  getFinlandTopology,
  wellbeingToStateMap,
} from '../dataService';
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
  }

  connectedCallback() {
    super.connectedCallback();
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
        <div id="map-container" @click=${this.handleMapClick}></div>
      </div>
    `;
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

  handleMapClick() {
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
      }
      #map-container {
        height: 90vh;
      }
    `,
  ];
}
customElements.define('selection-from-map', SelectionFromMap);
