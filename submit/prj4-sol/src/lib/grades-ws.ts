import { Errors as E, Types as T } from 'grades-client-lib';

// Step 1: Define the SERVER_URL globally
const SERVER_URL = "https://localhost:2345"; 

/** Factory function for creating an instance of GradesWebService */
export function createGradesWebService(url: string = SERVER_URL) {
  return new GradesWebService(url); 
}

/** Single point of access for Project 3 web services. */
export class GradesWebService {
  constructor(private readonly serviceUrl: string) { }

  async addStudent(student: T.Student): Promise<E.Result<void, E.Errs>> {
    const url = this.wsUrl('students');
    return await doFetchJson<void>('put', url, student);
  }

  async getStudent(studentId: T.StudentId): Promise<E.Result<T.Student, E.Errs>> {
    const url = this.wsUrl(`students/${studentId}`);
    return await doFetchJson<T.Student>('get', url);
  }

  async getSections(): Promise<E.Result<any[], E.Errs>> {
    const url = this.wsUrl('sections');
    return await doFetchJson<any[]>('get', url);
  }

  async addSectionInfo(sectionInfo: T.SectionInfo): Promise<E.Result<void, E.Errs>> {
    const url = this.wsUrl('sections/info');
    return await doFetchJson<void>('put', url, sectionInfo);
  }

  async getSectionInfo(sectionId: T.SectionId): Promise<E.Result<T.SectionInfo, E.Errs>> {
    const url = this.wsUrl(`sections/${sectionId}/info`);
    return await doFetchJson<T.SectionInfo>('get', url);
  }

  async enrollStudent(sectionId: T.SectionId, studentId: T.StudentId): Promise<E.Result<void, E.Errs>> {
    const url = this.wsUrl(`sections/${sectionId}/students`);
    return await doFetchJson<void>('put', url, studentId);
  }

  async addScore(sectionId: T.SectionId, studentId: T.StudentId, assignId: T.ColId, score: T.Score): Promise<E.Result<void, E.Errs>> {
    const url = this.wsUrl(`sections/${sectionId}/data/${studentId}/${assignId}`);
    return await doFetchJson<void>('patch', url, score);
  }

  async addScores(sectionId: T.SectionId, studentId: T.StudentId, scores: Record<T.ColId, T.Score>): Promise<E.Result<void, E.Errs>> {
    const url = this.wsUrl(`sections/${sectionId}/data/${studentId}`);
    return await doFetchJson<void>('patch', url, scores);
  }

  async getEntry(sectionId: T.SectionId, studentId: T.StudentId, colId: T.ColId): Promise<E.Result<T.Entry, E.Errs>> {
    const url = this.wsUrl(`sections/${sectionId}/data/${studentId}/${colId}`);
    return await doFetchJson<T.Entry>('get', url);
  }

  async getSectionData(sectionId: T.SectionId, query: Record<string, string | string[]>): Promise<E.Result<T.SectionData, E.Errs>> {
    const url = this.wsUrl(`sections/${sectionId}/data, query`);
    return await doFetchJson<T.SectionData>('get', url);
  }

  async getAllSectionData(sectionId: T.SectionId): Promise<E.Result<T.SectionData, E.Errs>> {
    return await this.getSectionData(sectionId, { kind: 'all' });
  }

  async getRawSectionData(sectionId: T.SectionId): Promise<E.Result<T.SectionData, E.Errs>> {
    return await this.getSectionData(sectionId, { kind: 'raw' });
  }

  async getStudentSectionData(sectionId: T.SectionId, studentId: T.StudentId): Promise<E.Result<T.SectionData, E.Errs>> {
    return await this.getSectionData(sectionId, { kind: 'student', studentId });
  }

  async getAggrRowsSectionData(sectionId: T.SectionId): Promise<E.Result<T.SectionData, E.Errs>> {
    return await this.getSectionData(sectionId, { kind: 'aggrRows' });
  }

  async getSelectSectionData(sectionId: T.SectionId, rowIds: T.RowId[] = [], colIds: T.ColId[] = []): Promise<E.Result<T.SectionData, E.Errs>> {
    const query: Record<string, string | string[]> = { kind: 'select', rowId: rowIds, colId: colIds };
    return await this.getSectionData(sectionId, query);
  }

  /** Helper to build full URL */
  private wsUrl(relApiPath: string, query?: Record<string, string | string[]>): string {
    const url = new URL(this.serviceUrl);  
    url.pathname = `/api/${relApiPath}`;  
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (Array.isArray(value)) {
          for (const v of value) url.searchParams.append(key, v); 
        } else {
          url.searchParams.append(key, value);  
        }
      }
    }
    return url.href;  // Return the full URL
  }
}

/** Generic fetch helper */
async function doFetchJson<T>(method: string, url: string, jsonBody?: any): Promise<E.Result<T, E.Errs>> {
  try {
    console.log(`Fetching data from: ${url}`);  // Log the URL being fetched
    const fetchOptions: RequestInit = { method: method.toUpperCase() };
    if (jsonBody !== undefined) {
      fetchOptions.headers = { 'Content-Type': 'application/json' };
      fetchOptions.body = JSON.stringify(jsonBody);
    }

    const serverResponse = await fetch(url, fetchOptions);
    console.log(`serverResponse status: ${serverResponse.status}`);  // Log the serverResponse status

    const respContentLength = serverResponse.headers.get('Content-Length');
    if (!respContentLength || parseInt(respContentLength) === 0) {
      console.error(`Empty serverResponse body for URL: ${url}`);
      return E.errResult(E.Errs.err(`${method} ${url}: empty serverResponse`));
    }

    const responseEnvelope = await serverResponse.json();
    console.log(`serverResponse body: ${JSON.stringify(responseEnvelope)}`);  // Log the serverResponse body

    if (!('isOk' in responseEnvelope)) {
      console.error(`Invalid serverResponse responseEnvelope for URL: ${url}`);
      return E.errResult(E.Errs.err(`${method} ${url}: invalid serverResponse responseEnvelope`));
    }

    if (responseEnvelope.isOk) {
      console.log(`Successfully fetched data: ${JSON.stringify(responseEnvelope.result)}`);
      return E.okResult(responseEnvelope.result as T);
    } else {
      console.error(`Error serverResponse: ${JSON.stringify(responseEnvelope.errors)}`);
      return makeErrors<T>(method, url, responseEnvelope.errors);
    }
  } catch (err) {
    console.error(`Error fetching data from ${url}: ${err}`);
    return E.errResult(E.Errs.err(err as Error));
  }
}


/** Helper to build multiple errors */
function makeErrors<T>(method: string, url: string, errorObjects: any): E.Result<T, E.Errs> {
  if (!Array.isArray(errorObjects)) {
    return E.errResult(E.Errs.err(`${method} ${url}: errors is not array`));
  }
  if (errorObjects.length === 0) {
    return E.errResult(E.Errs.err(`${method} ${url}: empty errors array`));
  }
  const errs = new E.Errs();
  for (const errorItem of errorObjects) {
    if (errorItem.message !== undefined && errorItem.code !== undefined) {
      errs.add(E.Err.err(errorItem.message, errorItem.code, errorItem.fetchOptions));
    } else {
      errs.add(E.Err.err(errorItem));
    }
  }
  return E.errResult(errs);
}