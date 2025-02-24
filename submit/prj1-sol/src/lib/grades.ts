import * as T from './types.js';
import * as E from './errors.js';

// application error codes are defined so that they can be mapped to
// meaningful HTTP 4xx error codes.  In particular, 400 BAD REQUEST,
// 404 NOT FOUND, 409 CONFLICT and 422 UNPROCESSABLE CONTENT.

/** store grades for multiple sections */
export default class Grades  {
  //TODO: use private instance properties
  private readonly rowAggrFns: Record<string, T.RowAggrFn>;
  private readonly colAggrFns: Record<string, T.ColAggrFn>;
  private students: Record<T.StudentId, T.Student>;
  private sections: Record<T.SectionId, {
  sectionInfo: SectionInfo,        // enhanced section info (see local type definition)
  enrolled: Set<T.StudentId>,       // student ids enrolled in this section
  data: T.SectionData,              // raw scores stored by rowId and colId
}>;
  constructor(rowAggrFns: Record<string, T.RowAggrFn>, colAggrFns: Record<string, T.ColAggrFn>) {
    this.rowAggrFns = { ...rowAggrFns };
    this.colAggrFns = { ...colAggrFns };
    this.students = {};
    this.sections = {};
  }

  /** add or replace student in this Grades object. */
  addStudent(student: T.Student) {
    //TODO
    this.students[student.id] = student;
    return E.okResult(undefined); // Return a success result
  }
  
