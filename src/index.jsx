import Resolver from '@forge/resolver';
import { handleNonRepeating, handleRepeating } from './adfExport';

const resolver = new Resolver();

// resolver.define('getText', (req) => {
//   console.log(req);
//   return 'Hello, world!';
// });

export const handler = resolver.getDefinitions();
export { handleNonRepeating, handleRepeating };
