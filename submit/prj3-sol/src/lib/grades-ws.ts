import cors from 'cors';
import Express from 'express';
import bodyparser from 'body-parser';
import assert from 'assert';
import STATUS from 'http-status';

import { z } from 'zod';

import { DbGrades, makeDbGrades, Grades, Types as T, Errors as E,
         ZodSchemas as Z, validate, }
  from 'prj2-sol';


import { selfHref, selfResult, mapResultErrors, } from './ws-utils.js';

//Based on 
//<https://plainenglish.io/blog/typed-express-request-and-response-with-typescript>
//Instead of depending on express.js types, specify query-string types
type RequestWithQuery = Express.Request
  & { query: { [_: string]: string|string[]|number } };

export type App = Express.Application;

type ServeRet = {
  app: App,
  close: () => void,
};

type SERVER_OPTIONS = {
  base?: string,
};
    
export function serve(model: DbGrades, options: SERVER_OPTIONS={})
  : ServeRet
{
  const app = Express();
  app.locals.model = model;
  const { base = '/api',  } = options;
  app.locals.base = base;
  setupRoutes(app);
  return { app, close: model.close, };
}


function setupRoutes(app: Express.Application) {
  const base = app.locals.base;

  //allow cross-origin resource sharing
  app.use(cors(CORS_OPTIONS));

  //assume that all request bodies are parsed as JSON
  //making strict false assumes that JSON primitives are also parsed
  app.use(Express.json({strict: false}));

  //if uncommented, all requests are traced on the console
  //app.use(doTrace(app));
  
  //TODO: add routes
  
  //must be last
  app.use(do404(app));  //custom handler for page not found
  app.use(doErrors(app)); //custom handler for internal errors
}

function doTrace(app: Express.Application) {
  return (async function(req: Express.Request, res: Express.Response, 
			 next: Express.NextFunction) {
    console.log(req.method, req.originalUrl);
    console.log("query", JSON.stringify(req.query));
    console.log("body", JSON.stringify(req.body));
    next();
  });
}

//TODO: add handler generating functions

/** Default handler for when there is no route for a particular method
 *  and path.
 */
function do404(app: Express.Application) {
  return async function(req: Express.Request, res: Express.Response) {
    const message = `${req.method} not supported for ${req.originalUrl}`;
    const result = {
      status: STATUS.NOT_FOUND,
      errors: [	{ code: 'NOT_FOUND', options: {},  message, }, ],
    };
    res.status(404).json(result);
  };
}

/** Ensures a server error results in nice JSON sent back to client
 *  with details logged on console.
 */ 
function doErrors(app: Express.Application) {
  return async function(err: Error, req: Express.Request, res: Express.Response,
			next: Express.NextFunction) {
    const message = err.message ?? err.toString();
    const [status, code] = (err instanceof SyntaxError)
      ? [STATUS.BAD_REQUEST, 'SYNTAX' ]
      : [STATUS.INTERNAL_SERVER_ERROR, 'INTERNAL'];
    const result = {
      status: STATUS[status],
      errors: [ { options: { code }, message } ],
    };
    res.status(status).json(result);
    if (status === STATUS.INTERNAL_SERVER_ERROR) console.error(result.errors);
  };
}




/**************************** CORS Options *****************************/

/** options which affect whether cross-origin (different scheme, domain or port)
 *  requests are allowed
 */
const CORS_OPTIONS = {
  //if localhost origin, reflect back in Access-Control-Allow-Origin res hdr
  // origin: /localhost:\d{4}/,
  
  // simple reflect req origin hdr back to Access-Control-Allow-Origin res hdr
  origin: true,

  //methods allowed for cross-origin requests
  methods: [ 'GET', 'PUT', ],

  //request headers allowed on cross-origin requests
  //used to allow JSON content
  allowedHeaders: [ 'Content-Type', ],

  //response headers exposed to cross-origin requests
  exposedHeaders: [  'Location', 'Content-Type', ],
};

