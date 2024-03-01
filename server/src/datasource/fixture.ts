export class FixtureComponentDataSource implements ComponentDataSource {
    async getComponents(): Promise<Map<string, Component>> {
        // Adjusted fixture data with three components
        let components = new Map<string, Component>([
            ["ComponentWithoutExports", {
                name: "ComponentWithoutExports",
                doc: "This component does not include any exports.",
                hasLabel: true,
                arguments: [
                    {
                        name: "arg1",
                        type: "number",
                        doc: "An example numeric argument.",
                        required: false,
                        default: 0
                    }
                ],
                exports: [],
                blocks: [
                    {
                        name: "InitializationBlock",
                        doc: "Initializes the component.",
                        required: true
                    }
                ]
            }],
            ["ComponentWithoutBlocks", {
                name: "ComponentWithoutBlocks",
                doc: "This component does not include any blocks.",
                hasLabel: false,
                arguments: [
                    {
                        name: "arg2",
                        type: "boolean",
                        doc: "An example boolean argument.",
                        required: true,
                        default: true
                    }
                ],
                exports: [
                    {
                        name: "exportedFlag",
                        type: "boolean",
                        doc: "An example exported boolean.",
                        required: false,
                        default: false,
                    }
                ],
                blocks: []
            }],
            ["CompleteComponent", {
                name: "CompleteComponent",
                hasLabel: true,
                doc: "This component includes arguments, exports, and blocks.",
                arguments: [
                    {
                        name: "arg3",
                        type: "string",
                        doc: "An example string argument.",
                        required: true,
                        default: "defaultString"
                    },
                    {
                        name: "arg8",
                        type: "int",
                        doc: "An example int argument8.",
                        required: true,
                        default: 45
                    },
                    {
                        name: "anotherArg",
                        type: "string",
                        doc: "An example int argument8.",
                        required: true,
                        default: "blablabla"
                    }
                ],
                exports: [
                    {
                        name: "exportedString",
                        type: "string",
                        doc: "An example exported string.",
                        required: false,
                        default: "blabla"
                    }
                ],
                blocks: [
                    {
                        name: "CompleteBlock",
                        doc: "A complete example block.",
                        required: false
                    }
                ]
            }]
        ]);

        // Returns the components
        return components;
    }
}