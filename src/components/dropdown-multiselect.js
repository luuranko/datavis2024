import { LitElement, html, css } from 'lit';

import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/menu/menu.js';
import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';
import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
import '@shoelace-style/shoelace/dist/components/badge/badge.js';

export class DropdownMultiselect extends LitElement {
  static properties = {
    options: { type: Array },
  };

  constructor() {
    super();
    this.options = [];
  }

  render() {
    const menuItems = this.options.map(option => {
      if (option.children) {
        return html`
          <sl-menu-item type="checkbox" value=${`${option.totalId}`}>
            <sl-badge slot="prefix" variant="primary" class="hidden" pill
              >0</sl-badge
            >
            ${option.displayName}
            <sl-menu slot="submenu">
              ${option.children.map(child => {
                return html`
                  <sl-menu-item
                    class="sub-item"
                    type="checkbox"
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
          <sl-menu-item type="checkbox" value=${`${option.index}`}>
            ${option.displayName}
          </sl-menu-item>
        `;
      }
    });
    return html`
      <sl-dropdown
        @sl-select=${e => this.handleSelectItem(e)}
        @sl-clear=${e => this.handleClearSelection(e)}>
        <sl-select
          id="display-selected"
          slot="trigger"
          multiple
          clearable></sl-select>
        <sl-menu> ${menuItems} </sl-menu>
      </sl-dropdown>
    `;
  }

  sendSelectedDiseases() {
    const select = this.renderRoot.querySelector('#display-selected');
    const diseases = select.value.map(d => parseInt(d));
    this.dispatchEvent(
      new CustomEvent('select-diseases', {
        bubbles: true,
        composed: true,
        detail: { diseases },
      })
    );
  }

  handleClearSelection(e) {
    e.target.innerHTML = '';
    this.renderRoot
      .querySelectorAll('sl-menu-item[checked]')
      .forEach(i => (i.checked = false));
    this.renderRoot.querySelectorAll('sl-badge').forEach(badge => {
      badge.textContent = 0;
      badge.className = 'hidden';
    });
    this.sendSelectedDiseases();
  }

  handleSelectItem(e) {
    const el = e.detail.item;
    const val = el.value;
    if (e.target.slot !== 'submenu' && el.className === 'sub-item') {
      el.checked = !el.checked;
      return;
    }
    const select = this.renderRoot.querySelector('#display-selected');
    if (select.value.includes(val)) {
      select.value = select.value.filter(value => value !== val);
      const child = this.renderRoot.querySelector(`sl-option[value="${val}"]`);
      select.removeChild(child);
      el.checked = false;
      if (e.target.slot === 'submenu') {
        const badge = e.target.parentElement.children[0];
        const count = parseInt(badge.textContent) - 1;
        badge.textContent = count;
        if (count === 0) badge.className = 'hidden';
      }
    } else {
      select.value = [...select.value, val];
      const newChild = document.createElement('sl-option');
      newChild.value = val;
      newChild.textContent = el.getTextLabel();
      select.appendChild(newChild);
      if (e.target.slot === 'submenu') {
        const badge = e.target.parentElement.children[0];
        badge.className = '';
        badge.textContent = parseInt(badge.textContent) + 1;
      }
    }
    this.sendSelectedDiseases();
  }

  static styles = [
    css`
      sl-dropdown,
      sl-menu {
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
    `,
  ];
}
customElements.define('dropdown-multiselect', DropdownMultiselect);
