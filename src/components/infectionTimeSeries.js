import { LitElement, css, html } from 'lit';
import Highcharts from 'highcharts';
import {
  getInfectionIncidenceManyDiseases,
  getInfectionIncidenceManyRegions,
} from '../dataService';

import { Task } from '@lit/task';
import { commonStyles, errorView, loadingView } from './commonStyles';
export class InfectionTimeSeries extends LitElement {
  static properties = {
    selectedRegions: { type: Array },
    selectedDiseases: { type: Array },
    currentDisease: { type: String },
    startYear: { type: Number },
    endYear: { type: Number },
  };

  constructor() {
    super();
    this.selectedRegions = [];
    this.selectedDiseases = [];
    this.currentDisease = null;
    this.startYear = 1996;
    this.endYear = 2023;
    this.infectionData = {};
    this.diseases = {};
  }

  willUpdate(changedProps) {
    let shouldFetchData = false;
    let alreadyMadeChanges = false;
    let shouldFetchAll = true;
    let diseasesToFetch = this.selectedDiseases;
    let regionsToFetch = this.selectedRegions;
    if (changedProps.has('selectedDiseases')) {
      const prevDiseases = changedProps.get('selectedDiseases');
      if (
        prevDiseases &&
        this.selectedDiseases.length !== prevDiseases.length &&
        this.selectedRegions.length > 1
      ) {
        shouldFetchData = false;
      } else if (
        this.selectedRegions.length === 1 &&
        prevDiseases.length > this.selectedDiseases.length
      ) {
        shouldFetchData = false;
        const removableDiseases = prevDiseases
          .filter(d => !this.selectedDiseases.includes(d))
          .map(d => d.index);
        this.infectionData = this.infectionData.filter(
          s => !removableDiseases.includes(s.id)
        );
        this.updateChart();
        alreadyMadeChanges = true;
      } else if (
        this.selectedRegions.length === 1 &&
        prevDiseases.length < this.selectedDiseases.length
      ) {
        shouldFetchData = true;
        shouldFetchAll = false;
        diseasesToFetch = this.selectedDiseases.filter(
          d => !prevDiseases.includes(d)
        );
      } else {
        shouldFetchData = true;
      }
    }
    if (changedProps.has('selectedRegions')) {
      const prevRegions = changedProps.get('selectedRegions');
      if (
        this.currentDisease &&
        prevRegions.length > this.selectedRegions.length &&
        this.selectedRegions.length > 1
      ) {
        shouldFetchData = false;
        const removableRegions = prevRegions.filter(
          r => !this.selectedRegions.includes(r)
        );
        this.infectionData = this.infectionData.filter(
          s => !removableRegions.includes(s.id)
        );
        this.updateChart();
      } else if (
        prevRegions &&
        prevRegions.length === 1 &&
        this.selectedDiseases.length > 1 &&
        this.selectedRegions.length > 1
      ) {
        shouldFetchData = true;
      } else {
        shouldFetchData = true;
        if (
          prevRegions &&
          prevRegions.length < this.selectedRegions.length &&
          !(prevRegions.length === 1 && this.chart.series.length === 1)
        ) {
          shouldFetchAll = false;
          regionsToFetch = this.selectedRegions.filter(
            r => !prevRegions.includes(r)
          );
        }
      }
    }
    if (changedProps.has('currentDisease') && !alreadyMadeChanges) {
      if (
        changedProps.has('selectedDiseases') ||
        this.selectedRegions.length > 1
      ) {
        shouldFetchData = true;
      }
    }
    if (changedProps.get('startYear') || changedProps.get('endYear')) {
      const prevStart = changedProps.get('startYear') || this.startYear;
      const prevEnd = changedProps.get('endYear') || this.endYear;
      if (prevStart <= this.startYear && prevEnd >= this.endYear) {
        if (this.chart.series.length > 0) {
          this.updateChartTimespan();
        }
      } else {
        shouldFetchData = !this.hasDataForSelectedTimespan();
        if (!shouldFetchData) this.updateChartTimespan();
      }
    }
    if (shouldFetchData)
      this._fetchInfectionDataTask.run([
        shouldFetchAll,
        diseasesToFetch,
        regionsToFetch,
      ]);
  }

  _fetchInfectionDataTask = new Task(this, {
    task: async ([fetchAll, newDiseases, newRegions]) => {
      let data = [];
      if (
        this.selectedRegions.length === 0 ||
        newDiseases.length === 0 ||
        !this.currentDisease
      ) {
        this.infectionData = [];
      } else if (this.selectedRegions.length === 1) {
        data = await getInfectionIncidenceManyDiseases(
          newDiseases,
          this.selectedRegions,
          this.startYear,
          this.endYear
        );
      } else if (this.selectedRegions.length > 1) {
        data = await getInfectionIncidenceManyRegions(
          this.currentDisease,
          newRegions,
          this.startYear,
          this.endYear
        );
      }
      this.infectionData = fetchAll ? data : this.infectionData.concat(data);
      this.updateChart();
    },
    args: () => [],
    autoRun: false,
  });

  render() {
    return html`
      <div id="container">
        <div id="diseases-chart"></div>
        ${this._fetchInfectionDataTask.render({
          initial: () => loadingView,
          pending: () => loadingView,
          complete: () => ``,
          error: e => errorView(e),
        })}
      </div>
    `;
  }

  firstUpdated() {
    this.getInfectionChart();
  }

  updateChart() {
    if (!this.chart) return;
    this.chart.xAxis[0].setExtremes(this.startYear, this.endYear);
    this.chart.update(
      { series: this.infectionData, title: { text: this.getChartTitle() } },
      true,
      true
    );
  }

  getChartTitle() {
    const diseaseString = this.currentDisease
      ? this.selectedRegions.length === 1
        ? this.selectedDiseases.map(d => d.displayName).join('; ')
        : this.currentDisease.displayName
      : '';
    const regions =
      this.selectedRegions.length > 0 ? this.selectedRegions.join(', ') : '';
    if (diseaseString && regions) return `${diseaseString} in ${regions}`;
    return `${diseaseString}${regions}`;
  }

  updateChartTimespan() {
    if (!this.chart) return;
    this.chart.xAxis[0].setExtremes(this.startYear, this.endYear);
  }

  hasDataForSelectedTimespan() {
    if (!this.chart || this.chart.series.length === 0) return false;
    const hasDataForStartYear = this.infectionData.some(d =>
      d.data.some(e => e[0] === this.startYear)
    );
    const hasDataForEndYear = this.infectionData.some(d =>
      d.data.some(e => e[0] === this.endYear)
    );
    if (!hasDataForStartYear || !hasDataForEndYear) return false;
    return true;
  }

  getInfectionChart() {
    const container = this.shadowRoot.querySelector('#diseases-chart');
    this.chart = Highcharts.chart(container, {
      title: { text: '' },
      credits: { enabled: false },
      subtitle: { text: 'Infections per 100 000 inhabitants' },
      yAxis: { title: { text: 'Infections' } },
      xAxis: { tickInterval: 1, minRange: 1 },
      legend: {
        layout: 'horizontal',
        align: 'right',
        verticalAlign: 'top',
      },
      series: this.infectionData,
    });
  }

  static styles = [
    css`
      #container {
        position: relative;
        height: 100%;
      }
      #diseases-chart {
        height: 100%;
      }
    `,
    commonStyles,
  ];
}
window.customElements.define('infection-time-series', InfectionTimeSeries);
