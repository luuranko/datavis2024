import { css } from 'lit';

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
    padding-top: 10vh;
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
  .error {
    color: var(--sl-color-danger-700);
  }
  .chart-section-height {
    height: 45vh;
  }
`;
