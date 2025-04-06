import { Link, SelfLinks, NavLinks,
	 SuccessEnvelope, PagedEnvelope, ErrorEnvelope }
  from './response-envelopes.js';

import { Errors as E} from 'prj2-sol';

import Express from 'express';
import assert from 'assert';
import STATUS from 'http-status';


/************************* HATEOAS Utilities ***************************/

/** Return original URL for req */
function requestUrl(req: Express.Request) {
  return `${req.protocol}://${req.get('host')}${req.originalUrl}`;
}

/** Return path for req.  If id specified extend with /id, otherwise add in
 *  any query params. 
 */
export function selfHref(req: Express.Request, id: string = '') {
  const url = new URL(requestUrl(req));
  return url.pathname + (id ? `/${id}` : url.search);
}



/** Return a success envelope for a single result. */
export function selfResult<T>(req: Express.Request, result: T,
		       status: number = STATUS.OK)
  : SuccessEnvelope<T>
{
  const method = req.method;
  return { isOk: true,
	   status,
	   links: { self: { rel: 'self', href: selfHref(req), method } },
	   result,
	 };
}


 
/*************************** Mapping Errors ****************************/

//map from domain errors to HTTP status codes.  If not mentioned in
//this map, an unknown error will have HTTP status BAD_REQUEST.
const ERROR_MAP: { [code: string]: number } = {
  EXISTS: STATUS.CONFLICT,
  NOT_FOUND: STATUS.NOT_FOUND,
  BAD_REQ: STATUS.BAD_REQUEST,
  AUTH: STATUS.UNAUTHORIZED,
  DB: STATUS.INTERNAL_SERVER_ERROR,
  INTERNAL: STATUS.INTERNAL_SERVER_ERROR,
}

type HttpError = { message: string, code: string, options: Record<string, string> };

/** Return first status corresponding to first options.code in
 *  errors, but INTERNAL_SERVER_ERROR dominates other statuses.  Returns
 *  BAD_REQUEST if no code found.
 */
function getHttpStatus(errors: HttpError[]) : number {
  let status: number = 0;
  for (const err of errors) {
    const code = err.code;
    const errStatus = (code !== undefined) ? ERROR_MAP[code] : -1;
    if (errStatus > 0 && status === 0) status = errStatus;
    if (errStatus === STATUS.INTERNAL_SERVER_ERROR) status = errStatus;
  }
  return status !== 0 ? status : STATUS.BAD_REQUEST;
}

/** Map domain/internal errors into suitable HTTP errors.  Return'd
 *  object will have a "status" property corresponding to HTTP status
 *  code.
 */
export function mapResultErrors(err: any) : ErrorEnvelope {
  let errors: HttpError[];
  if (err.isOk !== undefined) {
    const err1 = err as E.Result<any, E.Errs>;
    assert(err1.isOk === false);
    errors = err1.err.errors()
      .map(e => ({ message: e.message, code: e.code, options: e.options }));
  }
  else {
    errors = [ {message: err.message ?? err.toString(), code: 'UNKNOWN', options: {} }, ];
  }
  const status = getHttpStatus(errors);
  if (status === STATUS.INTERNAL_SERVER_ERROR) console.error(errors);
  return { isOk: false, status, errors, };
} 

/******************************* Paging ********************************/

const DEFAULT_INDEX = 0;
const DEFAULT_COUNT = 5;

/** Produce paging link for next (dir === 1), prev (dir === -1)
 *  for req having nResults results.  Return undefined if there
 *  is no such link.
 */
function pageLink(req: Express.Request, nResults: number, dir: 1|-1) {
  const url = new URL(requestUrl(req));
  const count = Number(req.query?.count ?? DEFAULT_COUNT);
  const index0 = Number(url.searchParams.get('index') ?? 0);
  if (dir > 0 ? nResults <= count : index0 <= 0) return undefined;
  const index = dir > 0 ? index0 + count : count > index0 ? 0 : index0 - count;
  url.searchParams.set('index', String(index));
  url.searchParams.set('count', String(count));
  return url.pathname + url.search;
}


/** Return a paged envelope for multiple results for type T. */
export function pagedResult<T>(req: Express.Request,
			       idKey: keyof T, results: T[])
  : PagedEnvelope<T>
{
  const nResults = results.length;
  const result = //(T & {links: { self: string } })[]  =
    results.map(r => {
      const selfLinks : SelfLinks =
      { self: { rel: 'self', href: selfHref(req, r[idKey] as string),
		method: 'GET' } };
	return { result: r, links: selfLinks };
    });
  const links: NavLinks =
    { self: { rel: 'self', href: selfHref(req), method: 'GET' } };
  const next = pageLink(req, nResults, +1);
  if (next) links.next = { rel: 'next', href: next, method: 'GET', };
  const prev = pageLink(req, nResults, -1);
  if (prev) links.prev = { rel: 'prev', href: prev, method: 'GET', };
  const count = req.query.count ? Number(req.query.count) : DEFAULT_COUNT;
  return { isOk: true, status: STATUS.OK, links,
	   result: result.slice(0, count), };
}