  /** add or replace sectionInfo in this Grades object.
   *
   * Errors:
   *   BAD_CONTENT: section contains unknown aggr function name
   */
  addSectionInfo(sectionInfo: T.SectionInfo): E.Result<void, E.Err> {
    // Process column headers:
    const newColHdrs: Record<T.ColId, ColHdr> = {} as Record<T.ColId, ColHdr>;
    for (const key in sectionInfo.colHdrs) {
      const colId = key as T.ColId;
      const hdr = sectionInfo.colHdrs[colId];
      if (hdr._tag === 'aggrCol') {
        // hdr is of type T.AggrColHdr; attach the actual function
        const aggrHdr = hdr as T.AggrColHdr;
        const fn = this.rowAggrFns[aggrHdr.aggrFnName];
        if (!fn) {
          const msg = `unknown RowAggrFn "${aggrHdr.aggrFnName}"`;
          return E.errResult(E.Err.err(msg, 'BAD_CONTENT'));
        }
        newColHdrs[colId] = { ...aggrHdr, aggrFn: fn };
      } else {
        newColHdrs[colId] = hdr;
      }
    }
  
    // Process row headers:
    const newRowHdrs: Record<T.AggrRowId, RowHdr> = {} as Record<T.AggrRowId, RowHdr>;
    for (const key in sectionInfo.rowHdrs) {
    const rowId = key as T.AggrRowId;
    const hdr = sectionInfo.rowHdrs[rowId];
    if (hdr._tag === 'aggrRow') {
      const aggrHdr = hdr as T.AggrRowHdr;
      const fn = this.colAggrFns[aggrHdr.aggrFnName];
      if (!fn) {
        const msg = `unknown ColAggrFn "${aggrHdr.aggrFnName}"`;
        return E.errResult(E.Err.err(msg, 'BAD_CONTENT'));
      }
      newRowHdrs[rowId] = { ...aggrHdr, aggrFn: fn };
    } else {
    // If a row header is not of type 'aggrRow', that's an error.
    const msg = `invalid row header _tag "${hdr._tag}"`;
    return E.errResult(E.Err.err(msg, 'BAD_CONTENT'));
  }
}
  
    // Build the enhanced SectionInfo object
    const enhancedSectionInfo: SectionInfo = {
      id: sectionInfo.id,
      name: sectionInfo.name,
      categories: sectionInfo.categories,
      colHdrs: newColHdrs,
      rowHdrs: newRowHdrs,
    };
  
    // Store the enhanced section info with an empty enrolled set and data.
    this.sections[sectionInfo.id] = {
      sectionInfo: enhancedSectionInfo,
      enrolled: new Set<T.StudentId>(),
      data: {},
    };
  
    return E.okResult(undefined);
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
    const section = this.sections[sectionId];
    if (!section) {
      return E.errResult(E.Err.err(`unknown sectionId "${sectionId}"`, 'NOT_FOUND'));
    }
    if (!this.students[studentId]) {
      return E.errResult(E.Err.err(`unknown studentId "${studentId}"`, 'NOT_FOUND'));
    }
    section.enrolled.add(studentId);
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
    const section = this.sections[sectionId];
    if (!section) {
      return E.errResult(E.Err.err(`unknown sectionId "${sectionId}"`, 'NOT_FOUND'));
    }
    if (!this.students[studentId]) {
      return E.errResult(E.Err.err(`unknown studentId "${studentId}"`, 'NOT_FOUND'));
    }
    if (!section.enrolled.has(studentId)) {
      return E.errResult(E.Err.err(`student "${studentId}" not enrolled in section "${sectionId}"`, 'BAD_CONTENT'));
    }
    const colHdr = section.sectionInfo.colHdrs[colId];
    if (!colHdr) {
      return E.errResult(E.Err.err(`unknown colId "${colId}"`, 'NOT_FOUND'));
    }
    if (colHdr._tag !== 'numScore' && colHdr._tag !== 'textScore') {
      return E.errResult(E.Err.err(`colId "${colId}" inappropriate for score`, 'BAD_CONTENT'));
    }
    if (score !== null) {
      if (colHdr._tag === 'numScore') {
        if (typeof score !== 'number') {
          return E.errResult(E.Err.err(`score for colId "${colId}" must be a number`, 'BAD_CONTENT'));
        }
        const numScore = score as number;
        if (numScore < colHdr.min || numScore > colHdr.max) {
          return E.errResult(E.Err.err(`score for colId "${colId}" out of range`, 'BAD_CONTENT'));
        }
      } else if (colHdr._tag === 'textScore') {
        if (typeof score !== 'string') {
          return E.errResult(E.Err.err(`score for colId "${colId}" must be a string`, 'BAD_CONTENT'));
        }
        if (!colHdr.vals.includes(score)) {
          return E.errResult(E.Err.err(`score for colId "${colId}" not an allowed value`, 'BAD_CONTENT'));
        }
      }
    }
    if (!section.data[studentId]) {
      section.data[studentId] = {} as T.RowData;
    }
    section.data[studentId][colId] = score;
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
    const section = this.sections[sectionId];
    if (!section) {
      return E.errResult(E.Err.err(`unknown sectionId "${sectionId}"`, 'NOT_FOUND'));
    }
    const colHdr = section.sectionInfo.colHdrs[colId];
    if (!colHdr) {
      return E.errResult(E.Err.err(`unknown colId "${colId}"`, 'NOT_FOUND'));
    }
    if (T.isStudentId(rowId)) {
      if (!this.students[rowId]) {
        return E.errResult(E.Err.err(`unknown studentId "${rowId}"`, 'NOT_FOUND'));
      }
      if (!section.enrolled.has(rowId)) {
        return E.errResult(E.Err.err(`student "${rowId}" not enrolled in section "${sectionId}"`, 'BAD_CONTENT'));
      }
      const rowData = section.data[rowId] || {};
      if (!(colId in rowData)) {
        if (colHdr._tag === 'student') {
          // Return the value from the student record.
          return E.okResult(this.students[rowId][colHdr.key]);
        } else if (colHdr._tag === 'aggrCol') {
          const aggrColHdr = colHdr as AggrColHdr;
          const result = aggrColHdr.aggrFn(section.sectionInfo, section.data, rowId, aggrColHdr.args || []);
          return result.isOk ? E.okResult(result.val) : E.okResult(result.err);
        } else {
          return E.okResult(null);
        }
      }
      return E.okResult(rowData[colId]);
    } else {
      // Aggregate row.
      const rowHdr = section.sectionInfo.rowHdrs[rowId as T.AggrRowId];
      if (!rowHdr) {
        return E.errResult(E.Err.err(`unknown rowId "${rowId}"`, 'NOT_FOUND'));
      }
      const rowData = section.data[rowId] || {};
      if (!(colId in rowData)) {
        if (colHdr._tag === 'student' && colHdr.id === 'id') {
          // For aggregate rows, return the row id for the 'id' column.
          return E.okResult(rowId);
        } else {
          // Compute using the row aggregate function.
          const result = rowHdr.aggrFn(section.sectionInfo, section.data, colId, rowHdr.args || []);
          return result.isOk ? E.okResult(result.val) : E.okResult(result.err);
        }
      }
      return E.okResult(rowData[colId]);
    }
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
    const section = this.sections[sectionId];
  if (!section) {
    return E.errResult(E.Err.err(`unknown sectionId "${sectionId}"`, 'NOT_FOUND'));
  }
  const sectionInfo = section.sectionInfo;

  // Determine final row IDs: if none provided, use enrolled student rows and aggregate rows.
  const enrolledStudentIds = Array.from(section.enrolled);
  const aggregateRowIds = Object.keys(sectionInfo.rowHdrs) as T.AggrRowId[];
  const defaultRowIds = [...enrolledStudentIds, ...aggregateRowIds];
  const finalRowIds: T.RowId[] = rowIds.length > 0 ? rowIds : defaultRowIds;

  // Determine final column IDs: if none provided, use all column IDs from sectionInfo.
  const allColIds = Object.keys(sectionInfo.colHdrs) as T.ColId[];
  const finalColIds: T.ColId[] = colIds.length > 0 ? colIds : allColIds;

  // --- Recompute aggregates for student rows ---
  for (const studentId of enrolledStudentIds) {
    if (!section.data[studentId]) {
      section.data[studentId] = {} as T.RowData;
    }
    for (const key in sectionInfo.colHdrs) {
      const colId = key as T.ColId;
      const colHdr = sectionInfo.colHdrs[colId];
      if (colHdr._tag === 'aggrCol') {
        const aggrColHdr = colHdr as AggrColHdr;
        const result = aggrColHdr.aggrFn(sectionInfo, section.data, studentId, aggrColHdr.args || []);
        section.data[studentId][colId] = result.isOk ? result.val : result.err;
      }
    }
  }

  // --- Recompute aggregates for aggregate rows ---
  for (const aggRowId of aggregateRowIds) {
    if (!section.data[aggRowId]) {
      section.data[aggRowId] = {} as T.RowData;
    }
    const rowHdr = sectionInfo.rowHdrs[aggRowId];
    for (const colId of allColIds) {
      const colHdr = sectionInfo.colHdrs[colId];
      if (colHdr._tag === 'student') {
        // For aggregate rows, if the header id is 'id', fill with the row id; otherwise default to "".
        section.data[aggRowId][colId] = (colHdr.id === 'id') ? aggRowId : "";
      } else {
        const result = rowHdr.aggrFn(sectionInfo, section.data, colId, rowHdr.args || []);
        section.data[aggRowId][colId] = result.isOk ? result.val : result.err;
      }
    }
  }

  // --- Build the final SectionData, filtering only the finalRowIds and finalColIds ---
  const filteredData: T.SectionData = {};
  for (const rowId of finalRowIds) {
    // Validate student rows.
    if (T.isStudentId(rowId)) {
      if (!this.students[rowId]) {
        return E.errResult(E.Err.err(`unknown studentId "${rowId}"`, 'NOT_FOUND'));
      }
      if (!section.enrolled.has(rowId)) {
        return E.errResult(E.Err.err(`student "${rowId}" not enrolled in section "${sectionId}"`, 'BAD_CONTENT'));
      }
    } else {
      if (!(rowId in section.data)) {
        return E.errResult(E.Err.err(`unknown rowId "${rowId}"`, 'NOT_FOUND'));
      }
    }
    const originalRow = section.data[rowId] || {} as T.RowData;
    const newRow: T.RowData = {} as T.RowData;
    for (const colId of finalColIds) {
      if (!(colId in sectionInfo.colHdrs)) {
        return E.errResult(E.Err.err(`unknown colId "${colId}"`, 'NOT_FOUND'));
      }
      const colHdr = sectionInfo.colHdrs[colId];
      if (colId in originalRow) {
        newRow[colId] = originalRow[colId];
      } else {
        // Fill default values for missing cells.
        if (colHdr._tag === 'student') {
          if (T.isStudentId(rowId)) {
            newRow[colId] = this.students[rowId][colHdr.key];
          } else {
            newRow[colId] = (colHdr.id === 'id') ? rowId : "";
          }
        } else {
          newRow[colId] = null;
        }
      }
    }
    filteredData[rowId] = newRow;
  }
  return E.okResult(filteredData);
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

// Enhanced SectionInfo type (local to this file)
type AggrColHdr = T.AggrColHdr & { aggrFn: T.RowAggrFn };
type ColHdr = Exclude<T.ColHdr, T.AggrColHdr> | AggrColHdr;

type AggrRowHdr = T.AggrRowHdr & { aggrFn: T.ColAggrFn };
type RowHdr = Exclude<T.RowHdr, T.AggrRowHdr> | AggrRowHdr;

type SectionInfo = Omit<T.SectionInfo, 'colHdrs' | 'rowHdrs'> & {
  colHdrs: Record<T.ColId, ColHdr>,
  rowHdrs: Record<T.AggrRowId, RowHdr>,
};



//TODO: add local types and definitions as needed.
