// 🌍 Initialize Map (Centered to New Delhi)
let map = L.map('map').setView([28.6139, 77.2090], 12);

// 🗺️ OpenStreetMap Layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let marker;
let radiusCircle;  // Visual Radius Circle Variable
let placeMarkers = [];
let allFetchedPlaces = []; // Tab filters ke liye data backup
let currentLat, currentLng;

// 📍 Map click event
map.on('click', function (e) {
    currentLat = e.latlng.lat;
    currentLng = e.latlng.lng;

    updateMainMarker(currentLat, currentLng);
    fetchDataAndAnalyze();
});

// 🔍 Search Bar Function (Address to Coordinates)
async function searchAddress() {
    let query = document.getElementById("addressInput").value;
    let resultPara = document.getElementById("result");

    if (!query) {
        alert("Please enter an address first!");
        return;
    }

    resultPara.style.color = "orange";
    resultPara.innerHTML = "Searching location...";

    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;

    try {
        let response = await fetch(url);
        let data = await response.json();

        if (data.length === 0) {
            resultPara.style.color = "red";
            resultPara.innerHTML = "❌ Location not found. Try typing city or area name.";
            return;
        }

        currentLat = parseFloat(data[0].lat);
        currentLng = parseFloat(data[0].lon);

        map.setView([currentLat, currentLng], 14);
        updateMainMarker(currentLat, currentLng);
        
        resultPara.style.color = "green";
        resultPara.innerHTML = `📍 Found: <b>${data[0].display_name}</b>`;

        fetchDataAndAnalyze();

    } catch (error) {
        console.error("Search Error:", error);
        resultPara.style.color = "red";
        resultPara.innerHTML = "Something went wrong while searching.";
    }
}

// 🔵 Main Marker aur Visual Radius Circle ko update karne ka function
function updateMainMarker(lat, lng) {
    let radius = parseInt(document.getElementById("radiusSelect").value);

    // Main Location Marker Set/Move karein
    if (marker) {
        marker.setLatLng([lat, lng]);
    } else {
        marker = L.marker([lat, lng]).addTo(map);
    }

    // 🔵 Visual Radius Circle Set/Move karein
    if (radiusCircle) {
        map.removeLayer(radiusCircle);
    }
    radiusCircle = L.circle([lat, lng], {
        color: '#007bff',
        fillColor: '#3186cc',
        fillOpacity: 0.15,
        radius: radius
    }).addTo(map);
}

// 🌐 Combined Data Fetcher (FIXED QUERY FOR ACCURATE HOSPITALS, SCHOOLS & ALL SHOPS)
async function fetchDataAndAnalyze() {
    let radius = document.getElementById("radiusSelect").value;
    let container = document.getElementById("nearby");
    container.innerHTML = "Fetching nearby analytical data...";

    // Is query me shops, local marketplaces aur commercial buildings sabhi ko shamil kiya gaya hai
    let query = `
    [out:json][timeout:30];
    (
      node["amenity"="hospital"](around:${radius}, ${currentLat}, ${currentLng});
      node["amenity"="school"](around:${radius}, ${currentLat}, ${currentLng});
      node["amenity"="college"](around:${radius}, ${currentLat}, ${currentLng});
      node["shop"](around:${radius}, ${currentLat}, ${currentLng});
      node["amenity"="marketplace"](around:${radius}, ${currentLat}, ${currentLng});
      
      way["amenity"="hospital"](around:${radius}, ${currentLat}, ${currentLng});
      way["amenity"="school"](around:${radius}, ${currentLat}, ${currentLng});
      way["amenity"="college"](around:${radius}, ${currentLat}, ${currentLng});
      way["shop"](around:${radius}, ${currentLat}, ${currentLng});
      way["landuse"="commercial"](around:${radius}, ${currentLat}, ${currentLng});
    );
    out center;
    `;

    try {
        let response = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: query
        });
        
        let data = await response.json();
        
        // Data Formatting: Ways aur Nodes dono ko standard format me convert karte hain
        allFetchedPlaces = data.elements.map(element => {
            return {
                lat: element.lat || element.center?.lat,
                lon: element.lon || element.center?.lon,
                tags: element.tags
            };
        }).filter(el => el.lat && el.lon); // Sirf valid coordinates wale sthan rakhein

        // Display everything and calculate score
        displayPlaces(allFetchedPlaces);
        calculateLivabilityScore(allFetchedPlaces);

    } catch (error) {
        console.error("API Error:", error);
        container.innerHTML = "Error updating data. Please try again.";
    }
}

