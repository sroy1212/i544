import { createGradesWebService, GradesWebService } from './grades-ws.js';
import { Errors as E, Types as T, Grades, AggrFns } from 'grades-client-lib';

/** Factory function for WsGradesManager */
export async function createWsGradesManager(wsHostUrl: string) {
  return new WsGradesManager(wsHostUrl);
}

/** Provide convenience API for the DOM layer.
 *  Wraps an instance of Grades as a cache for the server data.
 *  The web services are used to keep the cache in sync with the server.
 */
export class WsGradesManager {
  private readonly grades: Grades;  // local cache for server data
  private readonly ws: GradesWebService;    // instance returned by createGradesWebService
  private readonly loadedSections: Set<T.SectionId>;

  constructor(wsHostUrl: string) {
    this.grades = new Grades(AggrFns.rowAggrFns, AggrFns.colAggrFns);
    this.ws = createGradesWebService(wsHostUrl);
    this.loadedSections = new Set();
  }

  getGrades() {
    return this.grades;
  }

  /** Fetch section info from server and add it to the cache. */
  
  /** Return the cached section info, if available */
  getSectionInfoCache(sectionId: T.SectionId): T.SectionInfo | undefined {
    const result = this.grades.getSectionInfo(sectionId);
    if (result.isOk) {
      return result.val;
    }
    return undefined;
  }

  /** Fetch section data and load students and scores into cache */
  async getSectionData(sectionId: T.SectionId): Promise<E.Result<T.SectionData, E.Errs>> {
    const rawSectionDataResult = await this.ws.getRawSectionData(sectionId);
    if (!rawSectionDataResult.isOk) {
      return E.errResult((rawSectionDataResult as any).err);
    }
    const rawSectionData = rawSectionDataResult.val;

    for (const rowId of Object.keys(rawSectionData)) {
      if (T.isStudentId(rowId)) {
        const studentFetchResult = await this.ws.getStudent(rowId as T.StudentId);
        if (!studentFetchResult.isOk) {
          return E.errResult((studentFetchResult as any).err);
        }
        this.grades.addStudent(studentFetchResult.val);
        const enrollmentResult = this.grades.enrollStudent(sectionId, rowId as T.StudentId);
        if (!enrollmentResult.isOk) {
          return E.errResult(E.Errs.fromErr((enrollmentResult as any).err));
        }
      }
    }

    for (const [rowId, rowData] of Object.entries(rawSectionData)) {
      if (T.isStudentId(rowId)) {
        for (const [colId, score] of Object.entries(rowData)) {
          const addLocalScoreResult = this.grades.addScore(
            sectionId,
            rowId as T.StudentId,
            colId as T.ColId,
            score as T.Score
          );
          if (!addLocalScoreResult.isOk) {
            return E.errResult(E.Errs.fromErr((addLocalScoreResult as any).err));
          }
        }
      }
    }

    const result = this.grades.getSectionData(sectionId);
    if (!result.isOk) {
      return E.errResult(E.Errs.fromErr((result as any).err));
    }
    return E.okResult(result.val);
  }

  /** Add a single score (from user input) to both cache and server */
  async addScore(
    sectionId: T.SectionId,
    studentId: T.StudentId,
    colId: T.ColId,
    score: T.Score
  ): Promise<E.Result<void, E.Errs>> {
    const localUpdateResult = this.grades.addScore(sectionId, studentId, colId, score);
    if (!localUpdateResult.isOk) {
      return E.errResult(E.Errs.fromErr((localUpdateResult as any).err));
    }
    const remoteUpdateResult = await this.ws.addScore(sectionId, studentId, colId, score);
    if (!remoteUpdateResult.isOk) {
      return E.errResult((remoteUpdateResult as any).err);
    }
    return E.okResult(undefined);
  }

  /** Fetch all sections (for dropdown menu) */
  async getSections(): Promise<E.Result<any[], E.Errs>> {
    const res = await this.ws.getSections();
    if (!res.isOk) {
      return E.errResult((res as any).err);
    }
    return E.okResult(res.val);
  }
}