export interface MetaData {
    classes: number[],
    shape: number[],
    x_coords: number[],
    y_coords: number[],
    z_coords: number[]
}

export interface Slice {
    z_index: number,
    z_val: number,
    data: number[][]
}

export interface Volume {
    data: number[][][]
}