// 📋 Places ko UI aur Map par render karna
function displayPlaces(places) {
    let container = document.getElementById("nearby");
    container.innerHTML = "";

    // Old markers map se clear karo
    placeMarkers.forEach(m => map.removeLayer(m));
    placeMarkers = [];

    if (places.length === 0) {
        container.innerHTML = "No points found for selected filter.";
        return;
    }

    places.forEach(place => {
        let name = place.tags?.name || "Unnamed Infrastructure";
        let type = place.tags?.amenity || place.tags?.shop || (place.tags?.landuse === "commercial" ? "Commercial Area" : "Place");

        // Distance Calculation
        let distance = map.distance([currentLat, currentLng], [place.lat, place.lon]) / 1000;
        distance = distance.toFixed(2);

        // Marker color dynamically decide hoga
        let markerClass = "shop-marker"; // Default shop color
        if (type === "hospital") markerClass = "hospital-marker";
        if (type === "school" || type === "college") markerClass = "school-marker";

        let customIcon = L.divIcon({ className: markerClass, iconSize: [12, 12] });

        // Add Marker on Map
        let m = L.marker([place.lat, place.lon], { icon: customIcon })
            .addTo(map)
            .bindPopup(`<b>${name}</b> (${type})<br>Distance: ${distance} km`);

        placeMarkers.push(m);

        // UI List Card rendering setup
        let isSchoolTab = (type === 'school' || type === 'college');
        let borderLeftColor = (type === 'hospital') ? '#dc3545' : isSchoolTab ? '#007bff' : '#28a745';
        
        container.innerHTML += `
            <div class="place-card" style="border-left: 5px solid ${borderLeftColor}">
                <strong>${name}</strong> <span style="text-transform: capitalize; color:#666;">(${type})</span><br>
                <small>Distance: ${distance} km</small>
            </div>
        `;
    });
}

// 🗂️ Category Filtering (Tabs Logic)
function filterCategory(category) {
    // Active class button color toggle karne ke liye
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    if (category === 'all') {
        displayPlaces(allFetchedPlaces);
    } else {
        let filtered = allFetchedPlaces.filter(place => {
            let type = place.tags?.amenity || place.tags?.shop || (place.tags?.landuse === "commercial" ? "commercial" : "");
            
            if (category === 'school') {
                return type === 'school' || type === 'college'; // School tab dono dikhayega
            }
            if (category === 'shop') {
                return type !== 'hospital' && type !== 'school' && type !== 'college' && type !== ''; // Shops/Commercials filter
            }
            return type === category;
        });
        displayPlaces(filtered);
    }
}

// 📊 Core Analysis: Livability & Rating Score Algorithm
function calculateLivabilityScore(places) {
    let hospitals = places.filter(p => p.tags?.amenity === 'hospital').length;
    let schools = places.filter(p => p.tags?.amenity === 'school' || p.tags?.amenity === 'college').length;
    let shops = places.filter(p => p.tags?.shop || p.tags?.amenity === 'marketplace' || p.tags?.landuse === 'commercial').length;

    // Logic: Base score calculation (Max 100)
    let score = 0;
    if (hospitals > 0) score += 35; // Healthcare cover
    if (schools > 0) score += 35;   // Education cover
    if (shops > 0) score += 30;     // Market cover

    // Multi-facility bonus
    if (hospitals > 1) score += 5;
    if (schools > 1) score += 5;
    
    if (score > 100) score = 100;
    if (places.length === 0) score = 0;

    // Dashboard UI text changes
    document.getElementById("livabilityScore").innerHTML = score + "%";
    
    let ratingStr = "";
    if (score >= 80) ratingStr = "⭐⭐⭐⭐⭐ Excellent";
    else if (score >= 60) ratingStr = "⭐⭐⭐⭐ Developed";
    else if (score >= 40) ratingStr = "⭐⭐⭐ Moderate";
    else if (score >= 10) ratingStr = "⭐⭐ Developing";
    else ratingStr = "⭐ Underdeveloped";

    document.getElementById("areaRating").innerHTML = ratingStr;
}

// 📝 Detailed Analysis Button Click Handler
function analyze() {
    let resultPara = document.getElementById("result");
    if (!currentLat) {
        resultPara.innerHTML = "❌ Please select a location on the map or search first!";
        resultPara.style.color = "red";
        return;
    }
    resultPara.style.color = "green";
    resultPara.innerHTML = `✅ Total Indicators Analysed: <b>${allFetchedPlaces.length}</b> within selected boundary. Property is suitable for dynamic investment.`;
}