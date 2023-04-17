import { CalloutCollectorPlugin } from './plugin';
import { FuzzySuggestModal } from 'obsidian';

export class FilterModal extends FuzzySuggestModal<string> {
  callback: (item: string) => void;
  calloutTypes: string[] = [];

  constructor(private readonly plugin: CalloutCollectorPlugin) {
    super(plugin.app);
  }

  getItems(): string[] {
    return this.calloutTypes;
  }
  getItemText(item: string): string {
    return item;
  }
  onChooseItem(item: string): void {
    this.callback(item);
  }
}
