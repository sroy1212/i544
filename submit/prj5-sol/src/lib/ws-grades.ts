import { makeGradesWs, GradesWs } from './grades-ws.js';

import { Errors as E, Types as T, Grades, AggrFns } from 'grades-client-lib';

/** factory function for WsGrades */
export async function makeWsGrades(wsHostUrl: string) {
  //TODO: add async initialization if necessary
  return new WsGrades(wsHostUrl); //TODO: can add more args if necessary
}

/** Provide convenience API for the DOM layer.
 *  Uses an instance of Grades as a cache.  All aggregate computation
 *  is performed by the cache.  The web services are used to ensure
 *  that the cache is sync'd with the state of the server.
 */
export class WsGrades {
  private readonly grades: Grades;  //cache for server data
  private readonly ws: GradesWs;
  //TODO: add more properties if needed

  constructor(wsHostUrl: string) {
    this.grades = new Grades(AggrFns.rowAggrFns, AggrFns.colAggrFns);
    this.ws = makeGradesWs(wsHostUrl);
    //TODO: add more initializations if necessary
  }

  //TODO: add methods as necessary
  
}
