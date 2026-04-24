import Resolver from '@forge/resolver';
import { handleNonRepeating, handleRepeating } from './adfExport';

const resolver = new Resolver();

export const handler = resolver.getDefinitions();
export { handleNonRepeating, handleRepeating };
