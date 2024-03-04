import axios from 'axios';

export class MarkdownComponentDataSource implements ComponentDataSource {

    connection: any
    constructor(connect: any) {
        this.connection = connect
    }

    sharedBlocks = new Map<string, Block>()
    sharedExports = new Map<string, Export[]>()

    async getComponents(): Promise<Map<string, Component>> {
        const branch = 'release-v0.40';
        const sharedUrl = `https://api.github.com/repos/grafana/agent/contents/docs/sources/shared/flow/reference/components?ref=${branch}`
        const componentsUrl = `https://api.github.com/repos/grafana/agent/contents/docs/sources/flow/reference/components?ref=${branch}`
        
        this.sharedBlocks = new Map<string, Block>()
        this.sharedExports = new Map<string, Export[]>()
        
        const sharedFiles = await this.fetchFiles(sharedUrl)
        for (const file of sharedFiles) {
            try {
                const fileResponse = await axios.get(file.download_url)
                // first check exports
                let exportsTable = this.extractTableData(fileResponse.data, "", 3)
                if (exports.length != 0) {
                    this.sharedExports.set(file.name.slice(0, -3), this.buildExports(exportsTable))
                    continue
                }
                // then check blocks
                // TODO
            } catch (error) {
                console.error(`Error fetching content for ${file.name}:`, error)
            }
        }

        let components = new Map<string, Component>()
        const componentFiles = await this.fetchFiles(componentsUrl)
        for (const file of componentFiles) {
            try {
                const fileResponse = await axios.get(file.download_url)
                let component = this.parseComponentFile(file.name, fileResponse.data)
                components.set(component.name, component)
            } catch (error) {
                console.error(`Error fetching content for ${file.name}:`, error)
            }
        }
        return components
    }

    async fetchFiles(url: string): Promise<FileInfo[]> {
        try {
            const response = await axios.get<FileInfo[]>(url)
            const files = response.data.filter((file: FileInfo) => file.name.endsWith('.md') && file.name !== '_index.md')
            return files;
        } catch (error) {
            console.error('Error fetching files:', error)
            return [];
        }
    }

    parseComponentFile(filename: string, content: string): Component {
        const componentName = filename.slice(0, -3)
        const startDocIndex = content.indexOf( "\`" + componentName + "\`")
        const endDocIndex= content.indexOf('\n\n', startDocIndex);
        let doc = ""
        if (startDocIndex > 0 && endDocIndex > 0) {
            doc = content.substring(startDocIndex, endDocIndex)
        }

        const argumentTable = this.extractTableData(content, "## Arguments", 5)
        let args = this.buildArguments(argumentTable)
        
        const exportFieldMarker = "## Exported fields"
        const ref = this.extractRef(content, exportFieldMarker)
        let exports:Export[] = []
        if (ref != "") {
            exports = this.sharedExports.get(ref)!
        } else {
            const exportTable = this.extractTableData(content, exportFieldMarker, 3)
            exports = this.buildExports(exportTable)
        }

        return {
            name: componentName,
            doc: doc,
            arguments: args,
            hasLabel: true,
            exports: exports,
            blocks: [], // TODO
        };
    }

    buildArguments(tableData : string[][]): Argument[] {
        let args: Argument[] = []
        for (let parts of tableData) {
            args.push({
                name: parts[0],
                type: parts[1],
                doc: parts[2],
                required: parts[4].toLowerCase() === 'yes',
                default: parts[3] || null,
            });
        }
        return args
    }

    buildExports(tableData : string[][]): Export[] {
        let exports: Export[] = []
        for (let parts of tableData) {
            exports.push({
                name: parts[0],
                type: parts[1],
                doc: parts[2],
            });
        }
        return exports
    }

    extractTableData(content: string, marker: string, expectedColumns: number): string[][] {
        const endMarker = '#'
        let section = content
    
        if (marker != "") {
            const startIndex = content.indexOf(marker) + marker.length
            let endIndex = content.indexOf(endMarker, startIndex)
            section = content.substring(startIndex, endIndex).trim()
        }
    
        const lines = section.split('\n').map(line => trimPipeCharacters(line)).filter(line => line.split('|').length == expectedColumns).slice(2)
        return lines.reduce((acc: string[][], line) => {
            const parts = line.replace(/`/g, '').split('|').map(part => part.trim())
            acc.push(parts);
            return acc;
        }, []);
    }

    extractRef(content: string, marker: string): string {
        const endMarker = '#'
        const startIndex = content.indexOf(marker) + marker.length
        let endIndex = content.indexOf(endMarker, startIndex)
        let section = content.substring(startIndex, endIndex).trim()

        const pattern = /{{<\s*docs\/shared\s+lookup="([^"]*\/)?([^\/"]+).md"/;
        const match = section.match(pattern);
    
        if (match && match[2]) {
            return match[2];
        }
        return "";
    }
}

function trimPipeCharacters(str: string): string {
    if (str.startsWith('|')) {
        str = str.substring(1);
    }
    if (str.endsWith('|')) {
        str = str.substring(0, str.length - 1);
    }

    return str;
}

interface FileInfo {
    name: string;
    download_url: string;
}