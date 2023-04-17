import 'obsidian';
import { CalloutCollectorPlugin } from './plugin';

declare global {
  interface Window {
    callouts?: CalloutCollectorPlugin;
  }
}
