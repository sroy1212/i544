import React from 'react';

import { Types as T, Errors as E, SECTION_IDS } from 'grades-client-lib';

import { WsGrades } from '../lib/ws-grades.js';

type AppProps = {
  wsGrades: WsGrades
};

export function App(props: AppProps) {

  const { wsGrades } = props;
  const [ errs, setErrs ] = React.useState<E.Errs>(null);

  return <>
  
    <Errors errs={errs}/>
   
  </>;

}

type ErrorsProps = {
  errs: E.Errs;
};

function Errors(props: ErrorsProps) {
  const { errs } = props;
  if (!errs) return '';
  const lis = [];
  for (const e of errs.errors()) {
    lis.push(<li key={e.message}>{e.message}</li>);
  }
  return <ul className="error">{lis}</ul>;
}
