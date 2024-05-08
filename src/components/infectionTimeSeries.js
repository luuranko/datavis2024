import { LitElement, css, html } from 'lit';
import Highcharts from 'highcharts';
import {
  getInfectionIncidenceManyDiseases,
  getInfectionIncidenceManyRegions,
} from '../dataService';

import { Task } from '@lit/task';
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
    this.endYear = 2022;
    this.infectionData = {};
    this.diseases = {};
  }

  /*
    consider: if widening timespan selection, only fetch needed years and append?
  */
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
        this.updateChartPartially([], removableDiseases);
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
        this.updateChartPartially([], removableRegions);
      } else if (
        prevRegions &&
        prevRegions.length === 1 &&
        this.selectedDiseases.length > 1 &&
        this.selectedRegions.length > 1
      ) {
        shouldFetchData = true;
      } else {
        shouldFetchData = true;
        if (prevRegions && prevRegions.length < this.selectedRegions.length) {
          shouldFetchAll = false;
          regionsToFetch = this.selectedRegions.filter(
            r => !prevRegions.includes(r)
          );
          // Situation where existing series is named by its disease, not region
          if (prevRegions.length === 1 && this.chart.series.length === 1) {
            this.chart.series[0].name = prevRegions[0];
            this.chart.series[0].options.id = prevRegions[0];
            this.chart.series[0].options.name = prevRegions[0];
            this.chart.series[0].userOptions.id = prevRegions[0];
            this.chart.series[0].userOptions.name = prevRegions[0];
          }
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
      if (fetchAll) {
        this.infectionData = data;
        this.updateChart();
      } else {
        this.infectionData = this.infectionData.concat(data);
        this.updateChartPartially(data, []);
      }
    },
    args: () => [],
    autoRun: false,
  });

  render() {
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
    this.chart.title.textStr = this.getChartTitle();
    this.chart.redraw();
  }

  updateChartPartially(addSeries = [], removableSeries = []) {
    if (!this.chart) return;
    if (removableSeries.length === this.chart.series.length) {
      while (this.chart.series.length) this.chart.series[0].remove();
    } else {
      removableSeries.forEach(d => this.chart.get(d).remove());
    }
    addSeries.forEach(s => this.chart.addSeries(s));
    this.chart.title.textStr = this.getChartTitle();
    this.chart.redraw();
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
    if (!this.chart) return false;
    const firstYearInData = this.infectionData[0][0];
    const lastYearInData = this.infectionData[this.infectionData.length - 1][0];
    if (firstYearInData > this.startYear || lastYearInData < this.endYear)
      return false;
    return true;
  }

  getInfectionChart() {
    const container = this.shadowRoot.querySelector('#diseases-chart');
    this.chart = Highcharts.chart(container, {
      title: { text: '' },
      credits: { enabled: false },
      subtitle: { text: 'Infections per 100 000 inhabitants' },
      yAxis: { title: { text: 'Infections' } },
      xAxis: { tickInterval: 1 },
      legend: {
        layout: 'horizontal',
        align: 'right',
        verticalAlign: 'top',
      },
      series: this.infectionData,
    });
  }

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
