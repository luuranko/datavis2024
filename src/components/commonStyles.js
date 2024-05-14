import { html, css } from 'lit';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';

export const loadingView = html`
  <div class="overlay">
    <sl-spinner></sl-spinner>
  </div>
`;

export const errorView = error => html`
  <div class="overlay">
    <span class="error">Error ${error}</span>
  </div>
`;

export const commonStyles = css`
  .overlay {
    position: absolute;
    top: 0;
    right: 0;
    background-color: rgba(255, 255, 255, 0.6);
    height: 100%;
    width: 100%;
    display: flex;
    align-content: center;
    justify-content: center;
    padding-top: 15vh;
    color: var(--sl-color-neutral-500);
  }
  .overlay > span {
    font-size: 1.5rem;
    background-color: white;
    height: min-content;
    padding: 1rem;
    border: 1px grey dotted;
    border-radius: 5%;
  }
  sl-spinner {
    font-size: 5rem;
  }
  .error {
    color: var(--sl-color-danger-700);
  }
  .chart-section-height {
    height: 45vh;
  }
`;
