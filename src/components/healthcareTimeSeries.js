import { LitElement, css, html } from 'lit';
import Highcharts from 'highcharts';
import { Task } from '@lit/task';
import {
  getCareDaysDataForRegion,
  getPatientDataForRegion,
} from '../dataService';
export class HealthcareTimeSeries extends LitElement {
  static properties = {
    selectedRegions: { type: Array },
    startYear: { type: Number },
    endYear: { type: Number },
  };
  constructor() {
    super();
    this.selectedRegions = [];
    this.startYear = 1996;
    this.endYear = 2022;
    this.healthCareData = {};
    this.patientsChart = null;
    this.caredaysChart = null;
  }

  willUpdate(changedProps) {
    console.log('healthcareTimeSeries willUpdate', changedProps);
    let shouldFetchData = false;
    if (changedProps.has('selectedRegions')) {
      shouldFetchData = true;
    }
    if (changedProps.has('startYear') || changedProps.has('endYear')) {
      const prevStart = changedProps.get('startYear') || this.startYear;
      const prevEnd = changedProps.get('endYear') || this.endYear;
      if (prevStart <= this.startYear && prevEnd >= this.endYear) {
        if (this.patientsChart && this.patientsChart.series.length > 0) {
          const removableYears = [];
          for (let year = prevStart; year <= prevEnd; year++) {
            if (year < this.startYear || year > this.endYear)
              removableYears.push(year);
          }
          this.updateChartsTimespan(removableYears);
        }
      } else {
        shouldFetchData = true;
      }
    }
    if (shouldFetchData) this._fetchHealthcareDataTask.run();
  }

  _fetchHealthcareDataTask = new Task(this, {
    task: async () => {
      console.log('Running fetchHealthcareDataTask');
      let data = { patients: [], days: [] };
      if (this.selectedRegions.length === 0) {
        this.healthCareData = data;
      } else {
        data.patients = await getPatientDataForRegion(
          this.selectedRegions[0],
          this.startYear,
          this.endYear
        );
        data.days = await getCareDaysDataForRegion(
          this.selectedRegions[0],
          this.startYear,
          this.endYear
        );
      }
      this.healthCareData = data;
      this.updateCharts();
    },
    args: () => [],
    autoRun: false,
  });

  render() {
    return html`
      <div id="container">
        <div id="patients-chart"></div>
        <div id="caredays-chart"></div>
        ${this._fetchHealthcareDataTask.render({
          initial: () => html`loading healthcare data`,
          pending: () => html`loading healthcare data`,
          complete: () => ``,
          error: e => html`Error ${e}`,
        })}
      </div>
    `;
  }

  firstUpdated() {
    this.getPatientsChart();
    this.getCareDaysChart();
  }

  updateCharts() {
    if (!this.patientsChart || !this.caredaysChart) return;
    while (this.patientsChart.series.length)
      this.patientsChart.series[0].remove();
    while (this.caredaysChart.series.length)
      this.caredaysChart.series[0].remove();
    this.healthCareData.patients.forEach(s => this.patientsChart.addSeries(s));
    this.healthCareData.days.forEach(s => this.caredaysChart.addSeries(s));
    this.patientsChart.redraw();
    this.caredaysChart.redraw();
  }

  updateChartsTimespan(removableYears) {
    if (!this.patientsChart || !this.caredaysChart) return;
    this.patientsChart.series.forEach(series => {
      removableYears.forEach(year => {
        series.data.find(point => point.x === year)?.remove();
      });
    });
    this.caredaysChart.series.forEach(series => {
      removableYears.forEach(year => {
        series.data.find(point => point.x === year)?.remove();
      });
    });
    this.patientsChart.redraw();
    this.caredaysChart.redraw();
  }

  getPatientsChart() {
    const container = this.shadowRoot.querySelector('#patients-chart');
    this.patientsChart = Highcharts.chart(container, {
      title: { text: '' },
      credits: { enabled: false },
      yAxis: { title: { text: 'Patients per 1000 inhabitants' } },
      xAxis: { tickInterval: 1 },
      legend: {
        layout: 'horizontal',
        align: 'right',
        verticalAlign: 'top',
      },
      series: this.healthCareData.patients,
    });
  }

  getCareDaysChart() {
    const container = this.shadowRoot.querySelector('#caredays-chart');
    this.caredaysChart = Highcharts.chart(container, {
      title: { text: '' },
      credits: { enabled: false },
      yAxis: { title: { text: 'Avg. length of stay in days' } },
      xAxis: { tickInterval: 1 },
      legend: {
        layout: 'horizontal',
        align: 'right',
        verticalAlign: 'top',
      },
      series: this.healthCareData.days,
    });
  }

  static styles = [
    css`
      #container {
        height: 45vh;
        display: grid;
        grid-template-rows: 1fr 1fr;
      }
      #patients-chart {
        background-color: lightgreen;
      }
      #caredays-chart {
        background-color: lightyellow;
      }
    `,
  ];
}
customElements.define('healthcare-time-series', HealthcareTimeSeries);
