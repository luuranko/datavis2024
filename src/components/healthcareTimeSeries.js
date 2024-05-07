import { LitElement, css, html } from 'lit';
import Highcharts from 'highcharts';
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
import '@shoelace-style/shoelace/dist/components/tab/tab.js';
import '@shoelace-style/shoelace/dist/components/radio-button/radio-button.js';
import '@shoelace-style/shoelace/dist/components/radio-group/radio-group.js';
import { Task } from '@lit/task';
import {
  getHealthcareDataForManyRegions,
  getHealthcareDataForRegionByCategory,
} from '../dataService';
import { getMetricById, getMetricsByCategoryAndContext } from './categories';

export class HealthcareTimeSeries extends LitElement {
  static properties = {
    selectedRegions: { type: Array },
    startYear: { type: Number },
    endYear: { type: Number },
    currentCategory: { type: String },
    healthcareContext: { type: String },
    selectedDaysMetric: { type: Object },
    selectedPatientsMetric: { type: Object },
    selectedVisitsMetric: { type: Object },
  };
  constructor() {
    super();
    this.selectedRegions = [];
    this.healthCareData = {};
    this.currentCategory = null;
    this.healthcareContext = null;
    this.visitsChart = null;
    this.patientsChart = null;
    this.caredaysChart = null;
    this.selectedVisitsMetric = null;
    this.selectedPatientsMetric = null;
    this.selectedDaysMetric = null;
  }

