import { LitElement, css, html } from 'lit';
import Highcharts from 'highcharts';
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
import '@shoelace-style/shoelace/dist/components/tab/tab.js';
import { Task } from '@lit/task';
import {
  getVisitsDataForRegion,
  getCareDaysDataForRegion,
  getPatientDataForRegion,
} from '../dataService';
export class HealthcareTimeSeries extends LitElement {
  static properties = {
    selectedRegions: { type: Array },
    startYear: { type: Number },
    endYear: { type: Number },
    currentCategory: { type: String },
  };
  constructor() {
    super();
    this.selectedRegions = [];
    this.startYear = 1996;
    this.endYear = 2022;
    this.healthCareData = {};
    this.currentCategory = 'Patients';
    this.visitsChart = null;
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
          this.updateChartsTimespan();
        }
      } else {
        shouldFetchData = !this.hasDataForSelectedTimespan();
        if (!shouldFetchData) this.updateChartsTimespan();
      }
    }
    if (shouldFetchData) this._fetchHealthcareDataTask.run();
  }

  // TODO WHAT TO DO WHEN SELECTING MANY REGIONS
  _fetchHealthcareDataTask = new Task(this, {
    task: async () => {
      console.log('Running fetchHealthcareDataTask');
      let data = { visits: [], patients: [], days: [] };
      if (this.selectedRegions.length === 0) {
        this.healthCareData = data;
      } else {
        data.visits = await getVisitsDataForRegion(
          this.selectedRegions[0],
          this.startYear,
          this.endYear
        );
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
        ${this._fetchHealthcareDataTask.render({
          initial: () => html`loading healthcare data`,
          pending: () => html`loading healthcare data`,
          complete: () => ``,
          error: e => html`Error ${e}`,
        })}
        <sl-tab-group
          placement="top"
          @sl-tab-show=${e => this.handleSelectedCategory(e)}>
          <sl-tab slot="nav" panel="Visits">Visits</sl-tab>
          <sl-tab slot="nav" panel="Patients" active>Patients</sl-tab>
          <sl-tab slot="nav" panel="Length of stay">Length of stay</sl-tab>
          <sl-tab-panel name="Visits">
            <div id="visits-chart"></div>
          </sl-tab-panel>
          <sl-tab-panel name="Patients">
            <div id="patients-chart"></div>
          </sl-tab-panel>
          <sl-tab-panel name="Length of stay">
            <div id="caredays-chart"></div> </sl-tab-panel
        ></sl-tab-group>
      </div>
    `;
  }

  handleSelectedCategory(e) {
    this.currentCategory = e.detail.name;
    const options = {
      detail: {
        healthcareCategory: this.currentCategory,
      },
      bubbles: true,
      composed: true,
    };
    this.dispatchEvent(new CustomEvent('change-healthcare-category', options));
  }

  firstUpdated() {
    this.getVisitsChart();
    this.getPatientsChart();
    this.getCareDaysChart();
  }

  updateCharts() {
    if (!this.patientsChart || !this.caredaysChart || !this.visitsChart) return;
    while (this.patientsChart.series.length)
      this.patientsChart.series[0].remove();
    while (this.caredaysChart.series.length)
      this.caredaysChart.series[0].remove();
    while (this.visitsChart.series.length) this.visitsChart.series[0].remove();
    this.healthCareData.patients.forEach(s => this.patientsChart.addSeries(s));
    this.healthCareData.days.forEach(s => this.caredaysChart.addSeries(s));
    this.healthCareData.visits.forEach(s => this.visitsChart.addSeries(s));
    this.patientsChart.redraw();
    this.caredaysChart.redraw();
    this.visitsChart.redraw();
  }

  updateChartsTimespan() {
    if (!this.patientsChart || !this.caredaysChart || !this.visitsChart) return;
    this.patientsChart.xAxis[0].setExtremes(this.startYear, this.endYear);
    this.visitsChart.xAxis[0].setExtremes(this.startYear, this.endYear);
    this.caredaysChart.xAxis[0].setExtremes(this.startYear, this.endYear);
  }

  hasDataForSelectedTimespan() {
    if (!this.patientsChart || !this.caredaysChart || !this.visitsChart)
      return false;
    const firstYearInData = this.healthCareData.visits[0][0];
    const lastYearInData =
      this.healthCareData.visits[this.healthCareData.visits.length - 1][0];
    if (firstYearInData > this.startYear || lastYearInData < this.endYear)
      return false;
    return true;
  }

  getVisitsChart() {
    const container = this.shadowRoot.querySelector('#visits-chart');
    this.visitsChart = Highcharts.chart(container, {
      title: { text: '' },
      credits: { enabled: false },
      subtitle: { text: 'Visits per 1000 inhabitants' },
      yAxis: { title: { text: 'Visits' } },
      xAxis: { tickInterval: 1 },
      legend: {
        layout: 'horizontal',
        align: 'right',
        verticalAlign: 'top',
      },
      series: this.healthCareData.visits,
    });
  }

  getPatientsChart() {
    const container = this.shadowRoot.querySelector('#patients-chart');
    this.patientsChart = Highcharts.chart(container, {
      title: { text: '' },
      credits: { enabled: false },
      subtitle: { text: 'Patients per 1000 inhabitants' },
      yAxis: { title: { text: 'Patients' } },
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
      subtitle: { text: 'Avg. length of stay' },
      yAxis: { title: { text: 'Days' } },
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
