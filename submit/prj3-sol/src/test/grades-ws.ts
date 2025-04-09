import { App, serve } from '../lib/grades-ws.js';

import STATUS from 'http-status';

import supertest from 'supertest';

import { assert, expect } from 'chai';


import { MemDbServer, AggrFns, DbGrades, makeDbGrades, Errors as E, Types as T,
         RawData, FullData, StudentsData, Infos, InfoSpecs }
  from 'prj2-sol';

const BASE = '/api';

//suffix used to make some data bad
const X = 'xxx';

describe('grades web services', () => {
  
  let memDbServer : MemDbServer.MemDbServer;
  let dbGrades : DbGrades;
  let ws: ReturnType<typeof supertest>;
  const sectionIds = Object.keys(Infos) as T.SectionId[];

  beforeEach(async function () {
    memDbServer = await MemDbServer.startMemDbServer();
    const servicesResult =
      await makeDbGrades(memDbServer.uri,
			 AggrFns.rowAggrFns, AggrFns.colAggrFns);
    assert(servicesResult.isOk === true);
    dbGrades = servicesResult.val;
    const app: App = serve(dbGrades, { base: BASE}).app;
    ws = supertest(app);
  });
  
  afterEach(async function () {
    await dbGrades.close();
    await memDbServer.stop();
  });

  describe('add global student', () => {
    
    it('must successfully add a student', async () => {
      await addStudent(ws, StudentsData[0]);
    });

    it('BAD_REQUEST/MISSING on student with a missing field', async () => {
      const url = `${BASE}/students`;
      const student = StudentsData[0];
      for (const prop of [ 'id', 'firstName', 'lastName' ]) {
	const student1 = { ...student } as Record<string, string>;
	delete student1[prop];
	const res = await ws.put(url)
	  .set('Content-Type', 'application/json')
          .send(student1);
	expect(res.status).to.equal(STATUS.BAD_REQUEST);
	expect(res.body.errors?.[0]?.code).to.equal('MISSING');
      }
    });

    it('BAD_REQUEST/BAD_REQ on adding a student with a bad id', async () => {
      const url = `${BASE}/students`;
      const student = StudentsData[0];
      const student1 = { ...student };
      student1.id = '$id' as T.StudentId;
      const res =
	await ws.put(url)
	  .set('Content-Type', 'application/json')
          .send(student1);
      expect(res.status).to.equal(STATUS.BAD_REQUEST);
      expect(res.body.errors?.[0]?.code).to.equal('BAD_REQ');
    });

  });
  
  describe('retrieve global student', () => {

    it('must retrieve an added student', async () => {
      const student = StudentsData[0];
      const res = await addStudent(ws, student);
      const url = res.headers.location;
      const res1 = await ws.get(url);
      expect(res1.status).to.equal(STATUS.OK);
      expect(res1.body?.isOk).to.equal(true);
      expect(res1.body.result).to.deep.equal(student);
    });

    // ensure we can add/retrieve student having all fields string "null".
    it('must add/retrieve nully student', async () => {
      'TODO';
    });

    // ensure retrieving a student with an ID starting with $ fails
    it('BAD_REQUEST/BAD_REQ on retrieving student with bad ID', async () => {
      'TODO';
    });
    
    // ensure retrieving an unknown student is NOT_FOUND
    it('NOT_FOUND/NOT_FOUND to retrieve student with unknown ID', async () => {
      'TODO';
    });
    
  });

  describe('add section-info', () => {

    it('must successfully add a section-info', async () => {
      await addSection(ws, 'cs201' as T.SectionId);
    });

    it('BAD_REQUEST/MISSING add section-info with missing prop', async () => {
      const url = `${BASE}/sections/info`;
      for (const del of [ 'id', 'name', 'categories', 'colHdrs', 'rowHdrs' ]) {
	const sectionInfo =
	  structuredClone(InfoSpecs.cs201) as Record<string, any>;
	delete sectionInfo[del];
	const res =
	  await ws.put(url)
	    .set('Content-Type', 'application/json')
            .send(sectionInfo);
	expect(res.status).to.equal(STATUS.BAD_REQUEST);
	expect(res.body?.isOk).to.equal(false);
	expect(res.body.errors?.[0]?.code).to.equal('MISSING');
      }
    });

    it('BAD_REQUEST/BAD_CONTENT add section-info, bad aggrCol fn', async () => {
      const url = `${BASE}/sections/info`;
      const sectionInfo = structuredClone(InfoSpecs.cs201);
      const colHdrs = Object.values(sectionInfo.colHdrs);
      const hdrInfo = colHdrs.find(h => h._tag === 'aggrCol')! as T.AggrColHdr;
      hdrInfo.aggrFnName += X;
      const res =
	await ws.put(url)
	  .set('Content-Type', 'application/json')
          .send(sectionInfo);
      expect(res.status).to.equal(STATUS.BAD_REQUEST);
      expect(res.body?.isOk).to.equal(false);
      expect(res.body.errors?.[0]?.code).to.equal('BAD_CONTENT');
    });

    
    it('BAD_REQUEST/BAD_CONTENT add section-info, bad aggrRow fn', async () => {
      const url = `${BASE}/sections/info`;
      const sectionInfo = structuredClone(InfoSpecs.cs201);
      const rowHdrs = Object.values(sectionInfo.rowHdrs);
      const hdrInfo = rowHdrs.find(h => h._tag === 'aggrRow')! as T.AggrRowHdr;
      hdrInfo.aggrFnName += X;
      const res =
	await ws.put(url)
	  .set('Content-Type', 'application/json')
          .send(sectionInfo);
      expect(res.status).to.equal(STATUS.BAD_REQUEST);
      expect(res.body?.isOk).to.equal(false);
      expect(res.body.errors?.[0]?.code).to.equal('BAD_CONTENT');
    });

    
  });

  describe('retrieve section-info', () => {

    it('must successfully retrieve an added section-info', async () => {
      const sectionId = 'cs201' as T.SectionId;
      const res = await addSection(ws, sectionId);
      const url1 =  res.headers.location;
      expect(url1).to.equal(`${BASE}/sections/${sectionId}/info`);
      const res1 = await ws.get(url1);
      expect(res1.status).to.equal(STATUS.OK);
      expect(res1.body?.isOk).to.equal(true);
      expect(res1.body.result).to.deep.equal(Infos.cs201);
    });
    
    it('must error on retrieving unknown section-info', async () => {
      const url = `${BASE}/sections/cs201/info`;
      const res1 = await ws.get(url);
      expect(res1.status).to.equal(STATUS.NOT_FOUND);
      expect(res1.body?.isOk).to.equal(false);
      expect(res1.body.errors?.[0]?.code).to.deep.equal('NOT_FOUND');
    });

  });

  describe('enroll student in section', () => {

    let sectionId: T.SectionId;
    let studentId: T.StudentId;

    beforeEach(async () => {
      sectionId = 'cs201' as T.SectionId;
      await addSection(ws, sectionId);
      const student = StudentsData[0];
      studentId = student.id;
      await addStudent(ws, student);
    });

    
    it('must successfully enroll student in section', async () => {
      const url = `${BASE}/sections/${sectionId}/students`;
      const res =
	await ws.put(url)
	  .set('Content-Type', 'application/json')
          .send(`"${studentId}"`);
      expect(res.status).to.equal(STATUS.OK);
      expect(res.body?.isOk).to.equal(true);
    });

    it('NOT_FOUND/NOT_FOUND enrolling student in unknown section', async () => {
      const url = `${BASE}/sections/${sectionId + X}/students`;
      const res =
	await ws.put(url)
	  .set('Content-Type', 'application/json')
          .send(`"${studentId}"`);
      expect(res.status).to.equal(STATUS.NOT_FOUND);
      expect(res.body?.isOk).to.equal(false);
      expect(res.body.errors?.[0]?.code).to.equal('NOT_FOUND');
    });
    

    it('NOT_FOUND/NOT_FOUND enrolling unknown student in section', async () => {
      const url3 = `${BASE}/sections/${sectionId}/students`;
      const res3 =
	await ws.put(url3)
	  .set('Content-Type', 'application/json')
          .send(`"${studentId + X}"`);
      expect(res3.status).to.equal(STATUS.NOT_FOUND);
      expect(res3.body?.isOk).to.equal(false);
      expect(res3.body.errors?.[0]?.code).to.equal('NOT_FOUND');
    });
    
    it('BAD_REQUEST/BAD_REQUEST enrolling student with empty id', async () => {
      const url = `${BASE}/sections/${sectionId}/students`;
      const res = await ws.put(url)
	.set('Content-Type', 'application/json')
        .send('""');
      expect(res.status).to.equal(STATUS.BAD_REQUEST);
      expect(res.body?.isOk).to.equal(false);
      expect(res.body.errors?.[0]?.code).to.equal('BAD_REQ');
    });

  });

  describe('add/retrieve score', () => {

    let sectionId: T.SectionId;
    let studentId: T.StudentId;
    let studentId1: T.StudentId;

    beforeEach(async () => {
      sectionId = 'cs201' as T.SectionId;
      await addSection(ws, sectionId);
      const student = StudentsData[0];
      studentId = student.id;
      await addStudent(ws, student);
      await enrollStudent(ws, sectionId, studentId);      
      const student1 = StudentsData[1];
      studentId1 = student1.id;
      await addStudent(ws, student1);
      await enrollStudent(ws, sectionId, studentId1);
    });

    describe('add score', () => {
      
      it('must add valid score', async () => {
	const url = `${BASE}/sections/${sectionId}/data/${studentId}/prj1`;
	const score = 88;
	const res = await ws.patch(url)
	  .set('Content-Type', 'application/json')
          .send(String(score));
	expect(res.status).to.equal(STATUS.OK);
	expect(res.body?.isOk).to.equal(true);
      });
      
      it('NOT_FOUND/NOT_FOUND add score for unknown section', async () => {
	const url = `${BASE}/sections/${sectionId + X}/data/${studentId}/prj1`;
	const score = 88;
	const res = await ws.patch(url)
	  .set('Content-Type', 'application/json')
          .send(String(score));
	expect(res.status).to.equal(STATUS.NOT_FOUND);
	expect(res.body?.isOk).to.equal(false);
	expect(res.body.errors?.[0]?.code).to.equal('NOT_FOUND');
      });
      
      it('NOT_FOUND/NOT_FOUND add score for unknown student', async () => {
	const url = `${BASE}/sections/${sectionId}/data/${studentId + X}/prj1`;
	const score = 88;
	const res = await ws.patch(url)
	  .set('Content-Type', 'application/json')
          .send(String(score));
	expect(res.status).to.equal(STATUS.NOT_FOUND);
	expect(res.body?.isOk).to.equal(false);
	expect(res.body.errors?.[0]?.code).to.equal('NOT_FOUND');
      });
      
      it('NOT_FOUND/NOT_FOUND add score for unknown assignment', async () => {
	const url = `${BASE}/sections/${sectionId}/data/${studentId}/assign1`;
	const score = 88;
	const res = await ws.patch(url)
	  .set('Content-Type', 'application/json')
          .send(String(score));
	expect(res.status).to.equal(STATUS.NOT_FOUND);
	expect(res.body?.isOk).to.equal(false);
	expect(res.body.errors?.[0]?.code).to.equal('NOT_FOUND');
      });
      
      it('BAD_REQUEST/BAD_CONTENT add out-of-range score', async () => {
	const url = `${BASE}/sections/${sectionId}/data/${studentId}/prj1`;
	const score = 101;
	const res = await ws.patch(url)
	  .set('Content-Type', 'application/json')
          .send(String(score));
	expect(res.status).to.equal(STATUS.BAD_REQUEST);
	expect(res.body?.isOk).to.equal(false);
	expect(res.body.errors?.[0]?.code).to.equal('BAD_CONTENT');
      });
      
      it('BAD_REQUEST/BAD_CONTENT add wrong type score', async () => {
	const url = `${BASE}/sections/${sectionId}/data/${studentId}/prj1`;
	const score = 88;
	const res = await ws.patch(url)
	  .set('Content-Type', 'application/json')
          .send(`"${score}"`);
	expect(res.status).to.equal(STATUS.BAD_REQUEST);
	expect(res.body?.isOk).to.equal(false);
	expect(res.body.errors?.[0]?.code).to.equal('BAD_CONTENT');
      });
      
    });

    describe('get score', () => {
      
      it('must retrieve added score', async () => {
	const url = `${BASE}/sections/${sectionId}/data/${studentId}/prj1`;
	const score = 88;
	const res1 = await ws.patch(url)
	  .set('Content-Type', 'application/json')
          .send(String(score));
	expect(res1.status).to.equal(STATUS.OK);
	expect(res1.body?.isOk).to.equal(true);
	const res2 = await ws.get(url);
	expect(res2.status).to.equal(STATUS.OK);
	expect(res2.body?.isOk).to.equal(true);
	expect(res2.body.result).to.equal(score);
      });
      
      it('must retrieve null for student without score', async () => {
	const url = `${BASE}/sections/${sectionId}/data/${studentId}/prj1`;
	const score: T.Score = 88;
	const res1 = await ws.patch(url)
	  .set('Content-Type', 'application/json')
          .send(String(score));
	expect(res1.status).to.equal(STATUS.OK);
	expect(res1.body?.isOk).to.equal(true);
	const url2 = `${BASE}/sections/${sectionId}/data/${studentId1}/prj1`;
	const res2 = await ws.get(url2);
	expect(res2.status).to.equal(STATUS.OK);
	expect(res2.body?.isOk).to.equal(true);
	expect(res2.body.result).to.equal(null);
      });

    });

  describe('get Entry for all kinds of data', () => {

    beforeEach(async () => {
      for (const student of StudentsData) {
	await dbGrades.addStudent(student);
      }
      for (const info of Object.values(Infos)) {
	const data = RawData[info.id];
	const loadResult = await dbGrades.loadSection(info, data);
	assert(loadResult.isOk);
      }
    });

    it('must obtain all entries for aggregate columns', async () => {
      for (const sectionId of sectionIds) {
	const info = Infos[sectionId];
	const aggrColIds = Object.values(info.colHdrs)
	  .filter(h => h._tag === 'aggrCol')
	  .map(h => h.id);
	const data0 = FullData[sectionId];
	for (const row0 of Object.values(data0)) {
	  const rowId = row0['id' as T.ColId] as T.RowId;
	  if (!T.isStudentId(rowId)) continue;
	  for (const colId of aggrColIds) {
	    const url = `${BASE}/sections/${sectionId}/data/${rowId}/${colId}`;
	    const res = await ws.get(url);
	    expect(res.status).to.equal(STATUS.OK);
	    expect(res.body?.isOk).to.equal(true);
	    const val1 = res.body.result;
	    const val0 = row0[colId];
	    const msg = `[${sectionId}][${rowId}][${colId}]:`;
	    expect(val1).to.equal(val0, msg);
	  }
	}
      }
    });

    it('must obtain all entries for aggregate rows', async () => {
      for (const sectionId of sectionIds) {
	const info = Infos[sectionId];
	const aggrRowIds = Object.values(info.rowHdrs)
	  .filter(h => h._tag === 'aggrRow')
	  .map(h => h.id);
	const colIds = Object.values(info.colHdrs)
	  .map(h => h.id);
	const data0 = FullData[sectionId];
	for (const rowId of aggrRowIds) {
	  const row0 = data0[rowId];
	  for (const colId of colIds) {
	    const url = `${BASE}/sections/${sectionId}/data/${rowId}/${colId}`;
	    const res = await ws.get(url);
	    expect(res.status).to.equal(STATUS.OK);
	    expect(res.body?.isOk).to.equal(true);
	    const val1 = res.body.result;
	    const val0 = row0[colId];
	    const msg = `[${sectionId}][${rowId}][${colId}]:`;
	    expect(val1).to.equal(val0, msg);
	  }
	}
      }
    });

    it('must obtain all raw and aggregate entries', async () => {
      for (const sectionId of sectionIds) {
	const info = Infos[sectionId];
	const data0 = FullData[sectionId];
	for (const row0 of Object.values(data0)) {
	  const rowId = row0['id' as T.ColId] as T.RowId;
	  for (const k of Object.keys(row0)) {
	    const colId = k as T.ColId;
	    const url = `${BASE}/sections/${sectionId}/data/${rowId}/${colId}`;
	    const res = await ws.get(url);
	    expect(res.status).to.equal(STATUS.OK);
	    expect(res.body?.isOk).to.equal(true);
	    const val1 = res.body.result;
	    const val0 = row0[colId];
	    const msg = `[${sectionId}][${rowId}][${colId}]:`;
	    expect(val1).to.equal(val0, msg);
	  }
	}
      }
    });

  });

    describe('add multiple scores', () => {
      
      it('must add multiple scores', async () => {
	const scores = { prj1: 1, prj2: 2, prj3: 3, hw1: 10, hw2: 20 };
	const url = `${BASE}/sections/${sectionId}/data/${studentId}`;
	const res1 = await ws.patch(url)
	  .set('Content-Type', 'application/json')
          .send(scores);
	expect(res1.status).to.equal(STATUS.OK);
	expect(res1.body?.isOk).to.equal(true);
	for (const [assign, score] of Object.entries(scores)) {
	  const url2 =
	    `${BASE}/sections/${sectionId}/data/${studentId}/${assign}`;
	  const res2 = await ws.get(url2);
	  expect(res2.status).to.equal(STATUS.OK);
	  expect(res2.body?.isOk).to.equal(true);
	  expect(res2.body.result).to.equal(score);
	}
      });

      it('NOT_FOUND adding scores for invalid assignments', async () => {
	const scores = { prj4: 1,};
	const url = `${BASE}/sections/${sectionId}/data/${studentId}`;
	const res1 = await ws.patch(url)
	  .set('Content-Type', 'application/json')
          .send(scores);
	expect(res1.status).to.equal(STATUS.NOT_FOUND);
	expect(res1.body?.isOk).to.equal(false);
	expect(res1.body.errors?.[0]?.code).to.equal('NOT_FOUND');
      });

    });  

  });
    
  describe('get section data', () => {

    beforeEach(async () => {
      for (const student of StudentsData) {
	await dbGrades.addStudent(student);
      }
      for (const info of Object.values(Infos)) {
	const data = RawData[info.id];
	const loadResult = await dbGrades.loadSection(info, data);
	assert(loadResult.isOk);
      }
    });

    describe('get all section data', () => {
      
      it('must retrieve all data and aggregates', async () => {
	for (const sectionId of sectionIds) {
	  const url = `${BASE}/sections/${sectionId}/data`;
	  const data0 = FullData[sectionId];
	  const res = await ws.get(url).
	    query({kind: 'all'});
	  expect(res.status).to.equal(STATUS.OK);
	  expect(res.body?.isOk).to.equal(true);
	  const data1 = res.body.result;
	  for (const row0 of Object.values(data0)) {
	    const rowId = row0['id' as T.ColId] as T.RowId;
	    const row1 = data1[rowId];
	    const colIds = Object.keys(row0) as T.ColId[];
	    for (const colId of colIds) {
	      const val0 = row0[colId];
	      const val1 = row1[colId];
	      const msg = `[${sectionId}][${rowId}][${colId}]: ` +
		`expected "${val0}"; got "${val1}"`;
	      expect(val1).to.equal(val0, msg);
	    }
	  }
	}
      });

    });

    describe('get selected section data', () => {
      
      it('must retrieve only aggregate rows', async () => {
	for (const sectionId of sectionIds) {
	  const info = Infos[sectionId];
	  const rowIds = Object.values(info.rowHdrs)
	    .filter(h => h._tag === 'aggrRow')
	    .map(h => h.id);
	  const data0 = FullData[sectionId];
	  const url = `${BASE}/sections/${sectionId}/data`;
	  const res = await ws.get(url).
	    query({kind: 'select', rowId: rowIds });
	  expect(res.status).to.equal(STATUS.OK);
	  expect(res.body?.isOk).to.equal(true);
	  const data1 = res.body.result;
	  expect(Object.keys(data1)).to.have.length(rowIds.length);
	  for (const row0 of Object.values(data0)) {
	    const rowId = row0['id' as T.ColId] as T.RowId;
	    if (!rowIds.includes(rowId)) continue;
	    const row1 = data1[rowId];
	    const colIds = Object.keys(row0) as T.ColId[];
	    for (const colId of colIds) {
	      const val0 = row0[colId];
	      const val1 = row1[colId];
	      const msg = `[${sectionId}][${rowId}][${colId}]: ` +
		`expected "${val0}"; got "${val1}"`;
	      expect(val1).to.equal(val0, msg);
	    }
	  }
	}
      });

      it('must retrieve only selected rows', async () => {
	const nRows = 3;
	for (const sectionId of sectionIds) {
	  const data0 = FullData[sectionId];
	  const selRowIds = (Object.keys(data0) as T.RowId[]).slice(0, nRows);
	  const url = `${BASE}/sections/${sectionId}/data`;
	  const res = await ws.get(url).
	    query({kind: 'select', rowId: selRowIds });
	  expect(res.status).to.equal(STATUS.OK);
	  expect(res.body?.isOk).to.equal(true);
	  const data1 = res.body.result;
	  expect(Object.keys(data1)).to.have.length(selRowIds.length);
	  for (const row0 of Object.values(data0)) {
	    const rowId = row0['id' as T.ColId] as T.RowId;
	    if (!selRowIds.includes(rowId)) continue;
	    const row1 = data1[rowId];
	    const colIds = Object.keys(row0) as T.ColId[];
	    for (const colId of colIds) {
	      const val0 = row0[colId];
	      const val1 = row1[colId];
	      const msg = `[${sectionId}][${rowId}][${colId}]: ` +
		`expected "${val0}"; got "${val1}"`;
	      expect(val1).to.equal(val0, msg);
	    }
	  }
	}
      });

      it('must fail to get selected rows for unknown rowId', async () => {
	const nRows = 3;
	for (const sectionId of sectionIds) {
	  const data0 = FullData[sectionId];
	  const selRowIds = (Object.keys(data0) as T.RowId[]).slice(0, nRows);
	  selRowIds[0] = (selRowIds[0] + X) as T.RowId;
	  const url = `${BASE}/sections/${sectionId}/data`;
	  const res = await ws.get(url).
	    query({kind: 'select', rowId: selRowIds });
	  expect(res.status).to.equal(STATUS.NOT_FOUND);
	  expect(res.body?.isOk).to.equal(false);
	  expect(res.body.errors.at(0).code).to.equal('NOT_FOUND');
	}
      });
      
      
      it('must error on selected rows for known but unenrolled student',
	 async () => {
	   const student: T.Student = {
	     id: T.toStudentId('zz'), firstName: 'z', lastName: 'z'
	   };
	   await dbGrades.addStudent(student);
	   const nRows = 3;
	   for (const sectionId of sectionIds) {
	     const data0 = FullData[sectionId];
	     const selRowIds = (Object.keys(data0) as T.RowId[]).slice(0, nRows);
	     selRowIds[0] = student.id;
	     const url = `${BASE}/sections/${sectionId}/data`;
	     const res = await ws.get(url).
	       query({kind: 'select', rowId: selRowIds });
	     expect(res.status).to.equal(STATUS.BAD_REQUEST);
	     expect(res.body?.isOk).to.equal(false);
	     expect(res.body.errors.at(0).code).to.equal('BAD_CONTENT');
	   }
	 });

      it('must retrieve only selected columns', async () => {
	const nCols = 6;
	for (const sectionId of sectionIds) {
	  const info = Infos[sectionId];
	  const selColIds = Object.values(info.colHdrs)
	    .map(h => h.id)
	    .slice(0, nCols);
	  const data0 = FullData[sectionId];
	  const url = `${BASE}/sections/${sectionId}/data`;
	  const res = await ws.get(url).
	    query({kind: 'select', colId: selColIds });
	  expect(res.status).to.equal(STATUS.OK);
	  expect(res.body?.isOk).to.equal(true);
	  const data1 = res.body.result;
	  Object.values(data1).forEach(row =>
	    expect(Object.keys(row)).to.have.length(selColIds.length));
	  for (const row0 of Object.values(data0)) {
	    const rowId = row0['id' as T.ColId] as T.RowId;
	    const row1 = data1[rowId];
	    const colIds = Object.keys(row0) as T.ColId[];
	    for (const colId of colIds) {
	      if (!selColIds.includes(colId)) continue;
	      const val0 = row0[colId];
	      const val1 = row1[colId];
	      const msg = `[${sectionId}][${rowId}][${colId}]: ` +
		`expected "${val0}"; got "${val1}"`;
	      expect(val1).to.equal(val0, msg);
	    }
	  }
	}
      });
      
      it('must fail to get selected cols for unknown colId', async () => {
	const nCols = 6;
	for (const sectionId of sectionIds) {
	  const info = Infos[sectionId];
	  const selColIds = Object.values(info.colHdrs)
	    .map(h => h.id)
	    .slice(0, nCols);
	  selColIds[selColIds.length - 1] = (selColIds.at(-1) + X) as T.ColId;
	  const url = `${BASE}/sections/${sectionId}/data`;
	  const res = await ws.get(url).
	    query({kind: 'select', colId: selColIds });
	  expect(res.status).to.equal(STATUS.NOT_FOUND);
	  expect(res.body?.isOk).to.equal(false);
	  expect(res.body.errors.at(0).code).to.equal('NOT_FOUND');
	}
      });

      it('must retrieve only selected rows and columns', async () => {
	const nRows = 3, nCols = 6;
	for (const sectionId of sectionIds) {
	  const info = Infos[sectionId];
	  const selColIds = Object.values(info.colHdrs)
	    .map(h => h.id)
	    .slice(0, nCols);
	  const data0 = FullData[sectionId];
	  const selRowIds = (Object.keys(data0) as T.RowId[]).slice(0, nRows);
	  const url = `${BASE}/sections/${sectionId}/data`;
	  const res = await ws.get(url).
	    query({kind: 'select', colId: selColIds, rowId: selRowIds });
	  expect(res.status).to.equal(STATUS.OK);
	  expect(res.body?.isOk).to.equal(true);
	  const data1 = res.body.result;
	  expect(Object.keys(data1)).to.have.length(selRowIds.length);
	  Object.values(data1).forEach(row =>
	    expect(Object.keys(row)).to.have.length(selColIds.length));
	  for (const row0 of Object.values(data0)) {
	    const rowId = row0['id' as T.ColId] as T.RowId;
	    if (!selRowIds.includes(rowId)) continue;
	    const row1 = data1[rowId];
	    const colIds = Object.keys(row0) as T.ColId[];
	    for (const colId of colIds) {
	      if (!selColIds.includes(colId)) continue;
	      const val0 = row0[colId];
	      const val1 = row1[colId];
	      const msg = `[${sectionId}][${rowId}][${colId}]: ` +
		`expected "${val0}"; got "${val1}"`;
	      expect(val1).to.equal(val0, msg);
	    }
	  }
	}
      });

    });

    describe('get raw section data', () => {

      it('must retrieve all raw data', async () => {
	for (const sectionId of sectionIds) {
	  const data0 = RawData[sectionId];
	  const url = `${BASE}/sections/${sectionId}/data`;
	  const res = await ws.get(url).
	    query({kind: 'raw'});
	  expect(res.status).to.equal(STATUS.OK);
	  expect(res.body?.isOk).to.equal(true);
	  const data1 = res.body.result;
	  for (const [id, row0] of Object.entries(data0)) {
	    const rowId = id as T.RowId;
	    const row1 = data1[rowId];
	    const colIds = Object.keys(row0) as T.ColId[];
	    for (const colId of colIds) {
	      const val0 = row0[colId];
	      const val1 = row1[colId];
	      const msg = `[${sectionId}][${rowId}][${colId}]: ` +
		`expected "${val0}"; got "${val1}"`;
	      expect(val1).to.equal(val0, msg);
	    }
	  }
	}
      });

      it('must error on bad section-id for raw data', async () => {
	for (const sectionId of sectionIds) {
	  const url = `${BASE}/sections/${sectionId + X}/data`;
	  const res = await ws.get(url).
	    query({kind: 'raw'});
	  expect(res.status).to.equal(STATUS.NOT_FOUND);
	  expect(res.body?.isOk).to.equal(false);
	  expect(res.body.errors?.[0]?.code).to.equal('NOT_FOUND');
	}
      });

    });

    describe('get single student data', () => {

      const N_STUDENTS = 3;

      it('must retrieve single student data', async () => {
	for (const sectionId of sectionIds) {
	  const data0 = FullData[sectionId];
	  for (const sId of Object.keys(RawData[sectionId])
	    .slice(0, N_STUDENTS)) {
	    const studentId = sId as T.StudentId;
	    const url = `${BASE}/sections/${sectionId}/data`;
	    const res = await ws.get(url).
	      query({kind: 'student', studentId });
	    expect(res.status).to.equal(STATUS.OK);
	    expect(res.body?.isOk).to.equal(true);
	    const data1 = res.body.result;
	    expect(Object.keys(data1)).to.have.length(1);
	    const row0 = data0[studentId];
	    const row1 = data1[studentId];
	    const colIds = Object.keys(row0) as T.ColId[];
	    for (const colId of colIds) {
	      const val0 = row0[colId];
	      const val1 = row1[colId];
	      const msg = `[${sectionId}][${studentId}][${colId}]: ` +
		`expected "${val0}"; got "${val1}"`;
	      expect(val1).to.equal(val0, msg);
	    }
	  }
	}
      });

      it('must error on bad section-id for student data', async () => {
	for (const sectionId of sectionIds) {
	  const url = `${BASE}/sections/${sectionId + X}/data`;
	  const res = await ws.get(url).
	    query({kind: 'student', studentId: X });
	  expect(res.status).to.equal(STATUS.NOT_FOUND);
	  expect(res.body?.isOk).to.equal(false);
	  expect(res.body.errors.at(0).code).to.equal('NOT_FOUND');
	}
      });
      
    });

    describe('get aggr rows', () => {

      it('must retrieve aggr rows', async () => {
	for (const sectionId of sectionIds) {
	  const data0 = FullData[sectionId];
	  const aggrRowIds = Object.values(Infos[sectionId].rowHdrs)
	    .filter(h => h._tag === 'aggrRow')
	    .map(h => h.id);
	  const url = `${BASE}/sections/${sectionId}/data`;
	  const res = await ws.get(url).
	    query({kind: 'aggrRows' });
	  expect(res.status).to.equal(STATUS.OK);
	  expect(res.body?.isOk).to.equal(true);
	  const data1 = res.body.result;
	  for (const id of aggrRowIds) {
	    const rowId = id as T.RowId;
	    const row0 = data0[rowId];
	    const row1 = data1[rowId];
	    const colIds = Object.keys(row0) as T.ColId[];
	    for (const colId of colIds) {
	      const val0 = row0[colId];
	      const val1 = row1[colId];
	      const msg = `[${sectionId}][${rowId}][${colId}]: ` +
		`expected "${val0}"; got "${val1}"`;
	      expect(val1).to.equal(val0, msg);
	    }
	  }
	}
      });

      it('must error on bad section-id for aggr rows', async () => {
	for (const sectionId of sectionIds) {
	  const url = `${BASE}/sections/${sectionId + X}/data`;
	  const res = await ws.get(url).
	    query({kind: 'aggrRows' });
	  expect(res.status).to.equal(STATUS.NOT_FOUND);
	  expect(res.body?.isOk).to.equal(false);
	  expect(res.body.errors.at(0).code).to.equal('NOT_FOUND');
	}
      });
      
    });

  });



});

