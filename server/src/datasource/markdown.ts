import axios from 'axios';

export class MarkdownComponentDataSource implements ComponentDataSource {

    connection: any
    version: string
    constructor(connect: any, version: string) {
        this.connection = connect
        this.version = version
    }

    componentWithoutLabels = new Set<string>(["http", "logging", "remotecfg", "tracing"])

    sharedBlocks = new Map<string, Argument[]>() // blockName => arguments of the block
    sharedExports = new Map<string, Export[]>()

    async getComponents(): Promise<Map<string, Component>> {
        const sharedUrl = `https://api.github.com/repos/grafana/agent/contents/docs/sources/shared/flow/reference/components?ref=${this.version}`
        const componentsUrl = `https://api.github.com/repos/grafana/agent/contents/docs/sources/flow/reference/components?ref=${this.version}`
        const configBlocksUrl = `https://api.github.com/repos/grafana/agent/contents/docs/sources/flow/reference/config-blocks?ref=${this.version}`
        
        this.sharedBlocks = new Map<string, Argument[]>()
        this.sharedExports = new Map<string, Export[]>()
        
        const sharedFiles = await this.fetchFiles(sharedUrl)
        for (const file of sharedFiles) {
            try {
                const fileResponse = await axios.get(file.download_url)
                // first check exports
                let exportsTable = this.extractTableData(fileResponse.data, "", 3)
                if (exportsTable.length != 0) {
                    this.sharedExports.set(file.name.slice(0, -3), this.buildExports(exportsTable))
                    continue
                }
                // then check blocks
                let blockArgsTable = this.extractTableData(fileResponse.data, "", 5)
                if (blockArgsTable.length != 0) {
                    this.sharedBlocks.set(file.name.slice(0, -3), this.buildArguments(blockArgsTable))
                }
            } catch (error) {
                this.connection.console.error(`Error fetching content for ${file.name}:`, error)
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
                this.connection.console.error(`Error fetching content for ${file.name}:`, error)
            }
        }

        const configBlocksFiles = await this.fetchFiles(configBlocksUrl)
        for (const file of configBlocksFiles) {
            try {
                const fileResponse = await axios.get(file.download_url)
                let component = this.parseComponentFile(file.name, fileResponse.data)
                components.set(component.name, component)
            } catch (error) {
                this.connection.console.error(`Error fetching content for ${file.name}:`, error)
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
        const exportRef = this.extractRef(content, exportFieldMarker)
        let exports:Export[] = []
        if (exportRef != "") {
            exports = this.sharedExports.get(exportRef)!
        } else {
            const exportTable = this.extractTableData(content, exportFieldMarker, 3)
            exports = this.buildExports(exportTable)
        }

        const blockFieldMarker = "## Blocks"
        const blocksTable = this.extractTableData(content, blockFieldMarker, 4)
        let blocks = this.buildBlocks(content, blocksTable)

        return {
            name: componentName,
            doc: doc,
            arguments: args,
            hasLabel: !this.componentWithoutLabels.has(componentName),
            exports: exports,
            blocks: blocks,
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

    buildBlocks(content: string, tableData: string[][]): Block[] {
        const blockMap = this.parseMarkdownBlocks(content)
        let blocks: Block[] = []
        for (let parts of tableData) {
            const blockNameParts = parts[0].split(" > ")
            if (blockNameParts.length == 1) {
                const name = blockNameParts[0].trim()
                let block: Block = {
                    name: name,
                    doc: parts[2],
                    required: parts[3].toLowerCase() === "yes",
                    arguments: blockMap.get(name) || [],
                    blocks: []
                }
                blocks.push(block)
            } else {
                this.addBlockToBlock(blocks, blockMap, blockNameParts, parts)
            }
        }
        return blocks
    }

    addBlockToBlock(blocks: Block[], blockMap: Map<string, Argument[]>, blockNameParts: string[], parts: string[]) {
        for (let i = 0; i < blocks.length; i++) {
            if (blockNameParts[0] == blocks[i].name) {
                if (blockNameParts.length == 2) {
                    const name = blockNameParts[blockNameParts.length - 1].trim()
                    blocks[i].blocks.push({
                        name: name,
                        doc: parts[2],
                        required: parts[3].toLowerCase() === "yes",
                        arguments: blockMap.get(name) || [],
                        blocks: []
                    })
                } else {
                    this.addBlockToBlock(blocks[i].blocks, blockMap, blockNameParts.slice(1), parts)
                }
            }
        }
    }

    parseMarkdownBlocks(content: string): Map<string, Argument[]> {
        // Find the "## Blocks" section
        const blocksSectionMatch = content.match(/## Blocks\n([\s\S]*?)(?=\n## |$)/);
        if (!blocksSectionMatch) return new Map();
    
        const blocksSection = blocksSectionMatch[1];
        const blockSubsections = blocksSection.split(/\n### /).slice(1); // slice(1) to jump to the first block
    
        const blocksMap = new Map<string, Argument[]>();
        blockSubsections.forEach(subsection => {
            const titleEndIndex = subsection.indexOf('\n');
            const blockName = subsection.substring(0, titleEndIndex).split(" ")[0].trim();
            const content = subsection.substring(titleEndIndex + 1).trim();

           
            let args:Argument[] = []
            const blockTable = this.extractTableData(content, "", 5)
            if (blockTable.length != 0) {
                args = this.buildArguments(blockTable)
            } else {
                const ref = this.extractRef(content, "")
                if (ref != "") {
                    args = this.sharedBlocks.get(ref) || []
                }
            }
            blocksMap.set(blockName, args);
        });
    
        return blocksMap;
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
        let section = content
    
        if (marker != "") {
            const startIndex = content.indexOf(marker) + marker.length
            let endIndex = content.indexOf(endMarker, startIndex)
            section = content.substring(startIndex, endIndex).trim()
        }

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