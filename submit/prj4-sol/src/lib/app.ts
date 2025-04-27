import { createWsGradesManager, WsGradesManager} from './ws-grades.js';
import { Errors as E, Types as T, SECTION_IDS } from 'grades-client-lib';

/** Factory function for App.  Does any asynchronous initialization
 * before calling constructor.
 */
export default async function makeApp(wsHostUrl: string) {
  const wsGrades = await createWsGradesManager(wsHostUrl);
  return new GradesApp(wsGrades);
}

class GradesApp {
  private readonly wsGrades: WsGradesManager;
  private sectionId: T.SectionId;
  private isEditable: boolean;

  constructor(wsGrades: WsGradesManager) {
    this.wsGrades = wsGrades;
    this.sectionId = '' as T.SectionId;
    this.isEditable = false;

    this.setupSectionDropdown();
    this.setupEditToggle();
  }

  setupSectionDropdown = () => {
    const select = document.querySelector('#section-id') as HTMLSelectElement;
    for (const id of SECTION_IDS) {
      select.append(makeElement('option', { value: id }, id));
    }
    select.addEventListener('change', async (e) => {
      const target = e.target as HTMLSelectElement;
      this.sectionId = target.value as T.SectionId;
      await this.renderSelectedSection();
    });
  };

  setupEditToggle = () => {
    const editableCheckbox = document.querySelector('#is-editable') as HTMLInputElement;
    editableCheckbox.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      this.isEditable = target.checked;
      await this.renderSelectedSection();
    });
  };

  renderSelectedSection = async () => {
    clearErrors();
    if (!this.sectionId) return;

    const result = await this.wsGrades.getSectionData(this.sectionId);
    if (result.isOk) {
      console.log('SectionData:', result.val); 
    } else {
      errors(result);
    }
  };

  buildGradesTable = (sectionData: any) => {
    const table = document.querySelector('#grades table') as HTMLElement;
    table.innerHTML = ''; // Clear old table

  };

  createCell = (value: string | number, editable: boolean) => {
    const td = makeElement('td');
    if (editable) {
      const input = makeElement('input', { value: String(value), type: 'text' });
      td.append(input);
    } else {
      td.append(String(value));
    }
    return td;
  };
}

/**** Errors *****/

function errors<T>(result: E.Result<T, E.Errs>) {
  if (result.isOk === true) return;
  const errWidget = document.querySelector('#errors');
  for (const e of result.err.errors()) {
    errWidget.append(makeElement('li', {}, e.message));
  }
}

function clearErrors() {
  const errWidget = document.querySelector('#errors');
  errWidget.innerHTML = '';
}

/**** DOM Utilities ****/

function makeElement(tagName: string, attrs: { [attr: string]: string } = {}, text = '')
  : HTMLElement {
  const element = document.createElement(tagName);
  for (const [k, v] of Object.entries(attrs)) {
    element.setAttribute(k, v);
  }
  if (text.length > 0) element.append(text);
  return element;
}