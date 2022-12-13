'use strict';

import * as fs from 'node:fs';
import * as path from 'node:path';
import Configuration from "./Configuration";

export default class TemplatesManager {
    config: Configuration;

    constructor() {
        this.config = new Configuration();
    }

    public path(fileName: string): string | undefined {
        const dir = this.templatesDir();

        if (!dir) {
            return undefined;
        }

        const filePath = path.join(dir, fileName);

        return fs.existsSync(filePath) ? filePath : undefined;
    }

    public templatesDir(): string | undefined {
        const settingsDir = this.config.get('templatesDir');

        if (settingsDir && fs.existsSync(settingsDir)) {
            return settingsDir;
        }

        return undefined;
    }
}