async function addSection(ws: ReturnType<typeof supertest>,
			  sectionId: T.SectionId) {
  const url = `${BASE}/sections/info`;
  const sectionInfo = InfoSpecs[sectionId];
  const res =
    await ws.put(url)
      .set('Content-Type', 'application/json')
      .send(sectionInfo);
  expect(res.status).to.equal(STATUS.OK);
  expect(res.body?.isOk).to.equal(true);
  const links = res.body?.links;
  expect(links?.self?.method).to.equal('PUT');
  expect(links?.self?.href).to.equal(url);
  expect(res.headers.location).to
    .equal(`${BASE}/sections/${sectionInfo.id}/info`);
  return res;
}  
  
async function addStudent(ws: ReturnType<typeof supertest>,
			  student: T.Student) {
  const url = `${BASE}/students`;
  const res =
    await ws.put(url)
      .set('Content-Type', 'application/json')
      .send(student);
  expect(res.status).to.equal(STATUS.CREATED);
  expect(res.body?.isOk).to.equal(true);
  const links = res.body?.links;
  expect(links?.self?.method).to.equal('PUT');
  expect(links?.self?.href).to.equal(url);
  expect(res.headers.location).to.equal(`${url}/${student.id}`);
  return res;
}

async function enrollStudent(ws: ReturnType<typeof supertest>,
			     sectionId: T.SectionId, studentId: T.StudentId) {
  const url = `${BASE}/sections/${sectionId}/students`;
  const res =
    await ws.put(url)
      .set('Content-Type', 'application/json')
      .send(`"${studentId}"`);
  expect(res.status).to.equal(STATUS.OK);
  expect(res.body?.isOk).to.equal(true);
  return res;
}

