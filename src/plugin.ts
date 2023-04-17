import { Plugin, TFile } from 'obsidian';

import { Callout } from './callout';
import { FilterModal } from './modal';
import { PageMetadata } from 'obsidian-dataview';

const calloutRegex =
  /(?:^>\s+\[!(?<type>.+)\]\s*(?<title>.*)\n)(?<content>(?:(?:^>\s+.*)\n?)+)/gm;

export class CalloutCollectorPlugin extends Plugin {
  simplifyContent = true;
  filterModal = new FilterModal(this);

  async onload() {
    this.addCommand({
      name: 'Collect All Callouts to Frontmatter',
      id: 'callout-collect-all',
      callback: async () => {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
          return;
        }
        const callouts = await this.parseDirectory(
          activeFile.parent?.path || '/'
        );
        this.writeToFrontmatter(activeFile, callouts);
      },
    });

    this.addCommand({
      name: 'Collect Certain Callouts to Frontmatter',
      id: 'callout-collect-filter',
      callback: async () => {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
          return;
        }
        const allCallouts = await this.parseDirectory(
          activeFile.parent?.path || '/'
        );
        const calloutTypes = [...new Set(allCallouts.map((c) => c.type))];
        this.filterModal.calloutTypes = calloutTypes;
        const modalCallback = (calloutType: string) => {
          if (!calloutType) {
            return;
          }
          this.writeToFrontmatter(
            activeFile,
            allCallouts.filter((c) => c.type === calloutType)
          );
        };
        this.filterModal.callback = modalCallback;
        this.filterModal.open();
      },
    });

    (window['callouts'] = this) &&
      this.register(() => delete window['callouts']);
  }

  async parseDirectory(path: string): Promise<Callout[]> {
    const files = this.app.vault
      .getFiles()
      .filter((f) => f.parent?.path === path);
    const callouts: Callout[] = [];
    for (let i = 0; i < files.length; i++) {
      callouts.push(...(await this.parseFile(files[i])));
    }
    return callouts;
  }

  async parseFile(file: TFile | PageMetadata): Promise<Callout[]> {
    if (!file) {
      return [];
    }
    const fileContent = await this.readFile(file);
    if (!fileContent) {
      return [];
    }
    const template: Callout = {
      type: '',
      title: '',
      content: '',
      filePath: file.path,
      fileName: fileContent.name,
    };
    const callouts: Callout[] = [];
    let match: RegExpMatchArray | null = null;
    do {
      match = calloutRegex.exec(fileContent.data);
      if (match) {
        callouts.push(this.handleMatch(match, template));
      }
    } while (match);
    return callouts;
  }

  private async readFile(
    file: TFile | PageMetadata
  ): Promise<{ data: string; name: string } | null> {
    let data = '';
    let name = '';
    if (file instanceof TFile) {
      name = file.name;
      data = await this.app.vault.read(file);
    } else {
      name = (file as any).name;
      const foundFile = this.app.metadataCache.getFirstLinkpathDest(
        file.path,
        '/'
      );
      if (!foundFile) {
        return null;
      }
      data = await this.app.vault.read(foundFile);
    }
    return { data, name };
  }

  private handleMatch(match: RegExpMatchArray, template: Callout): Callout {
    let content = match?.groups?.content ?? '';
    if (this.simplifyContent) {
      content = this.simplifyCalloutContent(content);
    }
    return {
      ...template,
      type: match?.groups?.type ?? '',
      title: match?.groups?.title ?? '',
      content,
    };
  }

  simplifyCalloutContent(content: string): string {
    return content
      .split('\n')
      .map((line) => line.replace('>', '').trim())
      .filter((line) => Boolean(line))
      .join(' ');
  }

  private writeToFrontmatter(file: TFile, callouts: Callout[]): void {
    this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      frontmatter['callouts'] = callouts;
    });
  }
}
