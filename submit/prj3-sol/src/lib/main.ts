import { AggrFns, DbGrades, makeDbGrades, Errors as E, Types as T,
	 Infos, RawData, StudentsData  }
  from 'prj2-sol';

import { serve, App, } from './grades-ws.js';

import assert from 'assert';
import fs from 'fs';
import fs1 from 'fs/promises';

import util from 'util';
import https from 'https';
import Path from 'path';

export default function () { return main(process.argv.slice(2)); }

async function main(args: string[]) {
  if (args.length < 1 || args.length > 1 && args[0] !== '--load') usage();
  const doLoad = args.length > 1;
  const config = (await import(cwdPath(args[doLoad ? 1 : 0]))).default;
  const port: number = config.ws.port;
  if (port < 1024) {
    usageError(`bad port ${port}: must be >= 1024`);
  }
  try {
    const servicesResult =
      await makeDbGrades(config.service.dbUrl, AggrFns.rowAggrFns,
			 AggrFns.colAggrFns);
    if (!servicesResult.isOk) panic(servicesResult);
    const services = servicesResult.val;
    if (doLoad) {
      const loadResult = await loadData(services);
      if (!loadResult.isOk) panic(loadResult);
    }
    const {app, close: closeApp} = serve(services, config.ws);
    const serverOpts = {
      key: fs.readFileSync(config.https.keyPath),
      cert: fs.readFileSync(config.https.certPath),
    };
    const server = https.createServer(serverOpts, app)
      .listen(config.ws.port, function() {
	console.log(`listening on port ${config.ws.port}`);
      });
    //terminate using SIGINT ^C
    //console.log('enter EOF ^D to terminate server');
    //await readFile(0, 'utf8');
    //closeApp(); server.close(); 
  }
  catch (err) {
    console.error(err);
    process.exit(1);
  }
  finally {
    //if (dao) await dao.close();
  }
}


async function loadData(services: DbGrades)
  : Promise<E.Result<void, E.Errs>>
{
  const clearResult = await services.clear();
  if (!clearResult.isOk) return clearResult;
  for (const student of StudentsData) {
    const addResult = await services.addStudent(student);
    if (!addResult.isOk) return addResult;
  }
  const sectionIds = Object.keys(Infos) as T.SectionId[];
  for (const sectionId of sectionIds) {
    const loadResult =
      await services.loadSection(Infos[sectionId], RawData[sectionId]);
    if (!loadResult.isOk) return loadResult;
  }
  return E.okResult(undefined);
}

/** Output usage message to stderr and exit */
function usage() : never  {
  const prog = Path.basename(process.argv[1]);
  console.error(`usage: ${prog} [--load] CONFIG_MJS`);
  process.exit(1);
}

function usageError(err?: string) {
  if (err) console.error(err);
  usage();
}

function panic<T>(result: E.Result<T, E.Errs>) : never {
  assert(result.isOk === false);
  console.error(result.err.toString());
  process.exit(1);
}


export async function readJson(path: string) : Promise<E.Result<any, E.Errs>> {
  let text : string;
  try {
    text = await fs1.readFile(path, 'utf8');
  }
  catch (e) {
    const msg = `unable to read ${path}: ${(e as Error).message}`;
    return E.errResult(E.Errs.err(msg));
  }
  try {
    if (path.endsWith('.jsonl')) {
      text = '[' + text.trim().replace(/\n/g, ',') + ']';
    }
    return E.okResult(JSON.parse(text));
  }
  catch (e) {
    const msg = `unable to parse JSON from ${path}: ${(e as Error).message}`;
    return E.errResult(E.Errs.err(msg));
  }
}

export function cwdPath(path: string) : string {
  return (path.startsWith(Path.sep)) ? path : Path.join(process.cwd(), path);
}


export function abort(msg: string, ...args: any[]) : never {
  const text = msg + args.map(a => JSON.stringify(a)).join(' ');
  console.error(text);
  process.exit(1);
}
