/* =========================
   Combined script:
   - Calculator / UI logic (unchanged)
   - p5.js rain sketch (user-provided)
   - Scroll reaction: hero transform + canvas parallax + topbar shrink
   ========================= */

/* ---------- Calculator & UI logic (unchanged) ---------- */
(function(){
  // DOM refs
  const form = document.getElementById('harvestForm');
  const roofEl = document.getElementById('roofArea');
  const unitEl = document.getElementById('areaUnit');
  const locationEl = document.getElementById('location');
  const membersEl = document.getElementById('members');
  const openSpaceEl = document.getElementById('openSpace');
  const effEl = document.getElementById('efficiency');
  const effVal = document.getElementById('effVal');
  const priceEl = document.getElementById('pricePerLiter');
  const useLocBtn = document.getElementById('useLocationBtn');
  const calcBtn = document.getElementById('calculateBtn');
  const clearBtn = document.getElementById('clearBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const resultToast = document.getElementById('resultToast');
  const resultContent = document.getElementById('resultContent');
  const closeResult = document.getElementById('closeResult');

  const cityData = [
    {name:"Delhi, India", lat:28.7041, lon:77.1025, rain:700},
    {name:"Mumbai, India", lat:19.0760, lon:72.8777, rain:2200},
    {name:"Kolkata, India", lat:22.5726, lon:88.3639, rain:1600},
    {name:"Chennai, India", lat:13.0827, lon:80.2707, rain:1400},
    {name:"Bengaluru, India", lat:12.9716, lon:77.5946, rain:900},
    {name:"Hyderabad, India", lat:17.3850, lon:78.4867, rain:800},
    {name:"Pune, India", lat:18.5204, lon:73.8567, rain:700},
    {name:"Ahmedabad, India", lat:23.0225, lon:72.5714, rain:650},
    {name:"Jaipur, India", lat:26.9124, lon:75.7873, rain:600},
    {name:"Lucknow, India", lat:26.8467, lon:80.9462, rain:1000},
    {name:"Patna, India", lat:25.5941, lon:85.1376, rain:1000},
    {name:"Bhopal, India", lat:23.2599, lon:77.4126, rain:1100}
  ];
  const monthlyPerc = [2,2,3,5,10,20,25,20,7,3,2,1];

  function sqftToSqm(sqft){ return sqft * 0.092903; }
  function litersToCubicM(liters){ return liters / 1000; }
  function comma(n){ return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function sum(arr){ return arr.reduce((a,b)=>a+b,0); }
  function haversine(lat1, lon1, lat2, lon2){
    const R = 6371; const toRad = x => x * Math.PI/180;
    const dLat = toRad(lat2-lat1); const dLon = toRad(lon2-lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
    return 2*R*Math.asin(Math.sqrt(a));
  }
  function nearestCity(lat, lon){
    let best = cityData[0]; let bestDist = haversine(lat, lon, best.lat, best.lon);
    for(let c of cityData){ const d = haversine(lat, lon, c.lat, c.lon); if (d < bestDist){ bestDist = d; best = c; } }
    return best;
  }

  let lastResult = null;
  function showResult(html){
    resultContent.innerHTML = html;
    resultToast.style.display = 'block';
    resultToast.setAttribute('aria-hidden','false');
  }
  function hideResult(){ resultToast.style.display = 'none'; resultToast.setAttribute('aria-hidden','true'); }
  closeResult.addEventListener('click', hideResult);
  effEl.addEventListener('input', ()=> effVal.textContent = effEl.value + '%');

  useLocBtn.addEventListener('click', async ()=>{
    if (!navigator.geolocation){ alert('Geolocation not supported by this browser.'); return; }
    useLocBtn.disabled = true; useLocBtn.textContent = 'Locating...';
    navigator.geolocation.getCurrentPosition(async (pos)=>{
      const {latitude:lat, longitude:lon} = pos.coords;
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
        const resp = await fetch(url, {headers:{'Accept':'application/json'}});
        if (!resp.ok) throw new Error('reverse geocode failed');
        const data = await resp.json();
        const address = data.address || {};
        const city = address.city || address.town || address.village || address.county || address.state;
        const cityName = city ? city + (address.state ? `, ${address.state}` : '') : null;
        if (cityName){
          let opt = Array.from(locationEl.options).find(o => o.text === cityName);
          if (!opt){ opt = new Option(cityName, cityName); locationEl.add(opt, 0); }
          locationEl.value = cityName;
        } else {
          const nearest = nearestCity(lat, lon);
          let opt = Array.from(locationEl.options).find(o => o.text === nearest.name);
          if (!opt){ opt = new Option(nearest.name, nearest.name); locationEl.add(opt, 0); }
          locationEl.value = nearest.name;
          alert(`Reverse geocode failed; using nearest dataset city: ${nearest.name}`);
        }
      } catch(e){
        const nearest = nearestCity(lat, lon);
        let opt = Array.from(locationEl.options).find(o => o.text === nearest.name);
        if (!opt){ opt = new Option(nearest.name, nearest.name); locationEl.add(opt, 0); }
        locationEl.value = nearest.name;
        alert(`Reverse geocode failed; using nearest dataset city: ${nearest.name}`);
      } finally {
        useLocBtn.disabled = false; useLocBtn.textContent = 'Use my location';
      }
    }, (err)=>{
      useLocBtn.disabled = false; useLocBtn.textContent = 'Use my location';
      alert('Location access denied or failed. Use Manual mode or enable location permission.');
    }, {timeout:15000});
  });

  function calculate(overrideLatitude=null, overrideLongitude=null){
    const roof = parseFloat(roofEl.value) || 0;
    const unit = unitEl.value; let areaSqm = 0;
    if (unit === 'sqft') areaSqm = sqftToSqm(roof); else areaSqm = roof;
    if (!areaSqm || areaSqm <= 0){ alert('Enter valid roof area.'); roofEl.focus(); return; }
    const members = parseInt(membersEl.value) || 0;
    if (!members || members <= 0){ if(!confirm('Household members not provided or zero. Continue?')) return; }
    const openSpace = parseFloat(openSpaceEl.value) || 0;
    const efficiency = parseFloat(effEl.value)/100;
    const pricePerLiter = parseFloat(priceEl.value) || 0.02;
    let selectedLocation = locationEl.value || '';
    let rainMm = 1000;
    if (selectedLocation){
      const match = cityData.find(c => c.name.toLowerCase() === selectedLocation.toLowerCase());
      if (match) rainMm = match.rain;
      else if (overrideLatitude && overrideLongitude){
        const nearest = nearestCity(overrideLatitude, overrideLongitude);
        rainMm = nearest.rain;
        selectedLocation = nearest.name + ' (nearest)';
      } else {
        const firstWord = selectedLocation.split(',')[0].trim().toLowerCase();
        const match2 = cityData.find(c => c.name.toLowerCase().includes(firstWord));
        if (match2) rainMm = match2.rain;
      }
    } else {
      if (overrideLatitude && overrideLongitude){
        const nearest = nearestCity(overrideLatitude, overrideLongitude);
        rainMm = nearest.rain;
        selectedLocation = nearest.name + ' (nearest)';
      } else selectedLocation = 'Unknown (default)';
    }

    const litersPerYear = areaSqm * rainMm * efficiency;
    const litersRounded = Math.round(litersPerYear);
    const cubicM = litersToCubicM(litersRounded);
    const dailyUsePerPerson = 135;
    const personDaysPerYear = members>0 ? Math.round(litersRounded / (members * dailyUsePerPerson)) : 'N/A';
    let storageSuggestion = '';
    if (openSpace >= 2000 || litersRounded > 500000) storageSuggestion = 'Consider large above-ground tanks (several m³) or multiple recharge pits.';
    else if (openSpace >= 500 || litersRounded > 100000) storageSuggestion = 'Consider mid-size modular tanks (5-20 m³) or combined recharge & storage.';
    else storageSuggestion = 'Limited space — consider underground tanks, modular tanks, or recharge pits.';
    const costSavings = Math.round(litersRounded * pricePerLiter);
    const totalPerc = sum(monthlyPerc);
    const monthlyLiters = monthlyPerc.map(p => Math.round(litersRounded * (p/totalPerc)));
    const htmlParts = [];
    htmlParts.push(`<strong>Location:</strong> ${selectedLocation}`);
    htmlParts.push(`<strong>Roof area:</strong> ${unit === 'sqft' ? roof + ' sq ft' : roof + ' m²'} (${Math.round(areaSqm)} m²)`);
    htmlParts.push(`<strong>Avg rainfall used:</strong> ${rainMm} mm/year`);
    htmlParts.push(`<strong>Collection efficiency:</strong> ${Math.round(efficiency*100)}%`);
    htmlParts.push(`<hr>`);
    htmlParts.push(`<strong>Annual harvest:</strong> ${comma(litersRounded)} L / year (~ ${cubicM.toFixed(2)} m³)`);
    htmlParts.push(`<strong>Potential supply:</strong> ${personDaysPerYear} person-days/year (assuming ${dailyUsePerPerson} L/day/person)`);
    htmlParts.push(`<strong>Estimated cost savings:</strong> ₹ ${comma(costSavings)}`);
    htmlParts.push(`<strong>Storage suggestion:</strong> ${storageSuggestion}`);
    htmlParts.push(`<hr><strong>Monthly breakdown (approx)</strong>`);
    let table = `<table class="monthly-table"><thead><tr><th>Month</th><th>Liters</th></tr></thead><tbody>`;
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    monthlyLiters.forEach((lit,i) => { table += `<tr><td>${monthNames[i]}</td><td>${comma(lit)} L</td></tr>`; });
    table += `</tbody></table>`;
    htmlParts.push(table);
    showResult(htmlParts.join(''));
    lastResult = {
      location: selectedLocation, roof, unit, areaSqm, rainMm, efficiency, litersRounded, cubicM, personDaysPerYear, costSavings, monthlyLiters
    };
  }

  calcBtn.addEventListener('click', async (e)=>{
    e.preventDefault();
    const method = document.querySelector('input[name="method"]:checked').value;
    if (method === 'manual'){
      calculate();
    } else {
      if (!navigator.geolocation){ alert('Geolocation not supported. Switch to Manual.'); return; }
      calcBtn.disabled = true; calcBtn.textContent = 'Locating...';
      navigator.geolocation.getCurrentPosition(async (pos)=>{
        const {latitude:lat, longitude:lon} = pos.coords;
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
          const resp = await fetch(url, {headers:{'Accept':'application/json'}});
          if (!resp.ok) throw new Error('reverse failed');
          const data = await resp.json();
          const address = data.address || {};
          const city = address.city || address.town || address.village || address.county || address.state;
          const cityName = city ? (city + (address.state ? `, ${address.state}` : '')) : null;
          if (cityName){
            let opt = Array.from(locationEl.options).find(o => o.text === cityName);
            if (!opt) opt = new Option(cityName, cityName), locationEl.add(opt, 0);
            locationEl.value = cityName;
            calculate(lat, lon);
          } else {
            const near = nearestCity(lat, lon);
            let opt = Array.from(locationEl.options).find(o => o.text === near.name);
            if (!opt) opt = new Option(near.name, near.name), locationEl.add(opt, 0);
            locationEl.value = near.name;
            calculate(lat, lon);
          }
        } catch(e){
          const near = nearestCity(lat, lon);
          let opt = Array.from(locationEl.options).find(o => o.text === near.name);
          if (!opt) opt = new Option(near.name, near.name), locationEl.add(opt, 0);
          locationEl.value = near.name;
          calculate(lat, lon);
        } finally {
          calcBtn.disabled = false; calcBtn.textContent = 'Calculate Water Harvesting Potential →';
        }
      }, (err)=>{
        calcBtn.disabled = false; calcBtn.textContent = 'Calculate Water Harvesting Potential →';
        alert('Location access denied or failed. Use Manual mode.');
      }, {timeout:15000});
    }
  });

  clearBtn.addEventListener('click', ()=>{
    form.reset();
    effVal.textContent = effEl.value + '%';
    hideResult();
  });

  downloadBtn.addEventListener('click', ()=>{
    if (!lastResult){ alert('No result to download. Run a calculation first.'); return; }
    const r = lastResult;
    let txt = `Rainwater Harvesting Result\n\nLocation: ${r.location}\nRoof area: ${r.unit === 'sqft' ? r.roof + ' sq ft' : r.roof + ' m²'} (${Math.round(r.areaSqm)} m²)\nAvg rainfall used: ${r.rainMm} mm/year\nCollection efficiency: ${Math.round(r.efficiency*100)}%\n\nAnnual harvest: ${comma(r.litersRounded)} L (~${r.cubicM.toFixed(2)} m³)\nPerson-days/year: ${r.personDaysPerYear}\nEstimated cost savings: ₹ ${comma(r.costSavings)}\n\nMonthly breakdown:\n`;
    r.monthlyLiters.forEach((lit,i)=>{ txt += `${i+1}. ${lit} L\n`; });
    const blob = new Blob([txt], {type:'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'rainwater_result.txt';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

})();

/* ---------- p5.js Rain sketch (user-provided code) ---------- */
/* I pasted your classes nearly exactly; they use createVector(), random(), etc.
   p5 will provide createCanvas and call setup()/draw() automatically. */

class Particle {
  constructor(x, y, vx, vy) {
    this.pos = createVector(x, y);
    this.vel = createVector(vx, vy);
    this.acc = createVector(0, -0.1);
    this.radius = 2;
  }

  draw() {
    noStroke();
    fill(255);
    ellipse(this.pos.x, height - this.pos.y, this.radius);
  }

  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
  }
}

class RainSplat {
  constructor(rainDrop) {
    this.particles = [];
    const numberOfParticles = 12;
    for (let i = 0; i < numberOfParticles; ++i) {
      const x = rainDrop.pos.x;
      const y = 0;
      const vx = random(-2, 2);
      const vy = random(0, -1 * rainDrop.vel.y/5);
      this.particles.push(new Particle(x, y, vx, vy));
    }
  }

  draw() {
    this.particles.forEach(particle => particle.draw());
  }

  update() {
    this.particles.forEach(particle => particle.update());
  }

  isVisible() {
    for (const particle of this.particles) {
      if (particle.pos.y + particle.radius > 0) {
        return true; 
      }
    }
    return false;
  }
}

class RainDrop {
  constructor() {
    this.reset();
    this.acc = createVector(0, -0.1);
    this.length = 30;
    this.width = 3;
  }

  draw() {
    noStroke();
    fill(255);
    rect(this.pos.x, height - this.pos.y, this.width, this.length);
  }

  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
  }

  hasHitFloor() {
    return this.pos.y - this.length <= 0
  }

  reset() {
    this.pos = createVector(random(width), random(height + 100, height + 1000));
    this.vel = createVector(0, random(-8, -3));
  }
}

class Rain {
  constructor(totalDrops) {
    this.rainDrops = [];
    for (let i = 0; i < totalDrops; ++i) {
      this.rainDrops.push(new RainDrop());
    }
    this.rainSplats = [];
  }

  draw() {
    this.rainDrops.forEach(rainDrop => rainDrop.draw());
    this.rainSplats.forEach(rainSplat => rainSplat.draw());
  }
  
  update() {
    this.rainDrops.forEach(rainDrop => rainDrop.update());
    this.rainSplats.forEach(rainSplat => rainSplat.update());
  }

  resolveCollisions() {
    this.rainDrops.forEach(rainDrop => {
      if (rainDrop.hasHitFloor()) {
        this.rainSplats.push(new RainSplat(rainDrop));
        rainDrop.reset();
      }
    });
  }

  cullSplats() {
    for (let i = this.rainSplats.length - 1; i >= 0; --i) {
      if (!this.rainSplats[i].isVisible()) {
        this.rainSplats.splice(i, 1);
      }
    }
  }
}

let rain;

function setup() {
  let cnv = createCanvas(windowWidth, windowHeight);
  cnv.style('z-index', '0'); // behind UI (which has z-index >= 5)
  rain = new Rain(80);
}

function draw() {
  // alpha 200 gives slight translucency so page background shows a bit through
  background(40, 40, 40, 200);
  rain.update();
  rain.resolveCollisions();
  rain.cullSplats();
  rain.draw();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

/* ---------- Scroll reaction: hero transform + canvas parallax + topbar shrink ---------- */
(function(){
  const heroInner = document.querySelector('.hero-inner');
  const topbar = document.querySelector('.topbar');
  const canvasEl = () => document.querySelector('canvas');

  let ticking = false;
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollY = window.scrollY || window.pageYOffset;
        // normalized 0..1 over 300px
        const n = Math.min(scrollY / 300, 1);

        // hero transform: small upward translate and tiny scale down
        const translateY = - (n * 20); // move up max 20px
        const scale = 1 - (n * 0.03);  // scale down to 0.97
        heroInner.style.transform = `translateY(${translateY}px) scale(${scale})`;

        // hero shadow + blur as we scroll a bit (subtle)
        heroInner.style.filter = `blur(${n * 0.2}px)`;
        heroInner.style.boxShadow = n > 0 ? '0 14px 40px rgba(0,0,0,0.45)' : '0 18px 50px rgba(0,0,0,0.5)';

        // topbar shrink effect
        if (n > 0.08) topbar.classList.add('shrink'); else topbar.classList.remove('shrink');

        // canvas parallax (moves slower than page)
        const cv = canvasEl();
        if (cv) {
          const par = -(scrollY * 0.18); // negative so background moves opposite direction slightly
          cv.style.transform = `translateY(${par}px)`;
        }

        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, {passive:true});
  // initial call so centered state applied when page loads
  onScroll();
})();
