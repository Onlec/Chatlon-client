import Gun from 'gun';
import 'gun/sea';
import { log } from './utils/debug';

// Centrale Gun instantie die door alle componenten gedeeld wordt
export const gun = Gun({ peers: [process.env.REACT_APP_GUN_URL] });
export const user = gun.user().recall({ storage: true });

export default gun;