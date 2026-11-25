import { useContext } from 'react';
import { AuthContext } from './context';
/** Read the current account and its server-provided permissions. */
export function useAuth() { return useContext(AuthContext); }
