import { LitElement, css, html } from 'lit';
import Highcharts from 'highcharts';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import {
  getInfectionIncidenceManyDiseases,
  getInfectionIncidenceManyRegions,
} from '../dataService';

import { Task } from '@lit/task';
export class InfectionTimeSeries extends LitElement {
  static properties = {
    selectedRegions: { type: Array },
    selectedDiseases: { type: Array },
    startYear: { type: Number },
    endYear: { type: Number },
  };

  constructor() {
    super();
    this.selectedRegions = [];
    this.selectedDiseases = [];
    this.startYear = 1996;
    this.endYear = 2022;
    this.infectionData = {};
    this.healthCareData = {};
    this.diseases = {};
  }

  // willUpdate(changedProps) {
  //   if (changedProps.has('selectedDiseases') && this.selectedDiseases) {
  //     if (changedProps.get('selectedDiseases')) {
  //       if (
  //         changedProps.get('selectedDiseases').length >
  //         this.selectedDiseases.length
  //       ) {
  //         const removable = changedProps
  //           .get('selectedDiseases')
  //           .filter(d => !this.selectedDiseases.includes(d))
  //           .map(d => d.replaceAll('_', ' '));
  //         console.log(removable);
  //         console.log(this.chart.series.length);
  //         removable.forEach(s => {
  //           console.log(s);
  //           console.log(this.chart.get(s));
  //           this.chart.get(s).remove();
  //         });
  //         console.log(this.chart.series.length);
  //         this.chart.redraw();
  //       } else {
  //         this._fetchInfectionDataTask.run();
  //       }
  //     } else {
  //       this._fetchInfectionDataTask.run();
  //     }
  //   }
  // }

  _fetchInfectionDataTask = new Task(this, {
    task: async () => {
      if (this.selectedRegions.length === 1) {
        this.infectionData = await getInfectionIncidenceManyDiseases(
          this.selectedDiseases,
          this.selectedRegions,
          this.startYear,
          this.endYear
        );
      } else {
        this.infectionData = await getInfectionIncidenceManyRegions(
          this.selectedDiseases[0],
          this.selectedRegions,
          this.startYear,
          this.endYear
        );
      }
      this.updateChart();
    },
    args: () => [
      this.selectedDiseases,
      this.selectedRegions,
      this.startYear,
      this.endYear,
    ],
    // autoRun: false,
  });

  render() {
    console.log(
      'Rendering infections chart with series:',
      this.chart?.series.length
    );
    return html`
      <div id="container">
        <div id="diseases-chart"></div>
        ${this._fetchInfectionDataTask.render({
          initial: () => html`loading infection data`,
          pending: () => html`loading infection data`,
          complete: () => ``,
          error: e => html`Error ${e}`,
        })}
      </div>
    `;
  }

  firstUpdated() {
    this.getInfectionChart();
  }

  updateChart() {
    if (!this.chart) return;
    while (this.chart.series.length) this.chart.series[0].remove();
    this.infectionData.forEach(s => this.chart.addSeries(s));
    this.chart.title.textStr = this.selectedDiseases
      .map(d => d.replaceAll('_', ' '))
      .join('; ');
    this.chart.redraw();
  }

  getInfectionChart = () => {
    const container = this.shadowRoot.querySelector('#diseases-chart');
    this.chart = Highcharts.chart(container, {
      title: {
        text: '',
      },
      credits: { enabled: false },
      subtitle: { text: 'Infections per 100 000 inhabitants' },
      yAxis: { title: { text: 'Infections per 100 000 inhabitants' } },
      legend: { layout: 'vertical', align: 'right', verticalAlign: 'middle' },
      series: this.infectionData,
    });
  };

  static get styles() {
    return css`
      #container {
      }
      #diseases-chart {
        height: 45vh;
      }
    `;
  }
}
window.customElements.define('infection-time-series', InfectionTimeSeries);
