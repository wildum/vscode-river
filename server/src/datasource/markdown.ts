import axios from 'axios';

export class MarkdownComponentDataSource implements ComponentDataSource {

    // Function to fetch the list of .md files from the specified GitHub path
    async fetchMarkdownFiles(branch: string) {
        const baseUrl = `https://api.github.com/repos/grafana/agent/contents/docs/sources/flow/reference/components?ref=${branch}`;
        try {
            const response = await axios.get(baseUrl);
            const files = response.data.filter((file: any) => file.name.endsWith('.md') && file.name !== '_index.md');

            return files; // This contains file information including the download_url you can use to fetch the content
        } catch (error) {
            console.error('Error fetching files:', error);
            return [];
        }
    }

    parseMarkdownFile(filename: string, content: string): Component {
        const componentName = filename.slice(0, -3)
        const startDocIndex = content.indexOf( "\`" + componentName + "\`")
        const endDocIndex= content.indexOf('\n\n', startDocIndex);
        let doc = ""
        if (startDocIndex > 0 && endDocIndex > 0) {
            doc = content.substring(startDocIndex, endDocIndex)
        }

        let args: Argument[] = []
        const argumentTable = this.extractTableData(content, "## Arguments", 5)
        for (let parts of argumentTable) {
            args.push({
                name: parts[0],
                type: parts[1],
                doc: parts[2],
                required: parts[4].toLowerCase() === 'yes',
                default: parts[3] || null,
            });
        }

        let exports: Export[] = []
        const exportTable = this.extractTableData(content, "## Exported fields", 3)
        for (let parts of exportTable) {
            exports.push({
                name: parts[0],
                type: parts[1],
                doc: parts[2],
            });
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

    extractTableData(content: string, marker: string, expectedColumns: number): string[][] {
        const endMarker = '#'
    
        // Find and extract the Arguments table
        const argumentsStartIndex = content.indexOf(marker) + marker.length;
        let endIndex = content.indexOf(endMarker, argumentsStartIndex);
        const argumentsSection = content.substring(argumentsStartIndex, endIndex).trim();
        const lines = argumentsSection.split('\n').filter(line => line.split('|').length == expectedColumns).slice(2);
    
        return lines.reduce((acc: string[][], line) => {
            const parts = line.replace(/`/g, '').split('|').map(part => part.trim());
            acc.push(parts);
            return acc;
        }, []);
    }

    async getComponents(): Promise<Map<string, Component>> {
        let components = new Map<string, Component>()
        const branchName = 'release-v0.40';
        const files = await this.fetchMarkdownFiles(branchName);
        for (const file of files) {
            try {
                const fileResponse = await axios.get(file.download_url);
                let component = this.parseMarkdownFile(file.name, fileResponse.data)
                components.set(component.name, component)
            } catch (error) {
                console.error(`Error fetching content for ${file.name}:`, error);
            }
        }
        return components
    }
}
