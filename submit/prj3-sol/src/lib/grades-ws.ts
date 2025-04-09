import cors from "cors";
import Express, { Request, Response, NextFunction } from "express";
import STATUS from "http-status";
import { z } from "zod";
import { Types as T } from 'prj1-sol';


import { DbGrades, ZodSchemas as Z, validate } from "prj2-sol";
import { selfHref, selfResult, mapResultErrors } from "./ws-utils.js";

export type App = Express.Application;

type SERVER_OPTIONS = {
  base?: string;
};

export function serve(model: DbGrades, options: SERVER_OPTIONS = {}): { app: App; close: () => void } {
  const app = Express();
  app.locals.model = model;

  const { base = "" } = options;
  app.locals.base = base;
  setupRoutes(app);
  return { app, close: model.close };
}

function setupRoutes(app: Express.Application) {
  app.use(cors(CORS_OPTIONS));
  app.use(Express.json({ strict: false }));

  app.put(`${app.locals.base}/students`, doAddGlobalStudent(app));
  app.get(`${app.locals.base}/students/:id`, doGetGlobalStudent(app));

  app.put(`${app.locals.base}/sections/info`, doAddSectionInfo(app));
  app.get(`${app.locals.base}/sections/:id/info`, doGetSectionInfo(app));

  app.put(`${app.locals.base}/sections/:id/students`, doEnrollStudent(app));

  app.patch(`${app.locals.base}/sections/:sectionId/data/:studentId/:assignId`, doAddScore(app));
  app.patch(`${app.locals.base}/sections/:sectionId/data/:studentId`, doGetScores(app));

  app.get(`${app.locals.base}/sections/:sectionId/data/:rowId/:colId`, doGetDataEntry(app));
  app.get(`${app.locals.base}/sections/:id/data`, doGetSectionData(app));


  app.use(do404(app));
  app.use(doErrors(app));
}

function doAddGlobalStudent(app: Express.Application) {
  return async (req: Request, res: Response) => {
    try {
      const result = validate(Z.Student, req.body);
      if (!result.isOk) throw result;
      const student = result.val as z.infer<typeof Z.Student>;

      const add_result = await app.locals.model.addStudent(student);
      if (!add_result.isOk) throw add_result;

      res.location(`${app.locals.base}/students/${student.id}`);
      res.status(STATUS.CREATED).json(selfResult(req, undefined, STATUS.CREATED));
    } catch (err) {
      const mapped = mapResultErrors(err);
      res.status(mapped.status).json(mapped);
    }
  };
}

function doGetGlobalStudent(app: Express.Application) {
  return async (req: Request, res: Response) => {
    try {
      const result = validate(Z.StudentId, req.params.id);
      if (!result.isOk) throw result;

      const get_result = await app.locals.model.getStudent(result.val);
      if (!get_result.isOk) throw get_result;

      res.status(STATUS.OK).json(selfResult(req, get_result.val, STATUS.OK));
    } catch (err) {
      const mapped = mapResultErrors(err);
      res.status(mapped.status).json(mapped);
    }
  };
}

function doAddSectionInfo(app: Express.Application) {
  return async (req: Request, res: Response) => {
    try {
      const result = validate(Z.SectionInfoSpec, req.body);
      if (!result.isOk) throw result;

      const section = JSON.parse(JSON.stringify(result.val)) as z.infer<typeof Z.SectionInfoSpec>;

      section.categories = section.categories.map(cat =>
        cat.entryType === "numScore"
          ? {
              ...cat,
              min: cat.min ?? 0,
              max: cat.max ?? 100,
            }
          : cat
      );

      section.colHdrs = section.colHdrs.map(col => {
        const base = {
          ...col,
          entryType:
            col._tag === "student"
              ? "text"
              : col._tag === "numScore"
              ? "numScore"
              : col.entryType || "num",
        };

        if (col._tag === "numScore") {
          return {
            ...base,
            min: "min" in col ? col.min : 0,
            max: "max" in col ? col.max : 100,
          };
        }

        return base;
      });

      section.rowHdrs = section.rowHdrs.map(row => ({ ...row, args: row.args ?? [] }));

      const add_result = await app.locals.model.addSectionInfo(section);
      if (!add_result.isOk) throw add_result;

      res.location(`${app.locals.base}/sections/${section.id}/info`);
      res.status(STATUS.OK).json(selfResult(req, undefined, STATUS.OK));
    } catch (err) {
      const mapped = mapResultErrors(err);
      res.status(mapped.status).json(mapped);
    }
  };
}

