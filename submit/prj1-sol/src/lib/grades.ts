import * as T from './types.js';
import * as E from './errors.js';

// application error codes are defined so that they can be mapped to
// meaningful HTTP 4xx error codes.  In particular, 400 BAD REQUEST,
// 404 NOT FOUND, 409 CONFLICT and 422 UNPROCESSABLE CONTENT.

/** store grades for multiple sections */
export default class Grades  {

  //TODO: use private instance properties

  constructor(rowAggrFns: Record<string, T.RowAggrFn>,
	      colAggrFns: Record<string, T.ColAggrFn>) {
    //TODO: squirrel away args in instance properties
    //TODO: create/initialize any other instance properties.
  }

  /** add or replace student in this Grades object. */
  addStudent(student: T.Student) {
    //TODO
  }
  
  /** add or replace sectionInfo in this Grades object.
   *
   * Errors:
   *   BAD_CONTENT: section contains unknown aggr function name
   */
  addSectionInfo(sectionInfo: T.SectionInfo) : E.Result<void, E.Err> {
    //TODO
    return E.okResult(undefined);  //indicates a successful void return
  }
  

  /** enroll student specified by studentId in section sectionId.  It is
   *  not an error if the student is already enrolled.
   *
   * Errors:
   *   NOT_FOUND: unknown sectionId or studentId.
   */
  enrollStudent(sectionId: T.SectionId, studentId: T.StudentId) 
    : E.Result<void, E.Err> 
  {
    //TODO
    return E.okResult(undefined);
  }


  /** add or replace score for studentId for assignment given by colId
   *  in section sectionId.
   *
   * Errors:
   *   NOT_FOUND: unknown sectionId, studentId or colId.
   *   BAD_CONTENT: student not enrolled in section, or colId
   *   inappropriate for score.
   */
  addScore(sectionId: T.SectionId, studentId: T.StudentId, colId: T.ColId,
	   score: T.Score) : E.Result<void, E.Err> {
    //TODO
    return E.okResult(undefined);
  }

  /** return entry at [sectionId][rowId][colId].
   *
   *  Errors:
   *    NOT_FOUND: unknown sectionId, rowId or colId.
   *    BAD_CONTENT: rowId is a studentId who is not enrolled in sectionId.
   */
  getEntry(sectionId: T.SectionId, rowId: T.RowId, colId: T.ColId)
    : E.Result<T.Entry, E.Err> 
  {
    //TODO
    return E.okResult(null); 
  }

  /** return full data (including aggregate data) for sectionId.  If
   *  rowIds is non-empty, then only the rows having those rowId's are
   *  returned.  If colIds is non-empty, then only the columns having
   *  those colId's are returned.
   *
   *  If no rowIds are specified, then the rows should be sorted by rowId,
   *  otherwise they should be in the order specified by rowIds.  If no
   *  colIds are specified, then they should be in the order specified by
   *  the sectionInfo, otherwise they should be in the order specified by
   *  colIds (ordering is possible, because JS objects preserve insertion
   *  order).
   *
   *  Note that the RowAggrFns are applied first across the rows of
   *  the table; then the ColAggrFns are applied to the columns
   *  (including AggrCols of the table.  It follows that ColAggrsFns
   *  can be applied to the result of a RowAggrFn, but RowAggrFns can
   *  never be applied to the result of a ColAggrFn.
   *
   * Errors:
   *   NOT_FOUND: unknown sectionId, rowId or colId.
   *   BAD_CONTENT: row specifies a studentId of a known but unenrolled student
   */
  getSectionData(sectionId: T.SectionId, rowIds: T.RowId[] = [],
	  colIds: T.ColId[] = []) : E.Result<T.SectionData, E.Err>
  {
    //TODO
    return E.okResult({});
  }

  //TODO: add private methods as needed.
	     
  
};

//T.* types for aggregate headers only provide the names for aggregate
//function using an aggrFnName property.  Enhance those types with an
//additional aggrFn property which has the actual definition.

//Note that we provide local definitions which use the same name as
//the types in T.*.  So T.ColHdr are column headers which only contain
//the aggregate function name, whereas the local name ColHdr (local to
//this file) contains both the aggregate function name *and
//definition*.

type AggrColHdr = T.AggrColHdr &  { aggrFn: T.RowAggrFn, };
type ColHdr = Exclude<T.ColHdr, T.AggrColHdr> | AggrColHdr;

type AggrRowHdr = T.AggrRowHdr &  { aggrFn: T.ColAggrFn, };
type RowHdr = Exclude<T.RowHdr, T.AggrRowHdr> | AggrRowHdr;

type SectionInfo = Omit<T.SectionInfo, 'colHdrs' | 'rowHdrs'> &
  { colHdrs: Record<T.ColId, ColHdr>,
    rowHdrs: Record<T.RowId, RowHdr>,
  };


//TODO: add local types and definitions as needed.
