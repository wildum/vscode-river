interface ComponentDataSource {
    getComponents(): Promise<Map<string, Component>>
    setVersion(version: string): void
}