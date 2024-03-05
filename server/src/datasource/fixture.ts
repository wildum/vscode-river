export class FixtureComponentDataSource implements ComponentDataSource {
    async getComponents(): Promise<Map<string, Component>> {
        let components = new Map<string, Component>([
           // you can add some components for testing
        ]);
        return components;
    }
    setVersion(version: string){}
}