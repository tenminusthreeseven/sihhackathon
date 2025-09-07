const container = document.getElementById('container');
const rainCount = 50;  // Adjust as needed

for (let i = 0; i < rainCount; i++) {
    const rain = document.createElement('div');
    rain.className = 'rain';

    // Random horizontal position (0 to 100%)
    const xPos = Math.random() * 100;

    // Random animation duration and delay
    const duration = (Math.random() * 2 + 1) + 's';  // Between 1s and 3s
    const delay = Math.random() * 5 + 's';          // Between 0s and 5s

    rain.style.setProperty('--x-position', `${xPos}vw`);
    rain.style.setProperty('--duration', duration);
    rain.style.setProperty('--delay', delay);

    rain.innerHTML = `
        <div class="drop"></div>
        <div class="waves">
            <div></div>
            <div></div>
        </div>
        <div class="splash"></div>
        <div class="particles">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
        </div>
    `;

    container.appendChild(rain);
}
