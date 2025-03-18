import * as mongo from 'mongodb';

import { Grades, Types as T, Errors as E} from 'prj1-sol';

//TODO: add stuff

export class GradesDao {
  
  //called by below static make() factory function with
  //parameters to be cached in this instance.
  constructor(/* params as needed */) {
    //TODO
  }

  //static factory function; should do all async operations like
  //getting a connection and creating indexing.  Finally, it
  //should use the constructor to return an instance of this class.
  //returns error code DB on database errors.
  static async make(dbUrl: string /* TODO: params as needed */)
    : Promise<E.Result<GradesDao, E.Err>> 
  {
      return E.errResult(E.Err.err('TODO', 'TODO'));
  }

  // TODO: add other DAO methods

} //GradesDao

// TODO: add private functions, types, data as needed
  