function doGetSectionInfo(app: Express.Application) {
  return async (req: Request, res: Response) => {
    try {
      const id_result = validate(Z.SectionId, req.params.id);
      if (!id_result.isOk) throw id_result;

      const result = await app.locals.model.getSectionInfo(id_result.val);
      if (!result.isOk) throw result;

      const info = result.val;

      const response = {
        ...info,
        categories: Object.fromEntries(info.categories.map((c: any) => [c.id, c])),
        colHdrs: Object.fromEntries(info.colHdrs.map((col: any) => {
          const copy: any = { ...col };
          if (!copy.entryType) {
            copy.entryType =
              copy._tag === "student" ? "text" :
              copy._tag === "numScore" ? "numScore" :
              "num";
          }
          if (!("min" in col)) delete copy.min;
          if (!("max" in col)) delete copy.max;
          return [copy.id, copy];
        })),
        rowHdrs: Object.fromEntries(info.rowHdrs.map((row: any) => [row.id, { ...row, args: row.args ?? [] }])),
      };

      res.status(STATUS.OK).json(selfResult(req, response, STATUS.OK));
    } catch (err) {
      const mapped = mapResultErrors(err);
      res.status(mapped.status).json(mapped);
    }
  };
}

function doEnrollStudent(app: Express.Application) {
  return async (req: Request, res: Response) => {
    try {
      const section_result = validate(Z.SectionId, req.params.id);
      if (!section_result.isOk) throw section_result;
      const section_id = section_result.val;

      let student_rawid: any;
      if (typeof req.body === "string") {
        student_rawid = req.body;
      } else if (typeof req.body === "object" && req.body !== null && "id" in req.body) {
        student_rawid = req.body.id;
      } else {
        student_rawid = req.body;
      }

      const student_result = validate(Z.StudentId, student_rawid);
      if (!student_result.isOk) throw student_result;
      const studentId = student_result.val;

      const update_result = await app.locals.model.enrollStudent(section_id, studentId);
      if (!update_result.isOk) throw update_result;

      res.status(STATUS.OK).json(selfResult(req, undefined, STATUS.OK));
    } catch (err) {
      const mapped = mapResultErrors(err);
      res.status(mapped.status).json(mapped);
    }
  };
}

function doAddScore(app: Express.Application) {
  return async (req: Request, res: Response) => {
    try {
      const section_id = validate(Z.SectionId, req.params.sectionId);
      const student_id = validate(Z.StudentId, req.params.studentId);
      const assign_id = validate(Z.ColId, req.params.assignId);
      const score = validate(Z.Score, req.body);

      if (!section_id.isOk) throw section_id;
      if (!student_id.isOk) throw student_id;
      if (!assign_id.isOk) throw assign_id;
      if (!score.isOk) throw score;

      const result = await app.locals.model.addScore(
        section_id.val,
        student_id.val,
        assign_id.val,
        score.val
      );

      if (!result.isOk) throw result;

      res.status(STATUS.OK).json(selfResult(req, undefined, STATUS.OK));
    } catch (err) {
      const mapped = mapResultErrors(err);
      res.status(mapped.status).json(mapped);
    }
  };
}

function doGetScores(app: Express.Application) {
  return async (req: Request, res: Response) => {
    try {
      const section_id = validate(Z.SectionId, req.params.sectionId);
      const student_id = validate(Z.StudentId, req.params.studentId);

      if (!section_id.isOk) throw section_id;
      if (!student_id.isOk) throw student_id;

      const body = z.record(Z.ColId, Z.Score);
      const score_map = validate(body, req.body);
      if (!score_map.isOk) throw score_map;

      for (const [assignId, score] of Object.entries(score_map.val)) {
        const result = await app.locals.model.addScore(
          section_id.val,
          student_id.val,
          assignId,
          score
        );
        if (!result.isOk) throw result;
      }

      res.status(STATUS.OK).json(selfResult(req, undefined, STATUS.OK));
    } catch (err) {
      const mapped = mapResultErrors(err);
      res.status(mapped.status).json(mapped);
    }
  };
}

