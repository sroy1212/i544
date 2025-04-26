import { makeWsGrades, WsGrades } from './ws-grades.js';

import { Errors as E, Types as T, SECTION_IDS } from 'grades-client-lib';

/** Factory function for App.  Does any asynchronous initialization
 * before calling constructor.
 */
export default async function makeApp(wsHostUrl: string) {
  const wsGrades = await makeWsGrades(wsHostUrl);
  //TODO: do any async initialization
  return new App(wsGrades); //TODO: add more args if necessary
}

class App {

  private readonly wsGrades: WsGrades;
  private sectionId: T.SectionId;
  private isEditable: boolean;

  constructor(wsGrades: WsGrades) { //TODO: add more args if necessary
    this.wsGrades = wsGrades;
    this.sectionId = '' as T.SectionId;
    this.isEditable = false;

    //TODO: add #sectionId options, set up change handler for form widgets
    //      and other stuff
  }

  // TODO: add methods, including properties initialized to
  // fat-arrow functions (to avoid problems with this).

}

//TODO: add any necessary functions


/******************************** Errors *******************************/

/** add errors from result to #errors */
function errors<T>(result: E.Result<T, E.Errs>) {
  if (result.isOk === true) return;
  const errWidget = document.querySelector('#errors');
  for (const e of result.err.errors()) {
    errWidget.append(makeElement('li', {}, e.message));
  }
}

/** clear out all errors from #errors */
function clearErrors() {
  const errWidget = document.querySelector('#errors');
  errWidget.innerHTML = '';
}

/***************************** DOM Utilities ***************************/

/** Return a new DOM element with specified tagName, attributes
 *  given by object attrs and contained text.
 */
function makeElement(tagName: string, attrs: {[attr: string]: string} = {},
		     text='')
  : HTMLElement
{
  const element = document.createElement(tagName);
  for (const [k, v] of Object.entries(attrs)) {
    element.setAttribute(k, v);
  }
  if (text.length > 0) element.append(text);
  return element;
}

