import * as mongo from 'mongodb';

import { Grades, Types as T, Errors as E } from 'prj1-sol';

// Define ScoreDoc type for score storage
type ScoreDoc = {
  _id: {
    sectionId: string;
    studentId: string;
  };
  scores: { [assignId: string]: number };
};

//TODO: add stuff

export class GradesDao {
  
  //called by below static make() factory function with
  //parameters to be cached in this instance.
  constructor(
    private conn: mongo.MongoClient,
    private studentsCol: mongo.Collection<T.Student>,
    private sectionsCol: mongo.Collection<T.SectionInfo>,
    private scoresCol: mongo.Collection<ScoreDoc>
  ) {
    //TODO
  }

  //static factory function; should do all async operations like
  //getting a connection and creating indexing.  Finally, it
  //should use the constructor to return an instance of this class.
  //returns error code DB on database errors.
  static async make(dbUrl: string /* TODO: params as needed */)
    : Promise<E.Result<GradesDao, E.Err>> 
  {
    try {
      const conn = await mongo.MongoClient.connect(dbUrl);
      const db = conn.db(); 
      const studentsCol = db.collection<T.Student>('students');
      const sectionsCol = db.collection<T.SectionInfo>('sections');
      const scoresCol = db.collection<ScoreDoc>('scores');

      // Add indexes here if desired (optional)

      return E.okResult(new GradesDao(conn, studentsCol, sectionsCol, scoresCol));
    } catch (err) {
      return E.errResult(E.Err.err('DB', (err as Error).message));
    }
  }

  //close database connection
  async close(): Promise<void> {
    await this.conn.close();
  }

  // clear all data in collections
  async clear(): Promise<E.Result<void, E.Err>> {
    try {
      await this.studentsCol.deleteMany({});
      await this.sectionsCol.deleteMany({});
      await this.scoresCol.deleteMany({});
      return E.okResult(undefined);
    } catch (err) {
      return E.errResult(E.Err.err('DB', (err as Error).message));
    }
  }

  // add a student to the database
  async addStudent(student: T.Student): Promise<E.Result<void, E.Err>> {
    try {
      await this.studentsCol.updateOne(
        { _id: student.id },
        { $set: { firstName: student.firstName, lastName: student.lastName } },
        { upsert: true }
      );
      return E.okResult(undefined);
    } catch (err) {
      return E.errResult(E.Err.err('DB', (err as Error).message));
    }
  }
  

  // retrieve all students from the database
  async getAllStudents(): Promise<E.Result<T.Student[], E.Err>> {
    try {
      const docs = await this.studentsCol.find({}).toArray();
      const students: T.Student[] = docs.map(doc => ({
        id: T.toStudentId(doc._id.toString()),  
        firstName: doc.firstName,
        lastName: doc.lastName
      }));
      return E.okResult(students);
    } catch (err) {
      return E.errResult(E.Err.err('DB', (err as Error).message));
    }
  }  
  // TODO: add other DAO methods

  async addSectionInfo(sectionInfo: T.SectionInfo): Promise<E.Result<void, E.Err>> {
    try {
      const { id, ...rest } = sectionInfo;
      await this.sectionsCol.updateOne(
        { _id: id },
        { $set: { ...rest } },
        { upsert: true }
      );
      return E.okResult(undefined);
    } catch (err) {
      return E.errResult(E.Err.err('DB', (err as Error).message));
    }
  }
  

  async enrollStudent(sectionId: T.SectionId, studentId: T.StudentId): Promise<E.Result<void, E.Err>> {
    try {
      await this.scoresCol.updateOne(
        { _id: { sectionId: sectionId, studentId: studentId } },
        { $setOnInsert: { scores: {} } },
        { upsert: true }
      );
      return E.okResult(undefined);
    } catch (err) {
      return E.errResult(E.Err.err('DB', (err as Error).message));
    }
  }

  async addScore(sectionId: T.SectionId, studentId: T.StudentId, colId: T.ColId, score: T.Score)
  : Promise<E.Result<void, E.Err>> 
  {
    try {
      await this.scoresCol.updateOne(
        { _id: { sectionId, studentId } },
        { $set: { [`scores.${colId}`]: score } },
        { upsert: true }
      );
      return E.okResult(undefined);
    } catch (err) {
      return E.errResult(E.Err.err('DB', (err as Error).message));
    }
  }

  async rmSection(sectionId: T.SectionId): Promise<E.Result<void, E.Err>> {
    try {
      // Remove section info
      await this.sectionsCol.deleteOne({ _id: sectionId });
      // Remove all scores associated with that section
      await this.scoresCol.deleteMany({ "_id.sectionId": sectionId });
      return E.okResult(undefined);
    } catch (err) {
      return E.errResult(E.Err.err('DB', (err as Error).message));
    }
  }

  async getAllSectionInfos(): Promise<E.Result<T.SectionInfo[], E.Err>> {
    try {
      const docs = await this.sectionsCol.find({}).toArray();
      const sectionInfos: T.SectionInfo[] = docs.map(doc => {
        const { _id, ...rest } = doc;
        return { ...rest, id: _id.toString() } as T.SectionInfo;
      });
      return E.okResult(sectionInfos);
    } catch (err) {
      return E.errResult(E.Err.err('DB', (err as Error).message));
    }
  }
} //GradesDao

// TODO: add private functions, types, data as needed
