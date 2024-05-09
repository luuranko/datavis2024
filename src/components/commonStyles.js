import { css } from 'lit';

export const commonStyles = css`
  .loader {
    position: absolute;
    top: 0;
    right: 0;
    background-color: rgba(255, 255, 255, 0.6);
    height: 100%;
    width: 100%;
    display: flex;
    align-content: center;
    justify-content: center;
    padding-top: 10vh;
  }
  .loader > span {
    font-size: 1.5rem;
    color: var(--sl-color-neutral-500);
    background-color: white;
    height: min-content;
    padding: 1rem;
    border: 1px grey dotted;
    border-radius: 5%;
  }
  .chart-section-height {
    height: 45vh;
  }
`;
