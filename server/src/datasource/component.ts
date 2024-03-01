interface ComponentDataSource {
    getComponents(): Promise<Map<string, Component>>;
}