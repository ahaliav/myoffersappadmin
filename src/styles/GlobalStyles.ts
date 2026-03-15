import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  :root {
    --bg-main: #f8fafc;
    --sidebar: #0f172a;
    --primary: #3b82f6;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--bg-main);
    color: #0f172a;
    -webkit-font-smoothing: antialiased;
  }

  #root {
    min-height: 100vh;
  }
`;