  willUpdate(changedProps) {
    let shouldFetchData = false;
    let shouldFetchAll = true;
    let fetchOnlyOne = null;
    let regionsToFetch = this.selectedRegions;
    if (changedProps.has('healthcareContext')) {
      this.selectedVisitsMetric = getMetricsByCategoryAndContext(
        'Visits',
        this.healthcareContext
      )
        .reverse()
        .pop();
      this.selectedPatientsMetric = getMetricsByCategoryAndContext(
        'Patients',
        this.healthcareContext
      )
        .reverse()
        .pop();
      this.selectedDaysMetric = getMetricsByCategoryAndContext(
        'Length of stay',
        this.healthcareContext
      )
        .reverse()
        .pop();
    }
    if (changedProps.has('selectedVisitsMetric') && this.selectedVisitsMetric) {
      fetchOnlyOne = 'Visits';
      shouldFetchData = true;
    } else if (
      changedProps.has('selectedPatientsMetric') &&
      this.selectedPatientsMetric
    ) {
      fetchOnlyOne = 'Patients';
      shouldFetchData = true;
    } else if (
      changedProps.has('selectedDaysMetric') &&
      this.selectedDaysMetric
    ) {
      fetchOnlyOne = 'Length of stay';
      shouldFetchData = true;
    }
    if (changedProps.has('selectedRegions')) {
      const prevRegions = changedProps.get('selectedRegions');
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
    if (shouldFetchData)
      this._fetchHealthcareDataTask.run([
        shouldFetchAll,
        regionsToFetch,
        fetchOnlyOne,
      ]);
  }

  _fetchHealthcareDataTask = new Task(this, {
    task: async ([fetchAll, newRegions, fetchOnlyOne]) => {
      let data = { visits: [], patients: [], days: [] };
      if (this.selectedRegions.length === 0) {
        this.healthCareData = data;
      } else if (this.selectedRegions.length === 1) {
        data.visits = await getHealthcareDataForRegionByCategory(
          'Visits',
          this.selectedRegions[0],
          this.startYear,
          this.endYear
        );
        data.patients = await getHealthcareDataForRegionByCategory(
          'Patients',
          this.selectedRegions[0],
          this.startYear,
          this.endYear
        );
        data.days = await getHealthcareDataForRegionByCategory(
          'Length of stay',
          this.selectedRegions[0],
          this.startYear,
          this.endYear
        );
      } else if (this.selectedRegions.length > 1) {
        if (!fetchOnlyOne) {
          data.visits = await this.getVisitsNewRegionData(newRegions);
          data.patients = await this.getPatientsNewRegionData(newRegions);
          data.days = await this.getDaysNewRegionData(newRegions);
        } else {
          switch (fetchOnlyOne) {
            case 'Visits':
              data.visits = await this.getVisitsNewRegionData(newRegions);
              data.patients = this.healthCareData.patients;
              data.days = this.healthCareData.days;
              break;
            case 'Patients':
              data.patients = await this.getPatientsNewRegionData(newRegions);
              data.days = this.healthCareData.days;
              data.visits = this.healthCareData.visits;
              break;
            case 'Length of stay':
              data.days = await this.getDaysNewRegionData(newRegions);
              data.patients = this.healthCareData.patients;
              data.visits = this.healthCareData.visits;
              break;
          }
        }
      }
      if (fetchAll) {
        this.healthCareData = data;
        this.updateCharts();
      } else {
        this.healthCareData = {
          visits: this.healthCareData.visits.concat(data.visits),
          patients: this.healthCareData.patients.concat(data.patients),
          days: this.healthCareData.days.concat(data.days),
        };
        this.updateChartsPartially(data);
      }
    },
    args: () => [],
    autoRun: false,
  });

  async getVisitsNewRegionData(newRegions) {
    const d = await getHealthcareDataForManyRegions(
      this.selectedVisitsMetric.id,
      newRegions,
      this.startYear,
      this.endYear
    );
    return d;
  }

  async getPatientsNewRegionData(newRegions) {
    const d = await getHealthcareDataForManyRegions(
      this.selectedPatientsMetric.id,
      newRegions,
      this.startYear,
      this.endYear
    );
    return d;
  }

  async getDaysNewRegionData(newRegions) {
    const d = await getHealthcareDataForManyRegions(
      this.selectedDaysMetric.id,
      newRegions,
      this.startYear,
      this.endYear
    );
    return d;
  }

  render() {
    return html`
      <div id="container">
        ${this._fetchHealthcareDataTask.render({
          initial: () => html`Loading healthcare data`,
          pending: () => html`Loading healthcare data`,
          complete: () => ``,
          error: e => html`Error ${e}`,
        })}
        <sl-tab-group
          placement="top"
          @sl-tab-show=${e => this.handleSelectedCategory(e)}>
          <sl-tab
            slot="nav"
            panel="Visits"
            ?active=${this.currentCategory === 'Visits'}
            >Visits</sl-tab
          >
          <sl-tab
            slot="nav"
            panel="Patients"
            ?active=${this.currentCategory === 'Patients'}
            >Patients</sl-tab
          >
          <sl-tab
            slot="nav"
            panel="Length of stay"
            ?active=${this.currentCategory === 'Length of stay'}
            >Length of stay</sl-tab
          >
          <sl-tab-panel name="Visits">
            ${this.getSelectionRadio('Visits')}
            <div id="visits-chart"></div>
          </sl-tab-panel>
          <sl-tab-panel name="Patients">
            ${this.getSelectionRadio('Patients')}
            <div id="patients-chart"></div>
          </sl-tab-panel>
          <sl-tab-panel name="Length of stay">
            ${this.getSelectionRadio('Length of stay')}
            <div id="caredays-chart"></div> </sl-tab-panel
        ></sl-tab-group>
      </div>
    `;
  }

  getSelectionRadio(category) {
    if (this.selectedRegions.length < 2) return '';
    return html` <div class="selection-radio">
      <sl-radio-group
        name="Select metric"
        value=${this.getPropOfCategory(category)?.id}
        size="small"
        @sl-change=${this.getChangeHandlerOfCategory(category)}>
        ${getMetricsByCategoryAndContext(category, this.healthcareContext).map(
          m => {
            return html`
              <sl-radio-button value=${m.id}>${m.name}</sl-radio-button>
            `;
          }
        )}
      </sl-radio-group>
    </div>`;
  }

  getPropOfCategory(category) {
    switch (category) {
      case 'Visits':
        return this.selectedVisitsMetric;
      case 'Patients':
        return this.selectedPatientsMetric;
      case 'Length of stay':
        return this.selectedDaysMetric;
    }
  }

  getChangeHandlerOfCategory(category) {
    switch (category) {
      case 'Visits':
        const handleVisitsMetricChange = e => {
          const newValue = e.target.value;
          const metric = getMetricById(parseInt(newValue));
          this.selectedVisitsMetric = metric;
        };
        return handleVisitsMetricChange;
      case 'Patients':
        const handlePatientsMetricChange = e => {
          const newValue = e.target.value;
          const metric = getMetricById(parseInt(newValue));
          this.selectedPatientsMetric = metric;
        };
        return handlePatientsMetricChange;
      case 'Length of stay':
        const handleDaysMetricChange = e => {
          const newValue = e.target.value;
          const metric = getMetricById(parseInt(newValue));
          this.selectedDaysMetric = metric;
        };
        return handleDaysMetricChange;
    }
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
      .selection-radio {
        width: 100%;
        display: flex;
        align-content: center;
        justify-content: center;
      }
    `,
  ];
}
customElements.define('healthcare-time-series', HealthcareTimeSeries);
