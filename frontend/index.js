/* app.js - simple client-side logic for the demo
   - small rainfall presets for demo cities
   - compute collected rainwater (L) = roofArea(m2) * rainfall(mm) * efficiency%
   - size a recharge pit for a design storm event
   - provide simple suggested dimensions and cost estimate
*/

document.addEventListener("DOMContentLoaded", () => {
  // UI references
  const modal = document.getElementById("feasibilityModal");
  const checkBtn = document.getElementById("checkBtn");
  const checkBtn2 = document.getElementById("checkBtn2");
  const closeModal = document.getElementById("closeModal");
  const resetFormBtn = document.getElementById("resetForm");
  const computeBtn = document.getElementById("computeBtn");
  const resultsOut = document.getElementById("results");
  const form = document.getElementById("feasibilityForm");
  const yearSpan = document.getElementById("year");
  const openLang = document.getElementById("openLang");
  const cityInput = document.getElementById("cityInput");

  // Preset average annual rainfall (mm) for demo cities (approx)
  // These are for demo only and not authoritative. Replace with GIS API when available.
  const cityRainfall = {
    "delhi": {annual: 790, monsoon: 600},
    "mumbai": {annual: 2400, monsoon: 2100},
    "chennai": {annual: 1400, monsoon: 600},
    "kolkata": {annual: 1600, monsoon: 1300},
    "bangalore": {annual: 900, monsoon: 600},
    "default": {annual: 800, monsoon: 500}
  };

  // Simple cost assumptions (demo)
  const costPerCubicMeter = 3500; // INR per m3 for simple recharge pit construction (indicative)
  const waterValuePerLiter = 0.03; // INR per liter (indicative savings value)

  // Set year in footer
  yearSpan.textContent = new Date().getFullYear();

  // Open modal handlers
  [checkBtn, checkBtn2].forEach(btn => btn && btn.addEventListener("click", () => {
    if (typeof modal.showModal === "function") {
      modal.showModal();
      resultsOut.innerHTML = `<em>Enter inputs and click Compute. This is a demo; no data leaves your browser.</em>`;
    } else {
      // fallback
      alert("Your browser does not support modal(). The form will open in a new window.");
    }
  }));

  // Close
  closeModal.addEventListener("click", () => modal.close());

  // Reset
  resetFormBtn.addEventListener("click", () => {
    form.reset();
    resultsOut.innerHTML = "";
  });

  // Language toggle (simple demo: toggles Hindi/English short labels)
  let lang = "en";
  openLang.addEventListener("click", (e) => {
    e.preventDefault();
    if (lang === "en") {
      lang = "hi";
      // Minimal demo: translate a few labels
      document.querySelector(".hero-title").textContent = "अपने छत की वर्षा जल संचयन क्षमता जानीए";
      document.querySelector(".hero-sub").textContent = "सिंपल इनपुट से आरटीआरडब्ल्यूएच और आर्टिफ़िशियल रिचार्ज का त्वरित आकलन।";
      openLang.textContent = "English / हिन्दी";
    } else {
      lang = "en";
      document.querySelector(".hero-title").textContent = "Calculate your\nrooftop's potential for";
      document.querySelector(".hero-sub").textContent = "Quick on-spot assessment for Rooftop Rainwater Harvesting (RTRWH) and Artificial Recharge (AR) using simple inputs and smart rules of thumb.";
      openLang.textContent = "हिन्दी / English";
    }
  });

  // Main compute logic
  computeBtn.addEventListener("click", (ev) => {
    ev.preventDefault();

    // get values
    const data = new FormData(form);
    const name = (data.get("name") || "").trim();
    const cityRaw = (data.get("location") || "").trim().toLowerCase();
    const dwellers = Math.max(1, Number(data.get("dwellers") || 1));
    const roofArea = Number(data.get("roofArea") || 0);
    const openSpace = Number(data.get("openSpace") || 0);
    const roofType = data.get("roofType");
    const efficiency = Number(data.get("efficiency") || 85);
    const designStorm = Number(data.get("designStorm") || 50);

    // basic validation
    if (!roofArea || roofArea <= 0) {
      resultsOut.innerHTML = `<b style="color:var(--danger)">Please enter a valid roof area (m²).</b>`;
      return;
    }
    if (openSpace < 0) {
      resultsOut.innerHTML = `<b style="color:var(--danger)">Open space cannot be negative.</b>`;
      return;
    }

    // rainfall selection
    const cityKey = cityRaw in cityRainfall ? cityRaw : (Object.keys(cityRainfall).includes(cityRaw) ? cityRaw : "default");
    const rainfall = cityRainfall[cityKey] || cityRainfall["default"];
    const avgAnnual = rainfall.annual; // mm/year
    const monsoon = rainfall.monsoon; // mm/monsoon season

    // Collection: liters = roofArea(m2) * rainfall(mm) * efficiency%
    // Because 1 mm on 1 m2 = 1 liter
    const collectedAnnualLiters = roofArea * avgAnnual * (efficiency / 100);
    const collectedAnnualM3 = collectedAnnualLiters / 1000;

    // For design storm sizing: event liters = roofArea * designStorm * efficiency%
    const eventLiters = roofArea * designStorm * (efficiency / 100);
    const eventM3 = eventLiters / 1000;

    // Estimate runoff coefficient (rough) by roof type
    let runoffCoeff = 0.9;
    if (roofType === "tile") runoffCoeff = 0.85;
    if (roofType === "green") runoffCoeff = 0.6;
    if (roofType === "metal") runoffCoeff = 0.95;

    // Suggest recharge pit/trench sizing
    // Assume effective void space (available infiltration) factor ~ 0.25 (25%) for simple fill media.
    const infiltrationFactor = 0.25;
    // required pit volume (m3) to capture design event:
    const requiredPitVolume = eventM3 / infiltrationFactor; // m3
    // Practical depth between 1m - 3m. Choose depth based on open space.
    let suggestedDepth = 1.2;
    if (openSpace >= 30) suggestedDepth = 1.5;
    if (openSpace >= 60) suggestedDepth = 2.0;
    if (openSpace >= 150) suggestedDepth = 2.5;

    // compute footprint area for pit (m2) = volume / depth
    const pitFootprint = requiredPitVolume / suggestedDepth; // m2

    // If footprint fits in open space (with margin), ok; else suggest multiple pits or trenches.
    const footprintOK = pitFootprint <= Math.max(0, openSpace * 0.6); // allow 60% of open space

    // Cost estimate (very indicative)
    const estCostINR = Math.max(0, requiredPitVolume) * costPerCubicMeter;

    // Household water demand estimate (simple): assume 135 liters per person per day (urban average)
    const dailyPerCapita = 135;
    const annualDemandLiters = dwellers * dailyPerCapita * 365;

    // Percent of household demand met by collected water
    const percentDemandMet = (collectedAnnualLiters / annualDemandLiters) * 100;

    // Simple payback: value of water saved per year
    const annualWaterValueINR = collectedAnnualLiters * waterValuePerLiter;
    const paybackYears = estCostINR / (annualWaterValueINR || 1);

    // Prepare suggestions text
    const pitDimensionsText = `
      <strong>Design storm capture (event ${designStorm} mm):</strong>
      <ul>
        <li>Runoff from roof for event: <strong>${numberWithCommas(Math.round(eventLiters))} L</strong> (${round(eventM3,2)} m³)</li>
        <li>Estimated required pit volume (accounting infiltration factor ${Math.round(infiltrationFactor*100)}%): <strong>${round(requiredPitVolume,2)} m³</strong></li>
        <li>Suggested pit depth: <strong>${suggestedDepth} m</strong></li>
        <li>Estimated pit footprint area: <strong>${round(pitFootprint,2)} m²</strong> (${footprintOK ? 'fits likely' : 'too large for provided open space — consider multiple pits / trenches or increasing open space'})</li>
      </ul>`;

    // Other suggested structures
    let structureSuggestion = '';
    if (openSpace < 5) {
      structureSuggestion = `<li>Use rooftop cisterns / tanks (rain barrels) or percolation pits within plot boundary.</li>`;
    } else if (!footprintOK) {
      structureSuggestion = `<li>Consider multiple smaller recharge pits or permeable trenches placed along drainage path.</li>`;
    } else {
      structureSuggestion = `<li>A single recharge pit of the suggested size or a trench (if linear open space) is feasible.</li>`;
    }

    // Output HTML
    const html = `
      <div>
        <p><strong>Hello</strong> ${escapeHtml(name || "User")} — summary for <strong>${escapeHtml(cityRaw || "your location")}</strong></p>

        <h4>Annual results</h4>
        <ul>
          <li>Average annual rainfall used: <strong>${avgAnnual} mm</strong>.</li>
          <li>Estimated annual collectable rainwater: <strong>${numberWithCommas(Math.round(collectedAnnualLiters))} L</strong> (~<strong>${round(collectedAnnualM3,2)} m³</strong>).</li>
          <li>Estimated household annual demand: <strong>${numberWithCommas(Math.round(annualDemandLiters))} L</strong>.</li>
          <li>Percent of household demand met by collected rainwater: <strong>${round(percentDemandMet,1)}%</strong>.</li>
        </ul>

        ${pitDimensionsText}

        <h4>Suggested structures & notes</h4>
        <ul>
          ${structureSuggestion}
          <li>Suggested structure types: <strong>Recharge pit / trench / shaft</strong> depending on subsoil & groundwater depth (use local geotechnical/advisory input before construction).</li>
          <li>Roof type runoff coefficient used: <strong>${runoffCoeff}</strong>.</li>
        </ul>

        <h4>Costs & payback (indicative)</h4>
        <ul>
          <li>Indicative construction cost: <strong>₹ ${numberWithCommas(Math.round(estCostINR))}</strong> (approx; depends on local rates).</li>
          <li>Estimated annual value of collected water: <strong>₹ ${numberWithCommas(Math.round(annualWaterValueINR))}</strong>.</li>
          <li>Simple payback: <strong>${isFinite(paybackYears) ? round(paybackYears,1) : "—" } years</strong> (very indicative).</li>
        </ul>

        <h4>Next steps</h4>
        <ol>
          <li>Get local rainfall & hydrogeology data (CGWB / municipal datasets) for precise sizing.</li>
          <li>Perform soil infiltration tests and check depth-to-water before designing pits or shafts.</li>
          <li>Use certified local contractor and follow CGWB / IS code guidelines for detailed design.</li>
        </ol>

        <p style="color:var(--muted);font-size:0.9rem;margin-top:0.6rem;">
          <strong>Disclaimer:</strong> This is a simplified on-spot estimate for demonstration only. Replace presets and assumptions with GIS, borehole, and soil test data for final design.
        </p>
      </div>
    `;

    resultsOut.innerHTML = html;
  });

  // util helpers
  function round(v, d=2){ return Math.round(v*(10**d))/(10**d); }
  function numberWithCommas(x){
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  function escapeHtml(str){
    return str.replace(/[&<>"']/g, tag => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[tag]));
  }

  // close modal if user clicks outside (for browsers supporting dialog)
  modal.addEventListener('click', (e) => {
    const rect = modal.getBoundingClientRect();
    const isInDialog = (
      e.clientX >= rect.left && e.clientX <= rect.right &&
      e.clientY >= rect.top && e.clientY <= rect.bottom
    );
    if (!isInDialog && typeof modal.close === "function") {
      modal.close();
    }
  });

  // simple accessibility: close on Escape
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.open) modal.close();
  });
});
