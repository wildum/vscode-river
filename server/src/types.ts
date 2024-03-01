type Component = {
    name: string;
    doc: string;
    hasLabel: boolean;
    arguments: Argument[];
    exports: Export[];
    blocks: Block[];
};

type Argument = {
    name: string;
    type: string;
    doc: string;
    required: boolean;
    default: any;
}

type Export = {
    name: string;
    type: string;
    doc: string;
    required: boolean;
    default: any;
}

type Block = {
    name: string;
    doc: string;
    required: boolean;
}