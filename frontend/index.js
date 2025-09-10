document.getElementById('tokenButton').addEventListener('click', function(event) {
    console.log('Token Exchange form button clicked.');
});

document.getElementById('calculatorButton').addEventListener('click', function(event) {
    console.log('Navigating to calculator.html');
});

const container = document.getElementById('rainContainer');
const rainCount = 50;

for (let i = 0; i < rainCount; i++) {
    const rain = document.createElement('div');
    rain.className = 'rain';

    const xPos = Math.random() * 100;
    const duration = (Math.random() * 2 + 1) + 's';
    const delay = Math.random() * 5 + 's';

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
