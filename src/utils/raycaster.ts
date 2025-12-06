import * as THREE from 'three';
import { PomodoroTomato } from '../models/tomato';

export class DragController {
    private raycaster: THREE.Raycaster;
    private mouse: THREE.Vector2;
    private isDragging: boolean = false;
    private previousMouseX: number = 0;
    private tomato: PomodoroTomato;
    private camera: THREE.Camera;
    private canvas: HTMLCanvasElement;

    constructor(tomato: PomodoroTomato, camera: THREE.Camera, canvas: HTMLCanvasElement) {
        this.tomato = tomato;
        this.camera = camera;
        this.canvas = canvas;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));

        // Touch events for mobile
        this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
    }

    private updateMouse(clientX: number, clientY: number): void {
        this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    }

    private onMouseDown(event: MouseEvent): void {
        this.updateMouse(event.clientX, event.clientY);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Check if we're clicking on the lower half
        const intersects = this.raycaster.intersectObject(this.tomato.lowerHalf, true);

        if (intersects.length > 0) {
            this.isDragging = true;
            this.previousMouseX = event.clientX;
            this.canvas.style.cursor = 'grabbing';
        }
    }

    private onMouseMove(event: MouseEvent): void {
        if (!this.isDragging) {
            // Check for hover effect
            this.updateMouse(event.clientX, event.clientY);
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObject(this.tomato.lowerHalf, true);

            if (intersects.length > 0) {
                this.canvas.style.cursor = 'grab';
            } else {
                this.canvas.style.cursor = 'default';
            }
            return;
        }

        // Calculate horizontal drag distance
        const deltaX = event.clientX - this.previousMouseX;
        this.previousMouseX = event.clientX;

        // Convert to rotation (sensitivity adjustment)
        const rotationDelta = (deltaX / window.innerWidth) * Math.PI * 2;

        // Apply rotation to lower half only (Z axis due to parent group rotations)
        const currentRotation = this.tomato.lowerHalf.rotation.z;
        this.tomato.lowerHalf.rotation.z = currentRotation + rotationDelta;

        // Update minutes based on rotation
        // The pointer is at 0 degrees (front), so we calculate minutes based on where the markers align
        const normalizedRotation = ((this.tomato.lowerHalf.rotation.z % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        // Convert rotation to minutes: full rotation (2π) = 60 minutes
        const minutes = Math.round((normalizedRotation / (Math.PI * 2)) * 60);

        // Update UI display
        const timeDisplay = document.getElementById('time-value');
        if (timeDisplay) {
            timeDisplay.textContent = (minutes === 0 ? 60 : minutes).toString();
        }
    }

    private onMouseUp(): void {
        this.isDragging = false;
        this.canvas.style.cursor = 'default';
    }

    private onTouchStart(event: TouchEvent): void {
        if (event.touches.length === 1) {
            event.preventDefault();
            const touch = event.touches[0];
            this.updateMouse(touch.clientX, touch.clientY);
            this.raycaster.setFromCamera(this.mouse, this.camera);

            const intersects = this.raycaster.intersectObject(this.tomato.lowerHalf, true);

            if (intersects.length > 0) {
                this.isDragging = true;
                this.previousMouseX = touch.clientX;
            }
        }
    }

    private onTouchMove(event: TouchEvent): void {
        if (!this.isDragging || event.touches.length !== 1) return;

        event.preventDefault();
        const touch = event.touches[0];
        const deltaX = touch.clientX - this.previousMouseX;
        this.previousMouseX = touch.clientX;

        const rotationDelta = (deltaX / window.innerWidth) * Math.PI * 2;
        const currentRotation = this.tomato.lowerHalf.rotation.z;
        this.tomato.lowerHalf.rotation.z = currentRotation + rotationDelta;

        const normalizedRotation = ((this.tomato.lowerHalf.rotation.z % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const minutes = Math.round((normalizedRotation / (Math.PI * 2)) * 60);

        const timeDisplay = document.getElementById('time-value');
        if (timeDisplay) {
            timeDisplay.textContent = (minutes === 0 ? 60 : minutes).toString();
        }
    }

    private onTouchEnd(): void {
        this.isDragging = false;
    }

    public dispose(): void {
        this.canvas.removeEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.removeEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.removeEventListener('mouseleave', this.onMouseUp.bind(this));
        this.canvas.removeEventListener('touchstart', this.onTouchStart.bind(this));
        this.canvas.removeEventListener('touchmove', this.onTouchMove.bind(this));
        this.canvas.removeEventListener('touchend', this.onTouchEnd.bind(this));
    }
}
