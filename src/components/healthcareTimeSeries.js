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
import { getMetricById, getMetricsByCategoryAndContext } from '../categories';
import { commonStyles, errorView, loadingView } from './commonStyles';

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

  connectedCallback() {
    super.connectedCallback();
    this.updateSelectedMetrics();
  }

  updateSelectedMetrics() {
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

  willUpdate(changedProps) {
    let shouldFetchData = false;
    let shouldFetchAll = true;
    let fetchOnlyOne = null;
    let regionsToFetch = this.selectedRegions;
    if (
      changedProps.has('healthcareContext') &&
      this.selectedRegions.length > 1
    ) {
      this.updateSelectedMetrics();
      shouldFetchData = true;
    }
    if (
      changedProps.has('selectedVisitsMetric') &&
      changedProps.has('selectedPatientsMetric') &&
      changedProps.has('selectedDaysMetric')
    ) {
      shouldFetchData = true;
    } else if (
      changedProps.has('selectedVisitsMetric') &&
      this.selectedVisitsMetric
    ) {
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
      if (
        prevRegions &&
        prevRegions.length > this.selectedRegions.length &&
        this.selectedRegions.length > 1
      ) {
        shouldFetchData = false;
        const removableRegions = prevRegions.filter(
          r => !this.selectedRegions.includes(r)
        );
        this.healthCareData.visits = this.healthCareData.visits.filter(
          s => !removableRegions.includes(s.id)
        );
        this.healthCareData.patients = this.healthCareData.patients.filter(
          s => !removableRegions.includes(s.id)
        );
        this.healthCareData.days = this.healthCareData.days.filter(
          s => !removableRegions.includes(s.id)
        );
        this.updateCharts();
      } else if (
        prevRegions &&
        prevRegions.length === 1 &&
        this.selectedRegions.length > 1
      ) {
        shouldFetchData = true;
      } else if (prevRegions?.length === 0 && this.selectedRegions.length > 0) {
        shouldFetchData = true;
        this.updateSelectedMetrics();
      } else {
        shouldFetchData = true;
        if (
          prevRegions?.length > 0 &&
          prevRegions.length < this.selectedRegions.length &&
          this.selectedRegions.length > 0
        ) {
          shouldFetchAll = false;
          regionsToFetch = this.selectedRegions.filter(
            r => !prevRegions.includes(r)
          );
        }
      }
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
        data = await this.getData(data, [
          getHealthcareDataForRegionByCategory(
            'Visits',
            newRegions,
            this.startYear,
            this.endYear
          ),
          getHealthcareDataForRegionByCategory(
            'Patients',
            newRegions,
            this.startYear,
            this.endYear
          ),
          getHealthcareDataForRegionByCategory(
            'Length of stay',
            newRegions,
            this.startYear,
            this.endYear
          ),
        ]);
      } else if (this.selectedRegions.length > 1) {
        if (!fetchOnlyOne) {
          data = await this.getData(data, [
            getHealthcareDataForManyRegions(
              this.selectedVisitsMetric?.id,
              newRegions,
              this.startYear,
              this.endYear
            ),
            getHealthcareDataForManyRegions(
              this.selectedPatientsMetric?.id,
              newRegions,
              this.startYear,
              this.endYear
            ),
            getHealthcareDataForManyRegions(
              this.selectedDaysMetric?.id,
              newRegions,
              this.startYear,
              this.endYear
            ),
          ]);
        } else {
          switch (fetchOnlyOne) {
            case 'Visits':
              data = await this.getData(data, [
                getHealthcareDataForManyRegions(
                  this.selectedVisitsMetric?.id,
                  newRegions,
                  this.startYear,
                  this.endYear
                ),
                this.healthCareData.patients,
                this.healthCareData.days,
              ]);
              break;
            case 'Patients':
              data = await this.getData(data, [
                this.healthCareData.visits,
                getHealthcareDataForManyRegions(
                  this.selectedPatientsMetric?.id,
                  newRegions,
                  this.startYear,
                  this.endYear
                ),
                this.healthCareData.days,
              ]);
              break;
            case 'Length of stay':
              data = await this.getData(data, [
                this.healthCareData.visits,
                this.healthCareData.patients,
                getHealthcareDataForManyRegions(
                  this.selectedDaysMetric?.id,
                  newRegions,
                  this.startYear,
                  this.endYear
                ),
              ]);
              break;
          }
        }
      }
      this.healthCareData = fetchAll
        ? data
        : {
            visits: this.healthCareData.visits.concat(data.visits),
            patients: this.healthCareData.patients.concat(data.patients),
            days: this.healthCareData.days.concat(data.days),
          };
      this.updateCharts();
    },
    args: () => [],
    autoRun: false,
  });

  // promises should be an array of promises for visits, patients, care days in that order
  async getData(data, promises) {
    const [visits, patients, days] = await Promise.all(promises);
    return { ...data, visits, patients, days };
  }

  render() {
    return html`
      <div id="container">
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
        ${this._fetchHealthcareDataTask.render({
          initial: () => loadingView,
          pending: () => loadingView,
          complete: () => ``,
          error: e => errorView(e),
        })}
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
    this.visitsChart = Highcharts.chart(
      this.shadowRoot.querySelector('#visits-chart'),
      this.getVisitsChartOptions()
    );
    this.patientsChart = Highcharts.chart(
      this.shadowRoot.querySelector('#patients-chart'),
      this.getPatientsChartOptions()
    );
    this.caredaysChart = Highcharts.chart(
      this.shadowRoot.querySelector('#caredays-chart'),
      this.getCareDaysChartOptions()
    );
  }

  updateCharts() {
    if (!this.patientsChart || !this.caredaysChart || !this.visitsChart) return;
    this.visitsChart.update({ series: this.healthCareData.visits }, true, true);
    this.patientsChart.update(
      { series: this.healthCareData.patients },
      true,
      true
    );
    this.caredaysChart.update({ series: this.healthCareData.days }, true, true);
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
    if (this.visitsChart.series.length === 0) return false;
    const hasDataForStartYear = this.healthCareData.visits
      .map(d => d.data)
      .flat()
      .find(d => d[0] === this.startYear);
    const hasDataForEndYear = this.healthCareData.visits
      .map(d => d.data)
      .flat()
      .find(d => d[0] === this.endYear);
    if (!hasDataForStartYear || !hasDataForEndYear) return false;
    return true;
  }

  getVisitsChartOptions() {
    return {
      title: { text: '' },
      credits: { enabled: false },
      subtitle: { text: 'Visits per 1000 inhabitants' },
      yAxis: { title: { text: 'Visits' } },
      xAxis: { tickInterval: 1, minRange: 1 },
      legend: {
        layout: 'horizontal',
        align: 'right',
        verticalAlign: 'top',
      },
      series: this.healthCareData.visits,
    };
  }

  getPatientsChartOptions() {
    return {
      title: { text: '' },
      credits: { enabled: false },
      subtitle: { text: 'Patients per 1000 inhabitants' },
      yAxis: { title: { text: 'Patients' } },
      xAxis: { tickInterval: 1, minRange: 1 },
      legend: {
        layout: 'horizontal',
        align: 'right',
        verticalAlign: 'top',
      },
      series: this.healthCareData.patients,
    };
  }

  getCareDaysChartOptions() {
    return {
      title: { text: '' },
      credits: { enabled: false },
      subtitle: { text: 'Avg. length of stay' },
      yAxis: { title: { text: 'Days' } },
      xAxis: { tickInterval: 1, minRange: 1 },
      legend: {
        layout: 'horizontal',
        align: 'right',
        verticalAlign: 'top',
      },
      series: this.healthCareData.days,
    };
  }

  static styles = [
    css`
      #container {
        position: relative;
        height: 100%;
      }
      .selection-radio {
        width: 100%;
        display: flex;
        align-content: center;
        justify-content: center;
      }
      #visits-chart,
      #patients-chart,
      #caredays-chart {
        height: 43vh;
      }
    `,
    commonStyles,
  ];
}
customElements.define('healthcare-time-series', HealthcareTimeSeries);
