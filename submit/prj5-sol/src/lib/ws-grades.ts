import { makeGradesWs, GradesWs } from './grades-ws.js';

import { Errors as E, Types as T, Grades, AggrFns } from 'grades-client-lib';

/** factory function for WsGrades */
export async function makeWsGrades(wsHostUrl: string) {
  return new WsGrades(wsHostUrl);
}

/** Provide convenience API for the DOM layer.
 *  Uses an instance of Grades as a cache.  All aggregate computation
 *  is performed by the cache.  The web services are used to ensure
 *  that the cache is sync'd with the state of the server.
 */
export class WsGrades {
  private readonly grades: Grades;  //cache for server data
  private readonly ws: GradesWs;
  private readonly loadedInfos: Set<T.SectionId>;
  private readonly loadedData: Set<T.SectionId>;

  constructor(wsHostUrl: string) {
    this.grades = new Grades(AggrFns.rowAggrFns, AggrFns.colAggrFns);
    this.ws = makeGradesWs(wsHostUrl);
    this.loadedInfos = new Set();
    this.loadedData = new Set();
  }

  async getSectionInfo(sectionId: T.SectionId)
    : Promise<E.Result<T.SectionInfo, E.Errs>> 
  {
    return await this.loadSectionInfo(sectionId);
  }
  
  async getAllSectionData(sectionId: T.SectionId)
    : Promise<E.Result<T.SectionData, E.Errs>> 
  {
    return await this.loadSectionData(sectionId);
  }

  async addScore(sectionId: T.SectionId, studentId: T.StudentId, colId: T.ColId,
		 score: T.Score) : Promise<E.Result<T.SectionData, E.Errs>> {
    const infoLoadResult = await this.loadSectionInfo(sectionId);
    if (!infoLoadResult.isOk) {
      return infoLoadResult as E.Result<T.SectionData, E.Errs>;
    }
    const addResult = this.grades.addScore(sectionId, studentId, colId, score);
    if (!addResult.isOk) {
      return E.toErrs(addResult)  as E.Result<T.SectionData, E.Errs>;
    }
    const wsAddResult =
      await this.ws.addScore(sectionId, studentId, colId, score);
    if (!wsAddResult.isOk) {
      return wsAddResult as E.Result<T.SectionData, E.Errs>;
    }
    return await this.getAllSectionData(sectionId);
  }

  private async loadSectionInfo(sectionId: T.SectionId)
    : Promise<E.Result<T.SectionInfo, E.Errs>> 
  {
    if (!this.loadedInfos.has(sectionId)) {
      const wsInfoResult = await this.ws.getSectionInfo(sectionId);
      if (!wsInfoResult.isOk) {
	return wsInfoResult as E.Result<T.SectionInfo, E.Errs>;
      }
      const infoResult = this.grades.addSectionInfo(wsInfoResult.val);
      if (!infoResult.isOk) {
	return E.toErrs(infoResult) as E.Result<T.SectionInfo, E.Errs>;
      }
      this.loadedInfos.add(sectionId);
    }
    return E.toErrs(this.grades.getSectionInfo(sectionId));
  }

  private async loadSectionData(sectionId: T.SectionId)
    : Promise<E.Result<T.SectionData, E.Errs>> 
  {
    const infoLoadResult = await this.loadSectionInfo(sectionId);
    if (!infoLoadResult.isOk) return infoLoadResult;
    if (!this.loadedData.has(sectionId)) {
      const wsDataResult = await this.ws.getRawSectionData(sectionId);
      if (!wsDataResult.isOk) {
	return wsDataResult as E.Result<T.SectionData, E.Errs>;
      }
      for (const [rowId, row] of Object.entries(wsDataResult.val)) {
	const studentId = rowId as T.StudentId;
	const enrollResult = await this.enrollStudent(sectionId, studentId);
	if (!enrollResult.isOk) {
	  return enrollResult as E.Result<T.SectionData, E.Errs>;
	}
	for (const [id, score] of Object.entries(row)) {
	  if (id === 'id') continue;
	  const colId = id as T.ColId;
	  const addResult =
	    this.grades.addScore(sectionId, studentId, colId, score as T.Score);
	  if (!addResult.isOk) {
	    return E.toErrs(addResult) as E.Result<T.SectionData, E.Errs>;
	  }
	}
      }
      this.loadedData.add(sectionId);
    }
    const gradesResult = this.grades.getSectionData(sectionId);
    return E.toErrs(gradesResult);    
  }

  private async enrollStudent(sectionId: T.SectionId, studentId: T.StudentId)
    : Promise<E.Result<void, E.Errs>>
  {
    const studentResult = await this.ws.getStudent(studentId);
    if (!studentResult.isOk) {
      return studentResult as E.Result<void, E.Errs>;
    }
    this.grades.addStudent(studentResult.val);
    const enrollResult = this.grades.enrollStudent(sectionId, studentId);
    return E.toErrs(enrollResult);
  }
  
}