function doGetSectionData(app: Express.Application) {
  return async (req: Request, res: Response) => {
    try {
     
      const section_resultid = validate(Z.SectionId, req.params.id);
      if (!section_resultid.isOk) throw section_resultid;
      const sectionId = section_resultid.val;

      const Query = z.object({ kind: z.literal("all") });
      const Raw_query = z.object({ kind: z.literal("raw") });
      const Student_query = z.object({
        kind: z.literal("student"),
        studentId: Z.StudentId,
      });
      const Aggr_rowsquery = z.object({ kind: z.literal("aggrRows") });
      const Select_query = z.object({
        kind: z.literal("select"),
        rowId: z.union([z.array(Z.RowId), Z.RowId]).optional(),
        colId: z.union([z.array(Z.ColId), Z.ColId]).optional(),
      });

      const SectionDataQuery = z.union([
        Query,
        Raw_query,
        Student_query,
        Aggr_rowsquery,
        Select_query,
      ]);

    
      const parsed_query = SectionDataQuery.safeParse(req.query);
      if (!parsed_query.success) throw parsed_query.error;
      const query = parsed_query.data;

      let result;
      switch (query.kind) {
        case "all":
          result = await app.locals.model.getSectionData(sectionId, [], []);
          break;

        case "raw":
          result = await app.locals.model.getRawData(sectionId);
          break;

        case "student":
          result = await app.locals.model.getStudentData(sectionId, query.studentId);
          break;

        case "aggrRows":
          result = await app.locals.model.getAggrRows(sectionId);
          break;

        case "select": {
          let rowIds: string[];
          if (query.rowId !== undefined) {
            rowIds = Array.isArray(query.rowId) ? query.rowId : [query.rowId];
          } else {
            const infoResult = await app.locals.model.getSectionInfo(sectionId);
            if (!infoResult.isOk) throw infoResult;
          
            rowIds = Object.values(infoResult.val.rowHdrs)
              .filter((r: any) => r._tag === "student")
              .map((r: any) => r.id);
          }

          let colIds: string[];
          if (query.colId !== undefined) {
            colIds = Array.isArray(query.colId) ? query.colId : [query.colId];
          } else {
            colIds = [];
          }

          result = await app.locals.model.getSectionData(sectionId, rowIds, colIds);

          if (result.isOk) {
            
          } else {
            
          }

          break;
        }

        default:
          throw { status: 400, tag: "BAD_QUERY_KIND" };
      }

      if (!result.isOk) throw result;
      res.status(STATUS.OK).json(selfResult(req, result.val, STATUS.OK));
    } catch (err) {
      const mapped = mapResultErrors(err);
      res.status(mapped.status).json(mapped);
    }
  };
}

function doGetDataEntry(app: Express.Application) {
  return async (req: Request, res: Response) => {
    try {
      const section_id = validate(Z.SectionId, req.params.sectionId);
      const row = validate(Z.RowId, req.params.rowId);
      const col = validate(Z.ColId, req.params.colId);
      if (!section_id.isOk) throw section_id;
      if (!row.isOk) throw row;
      if (!col.isOk) throw col;

      const result = await app.locals.model.getEntry(section_id.val, row.val, col.val);
      if (!result.isOk) throw result;

      res.status(STATUS.OK).json(selfResult(req, result.val, STATUS.OK));
    } catch (err) {
      const mapped = mapResultErrors(err);
      res.status(mapped.status).json(mapped);
    }
  };
}

function do404(app: Express.Application) {
  return (req: Request, res: Response) => {
    const result = {
      status: STATUS.NOT_FOUND,
      errors: [{ code: "NOT_FOUND", options: {}, message: `${req.method} not supported for ${req.originalUrl}` }],
    };
    res.status(STATUS.NOT_FOUND).json(result);
  };
}

function doErrors(app: Express.Application) {
  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    const result = {
      status: STATUS.INTERNAL_SERVER_ERROR,
      errors: [{ options: { code: "INTERNAL" }, message: err.message || err.toString() }],
    };
    res.status(STATUS.INTERNAL_SERVER_ERROR).json(result);
  };
}

const CORS_OPTIONS = {
  origin: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  exposedHeaders: ["Location", "Content-Type"],
};