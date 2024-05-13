import { LitElement, html, css } from 'lit';

import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/menu/menu.js';
import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';
import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
import '@shoelace-style/shoelace/dist/components/badge/badge.js';
import '@shoelace-style/shoelace/dist/components/tag/tag.js';
import '@shoelace-style/shoelace/dist/components/radio-group/radio-group.js';
import '@shoelace-style/shoelace/dist/components/radio/radio.js';

import { diseasesByCategory, findDiseaseByIndex } from '../diseases';

export class DiseaseFilters extends LitElement {
  static properties = {
    currentDiseaseCategory: { type: String },
    selectedDiseases: { type: Array },
    currentDisease: { type: String },
  };

  constructor() {
    super();
    this.selectedDiseases = [];
    this.currentDisease = null;
    this.currentDiseaseCategory = 7; // All diseases
  }

  render() {
    const categories = diseasesByCategory();
    const options = categories.find(
      c => c.id === this.currentDiseaseCategory
    ).diseases;
    return html`
      <div id="diseases-selection">
        <small>Select disease category</small>
        <sl-select
          id="category-selection"
          ?hoist=${true}
          .value=${`${this.currentDiseaseCategory}`}
          @sl-change=${e =>
            (this.currentDiseaseCategory = parseInt(e.target.value))}>
          ${categories.map(c => {
            return html` <sl-option value=${`${c.id}`}>${c.name}</sl-option> `;
          })}
        </sl-select>
        <small>Select diseases</small>
        ${this.getDiseaseSelection(options)}
        ${this.getSelectCurrentDiseaseFilter()}
      </div>
    `;
  }

  getDiseaseSelection(options) {
    const menuItems = options.map(option => this.getMenuItem(option));
    return html`
      <sl-dropdown
        @sl-select=${e => this.handleSelectItem(e)}
        @sl-clear=${e => this.handleClearSelection(e)}>
        <sl-select
          id="display-selected"
          slot="trigger"
          multiple
          clearable
          .value=${this.selectedDiseases.map(d => `${d.index}`)}>
          ${this.selectedDiseases.map(
            d =>
              html`<sl-option value=${`${d.index}`}
                >${d.displayName}</sl-option
              > `
          )}
        </sl-select>
        <sl-menu>${menuItems}</sl-menu>
      </sl-dropdown>
    `;
  }

  getMenuItem(option) {
    if (option.children) {
      const selectedChildrenCount = option.children.filter(child =>
        this.selectedDiseases.includes(child)
      ).length;
      return html`
        <sl-menu-item type="checkbox">
          <sl-badge
            slot="prefix"
            variant="primary"
            class=${selectedChildrenCount > 0 ? '' : 'hidden'}
            pill
            >${selectedChildrenCount}</sl-badge
          >
          ${option.displayName}
          <sl-menu slot="submenu">
            ${option.children.map(child => {
              return html`
                <sl-menu-item
                  class="sub-item"
                  type="checkbox"
                  ?checked=${this.selectedDiseases.includes(child)}
                  value=${`${child.index}`}>
                  ${child.displayName}
                </sl-menu-item>
              `;
            })}
          </sl-menu>
        </sl-menu-item>
      `;
    } else {
      return html`
        <sl-menu-item
          type="checkbox"
          value=${`${option.index}`}
          ?checked=${this.selectedDiseases.includes(option)}>
          ${option.displayName}
        </sl-menu-item>
      `;
    }
  }

  getSelectCurrentDiseaseFilter() {
    if (this.selectedDiseases.length < 2 || !this.currentDisease) return '';
    const selectedOptions = this.selectedDiseases.map(d => {
      return html`
        <div class="radio-listing">
          <sl-radio value=${`${d.index}`}> ${d.displayName} </sl-radio>
          <sl-icon-button
            name="x-square"
            label="Remove"
            class="delete-button"
            @click=${e => {
              e.stopPropagation();
              this.removeSelectedDisease(d.index);
            }}></sl-icon-button>
        </div>
      `;
    });
    return html`
      <div id="selected-list">
        <sl-radio-group
          label="Compare regions by"
          name="Select current disease"
          value=${`${this.currentDisease.index}`}
          @sl-change=${e => this.switchCurrentDisease(e)}>
          ${selectedOptions}
        </sl-radio-group>
      </div>
    `;
  }

  switchCurrentDisease(e) {
    if (!e.target) return;
    const index = parseInt(e.target.value);
    if (!this.selectedDiseases.find(d => d.index === index)) return;
    this.currentDisease = findDiseaseByIndex(index);
    const options = {
      bubbles: true,
      composed: true,
      detail: { currentDisease: this.currentDisease },
    };
    this.dispatchEvent(new CustomEvent('change-current-disease', options));
  }

  sendSelectedDiseases() {
    if (this.selectedDiseases.length > 0) {
      if (
        !this.currentDisease ||
        !this.selectedDiseases.includes(this.currentDisease)
      ) {
        this.currentDisease = this.selectedDiseases[0];
      }
    } else {
      this.currentDisease = null;
    }
    const options = {
      bubbles: true,
      composed: true,
      detail: {
        diseases: this.selectedDiseases,
        currentDisease: this.currentDisease,
      },
    };
    this.dispatchEvent(new CustomEvent('change-selected-diseases', options));
  }

  handleClearSelection() {
    this.selectedDiseases = [];
    this.sendSelectedDiseases();
  }

  handleSelectItem(e) {
    const el = e.detail.item;
    const val = el.value;
    if (e.target.slot !== 'submenu' && el.className === 'sub-item') {
      return;
    }
    if (this.selectedDiseases.map(d => d.index).includes(parseInt(val))) {
      this.removeSelectedDisease(val);
    } else {
      this.addDisease(val);
    }
  }

  addDisease(index) {
    const val = parseInt(index);
    const newDisease = findDiseaseByIndex(val);
    this.selectedDiseases = [...this.selectedDiseases, newDisease];
    this.sendSelectedDiseases();
  }

  removeSelectedDisease(index) {
    const val = parseInt(index);
    this.selectedDiseases = this.selectedDiseases.filter(d => d.index !== val);
    this.sendSelectedDiseases();
  }

  static styles = [
    css`
      #diseases-selection {
        padding: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        height: 100%;
      }
      sl-dropdown,
      sl-menu,
      #category-selection {
        width: 20rem;
      }
      sl-select#display-selected::part(listbox) {
        display: none;
      }
      sl-select#display-selected::part(tag__remove-button) {
        display: none;
      }
      .hidden {
        display: none;
      }
      sl-radio::part(base) {
        align-items: center;
      }
      #selected-list {
        height: 100%;
        overflow-y: hidden;
      }
      sl-radio-group {
        width: 100%;
        height: 90%;
        overflow-y: auto;
      }
      sl-radio {
        width: 80%;
      }
      .radio-listing {
        display: flex;
        flex-direction: row;
        gap: 1rem;
        align-items: center;
        width: 100%;
      }
      .delete-button {
        color: var(--sl-color-danger-600);
      }
      .delete-button::part(base):hover {
        color: var(--sl-color-danger-400);
      }
      .delete-button::part(base):active {
        color: var(--sl-color-danger-700);
      }
    `,
  ];
}
customElements.define('disease-filters', DiseaseFilters);
