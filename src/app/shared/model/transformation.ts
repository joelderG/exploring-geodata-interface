import * as THREE from 'three';

export interface Transformation {
    scale: THREE.Vector3,
    rotation: THREE.Quaternion,
    translation: THREE.Vector3
}
