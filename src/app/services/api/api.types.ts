export interface MetaData {
    classes: number[],
    class_info: ClassInfo[];
    shape: number[],
    x_coords: number[],
    y_coords: number[],
    z_coords: number[]
}

export interface ClassInfo {
    id: string,
    name: string
}

export interface Volume {
    data: number[][][]
}
