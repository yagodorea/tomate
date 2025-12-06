import { SceneManager } from './components/scene';
import { PomodoroTomato, DEFAULT_MINUTES, minutesToRotation } from './models/tomato';
import { DragController } from './utils/raycaster';

// Lerp function for smooth animation
function lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
}

// Animation state
let targetRotation: number | null = null;
const LERP_SPEED = 0.08; // Adjust for faster/slower animation

// Timer state
let timerInterval: number | null = null;
let remainingSeconds: number = 0;
let isRunning: boolean = false;

// Audio state
const STORAGE_KEY_SOUND = 'pomodoro-alarm-sound';
const STORAGE_KEY_VOLUME = 'pomodoro-alarm-volume';
const DEFAULT_SOUND = 'phone_ring.mp3';
const DEFAULT_VOLUME = 0.7; // 70%
let currentAudio: HTMLAudioElement | null = null;

// Format seconds as MM:SS
function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Get saved sound preference from localStorage
function getSavedSound(): string {
    return localStorage.getItem(STORAGE_KEY_SOUND) || DEFAULT_SOUND;
}

// Save sound preference to localStorage
function saveSound(sound: string): void {
    localStorage.setItem(STORAGE_KEY_SOUND, sound);
}

// Get saved volume from localStorage
function getSavedVolume(): number {
    const saved = localStorage.getItem(STORAGE_KEY_VOLUME);
    return saved ? parseFloat(saved) : DEFAULT_VOLUME;
}

// Save volume to localStorage
function saveVolume(volume: number): void {
    localStorage.setItem(STORAGE_KEY_VOLUME, volume.toString());
}

// Play alarm sound
function playAlarmSound(soundFile: string, volume?: number): void {
    stopAlarmSound(); // Stop any currently playing sound
    currentAudio = new Audio(`/src/assets/${soundFile}`);
    currentAudio.volume = volume !== undefined ? volume : getSavedVolume();
    currentAudio.play().catch(err => console.error('Error playing sound:', err));
}

// Stop alarm sound
function stopAlarmSound(): void {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
}

async function init() {
    // Get canvas element
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (!canvas) {
        throw new Error('Canvas element not found');
    }

    // Initialize scene manager
    const sceneManager = new SceneManager(canvas);

    // Create and load pomodoro tomato
    const tomato = new PomodoroTomato();
    await tomato.load();
    sceneManager.scene.add(tomato.group);

    // Setup drag controller for interaction
    new DragController(tomato, sceneManager.camera, canvas);

    // Reset button handler
    const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (isRunning) return; // Don't allow reset while running

            // Animate tomato rotation to default minutes
            targetRotation = minutesToRotation(DEFAULT_MINUTES);

            // Reset timer display
            const timeDisplay = document.getElementById('time-value');
            if (timeDisplay) {
                timeDisplay.textContent = DEFAULT_MINUTES.toString();
            }
        });
    }

    // Preset buttons handler
    const presetBtns = document.querySelectorAll('.preset-btn');
    const timeDisplay = document.getElementById('time-value');

    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isRunning) return; // Don't allow preset changes while running

            const minutes = parseInt(btn.getAttribute('data-minutes') || '25', 10);

            // Set target rotation for smooth animation
            targetRotation = minutesToRotation(minutes);

            // Update timer display
            if (timeDisplay) {
                timeDisplay.textContent = minutes.toString();
            }
        });
    });

    // Start/Stop button handlers
    const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
    const stopBtn = document.getElementById('stop-btn') as HTMLButtonElement;

    function startTimer() {
        if (isRunning) return;

        // Get current minutes from display
        const currentMinutes = parseInt(timeDisplay?.textContent || '25', 10);
        remainingSeconds = currentMinutes * 60;

        isRunning = true;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        resetBtn.disabled = true;

        // Disable preset buttons
        presetBtns.forEach(btn => (btn as HTMLButtonElement).disabled = true);

        // Disable dragging by adding a class
        canvas.classList.add('timer-running');

        // Start countdown
        timerInterval = window.setInterval(() => {
            remainingSeconds--;

            // Update display
            if (timeDisplay) {
                timeDisplay.textContent = formatTime(remainingSeconds);
            }

            // Update tomato rotation based on remaining time
            const totalMinutes = currentMinutes;
            const elapsedMinutes = totalMinutes - (remainingSeconds / 60);
            targetRotation = minutesToRotation(totalMinutes - elapsedMinutes);

            // Timer complete
            if (remainingSeconds <= 0) {
                stopTimer();
                onTimerComplete();
            }
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }

        // Stop any playing alarm
        stopAlarmSound();

        isRunning = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        resetBtn.disabled = false;

        // Re-enable preset buttons
        presetBtns.forEach(btn => (btn as HTMLButtonElement).disabled = false);

        // Re-enable dragging
        canvas.classList.remove('timer-running');
    }

    function onTimerComplete() {
        // Play alarm sound
        const selectedSound = (document.getElementById('sound-select') as HTMLSelectElement)?.value || DEFAULT_SOUND;
        playAlarmSound(selectedSound);

        // Flash the display or show completion
        if (timeDisplay) {
            timeDisplay.textContent = '0:00';
            timeDisplay.style.animation = 'pulse 0.5s ease-in-out 3';
            setTimeout(() => {
                timeDisplay.style.animation = '';
                timeDisplay.textContent = DEFAULT_MINUTES.toString();
                targetRotation = minutesToRotation(DEFAULT_MINUTES);
            }, 2000);
        }
    }

    startBtn?.addEventListener('click', startTimer);
    stopBtn?.addEventListener('click', stopTimer);

    // Sound selector handlers
    const soundSelect = document.getElementById('sound-select') as HTMLSelectElement;
    const testSoundBtn = document.getElementById('test-sound-btn');
    const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
    const volumeValue = document.getElementById('volume-value');

    // Load saved sound preference
    if (soundSelect) {
        soundSelect.value = getSavedSound();

        soundSelect.addEventListener('change', () => {
            saveSound(soundSelect.value);
        });
    }

    // Load saved volume
    if (volumeSlider && volumeValue) {
        const savedVolume = getSavedVolume();
        volumeSlider.value = (savedVolume * 100).toString();
        volumeValue.textContent = `${Math.round(savedVolume * 100)}%`;

        volumeSlider.addEventListener('input', () => {
            const volume = parseInt(volumeSlider.value, 10) / 100;
            volumeValue.textContent = `${Math.round(volume * 100)}%`;
            saveVolume(volume);
        });
    }

    // Test sound button
    testSoundBtn?.addEventListener('click', () => {
        const volume = volumeSlider ? parseInt(volumeSlider.value, 10) / 100 : getSavedVolume();
        playAlarmSound(soundSelect?.value || DEFAULT_SOUND, volume);
    });

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);

        // Smooth rotation animation
        if (targetRotation !== null) {
            const currentRotation = tomato.lowerHalf.rotation.z;
            const newRotation = lerp(currentRotation, targetRotation, LERP_SPEED);

            // Stop animating when close enough
            if (Math.abs(newRotation - targetRotation) < 0.001) {
                tomato.lowerHalf.rotation.z = targetRotation;
                targetRotation = null;
            } else {
                tomato.lowerHalf.rotation.z = newRotation;
            }
        }

        sceneManager.render();
    }

    // Start animation
    animate();

    console.log('Pomodoro Timer initialized with STL models');
}

init().catch(console.error);
