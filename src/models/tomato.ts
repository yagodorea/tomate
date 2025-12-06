import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

// Default timer value in minutes
export const DEFAULT_MINUTES = 25;

// Convert minutes to rotation angle (radians)
export function minutesToRotation(minutes: number): number {
    return (minutes / 60) * Math.PI * 2;
}

export class PomodoroTomato {
    public group: THREE.Group;
    public upperHalf: THREE.Group;
    public lowerHalf: THREE.Group;
    public isLoaded: boolean = false;

    private topMesh: THREE.Mesh | null = null;
    private bottomMesh: THREE.Mesh | null = null;

    constructor() {
        this.group = new THREE.Group();
        this.upperHalf = new THREE.Group();
        this.lowerHalf = new THREE.Group();

        this.group.add(this.lowerHalf);
        this.group.add(this.upperHalf);
    }

    public async load(): Promise<void> {
        const loader = new STLLoader();

        // Tomato material
        const tomatoMaterial = new THREE.MeshStandardMaterial({
            color: 0xe74c3c,
            roughness: 0.3,
            metalness: 0.05
        });

        // Load bottom half
        const bottomGeometry = await loader.loadAsync('/assets/pomodoro_bottom_v01.stl');
        bottomGeometry.computeVertexNormals();
        this.bottomMesh = new THREE.Mesh(bottomGeometry, tomatoMaterial);
        this.bottomMesh.castShadow = true;
        this.bottomMesh.receiveShadow = true;
        this.lowerHalf.add(this.bottomMesh);

        // Load top half
        const topGeometry = await loader.loadAsync('/assets/pomodoro_top_v01.stl');
        topGeometry.computeVertexNormals();
        this.topMesh = new THREE.Mesh(topGeometry, tomatoMaterial.clone());
        this.topMesh.castShadow = true;
        this.topMesh.receiveShadow = true;
        this.upperHalf.add(this.topMesh);

        // Center horizontally but stack vertically
        this.centerAndStackGeometry(bottomGeometry, 'bottom');
        this.centerAndStackGeometry(topGeometry, 'top');

        // Scale to reasonable size (adjust as needed based on your STL units)
        // TODO: scale should be based on viewport size, so the tomato takes up most of the screen
        const scale = 2.5; // Adjust this based on your STL size
        this.group.scale.set(scale, scale, scale);

        // Rotate to correct orientation (STL may have different up axis)
        this.group.rotation.x = -Math.PI / 2;
        this.group.rotation.z = -Math.PI / 2;

        // Set initial rotation to default minutes (25)
        this.lowerHalf.rotation.z = minutesToRotation(DEFAULT_MINUTES);

        this.isLoaded = true;
        console.log('STL models loaded successfully');
    }

    private centerAndStackGeometry(geometry: THREE.BufferGeometry, part: 'top' | 'bottom'): void {
        geometry.computeBoundingBox();
        const boundingBox = geometry.boundingBox!;
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);

        // Center horizontally (X and Z), but position vertically based on part
        geometry.translate(0, 0, center.z * (part === 'top' ? 0.01 : -0.01));
    }

    public rotateUpperHalf(angle: number): void {
        this.upperHalf.rotation.z = angle;
    }

    public getRotation(): number {
        return this.upperHalf.rotation.z;
    }
}
