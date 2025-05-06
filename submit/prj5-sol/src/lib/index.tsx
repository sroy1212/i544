import { App } from '../components/app.js';
import { makeWsGrades } from './ws-grades.js';

import React from 'react';
import * as ReactDOM from 'react-dom/client';

const DEFAULT_WS_URL = 'https://localhost:2345';


makeWsGrades(getWsUrl()).then(wsGrades => {
  ReactDOM.createRoot(document.querySelector('#app')!)
    .render(<App wsGrades={wsGrades}/>);
});

function getWsUrl() {
  const url = new URL(document.location.href);
  return url?.searchParams?.get('ws-url') ?? DEFAULT_WS_URL;
}
