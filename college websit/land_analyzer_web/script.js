// Initialize Map
let map = L.map('map').setView([28.6139, 77.2090], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Marker variable
let marker;

// Map click event
map.on('click', function(e) {
    if (marker) {
        marker.setLatLng(e.latlng);
    } else {
        marker = L.marker(e.latlng).addTo(map);
    }
});

// 🔥 Function to get real nearby places + show markers
async function getNearbyPlaces(lat, lng) {
    let url = `https://overpass-api.de/api/interpreter?data=
    [out:json];
    (
      node["amenity"="hospital"](around:3000,${lat},${lng});
      node["shop"](around:3000,${lat},${lng});
      node["amenity"="school"](around:3000,${lat},${lng});
    );
    out;`;

    let response = await fetch(url);
    let data = await response.json();

    // 🧹 Remove old markers
    if (window.placeMarkers) {
        window.placeMarkers.forEach(m => map.removeLayer(m));
    }
    window.placeMarkers = [];
    document.getElementById("placesList").innerHTML = "<b>Nearby Places:</b><br>";
    

    // 📍 Add new markers with name
   data.elements.forEach(place => {
    document.getElementById("placesList").innerHTML += `
    <div class="place-card" onclick="zoomToPlace(${place.lat}, ${place.lon})">
        <b>${name}</b><br>
        Distance: ${distance} km
    </div>
`;
   let name = place.tags?.name || "Unknown Place";

// 📏 Distance calculation
let distance = map.distance(
    [lat, lng],
    [place.lat, place.lon]
) / 1000;

distance = distance.toFixed(2);
    let icon;

    if (place.tags?.amenity === "hospital") {
        icon = L.icon({
            iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
            iconSize: [25, 25]
        });
    } 
    else if (place.tags?.amenity === "school") {
        icon = L.icon({
            iconUrl: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
            iconSize: [25, 25]
        });
    } 
    else {
        icon = L.icon({
            iconUrl: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
            iconSize: [25, 25]
        });
    }

    let m = L.marker([place.lat, place.lon], { icon: icon })
        .addTo(map)
        .bindPopup(`${name}<br>Distance: ${distance} km`);

    window.placeMarkers.push(m);
});
    return data.elements.length;
}

// 🚀 Analyze function
async function analyze() {
    if (!marker) {
        document.getElementById("result").innerText =
            "Please select location first!";
        return;
    }

    let lat = marker.getLatLng().lat;
    let lng = marker.getLatLng().lng;

    document.getElementById("result").innerText = "Analyzing...";

    try {
        let count = await getNearbyPlaces(lat, lng);

        let score = 0;

if (count > 20) score = 9;
else if (count > 10) score = 7;
else score = 4;

let result = `⭐ Land Score: ${score}/10\n`;

if (score >= 8) {
    result += "🔥 Excellent Location";
} else if (score >= 6) {
    result += "👍 Good Location";
} else {
    result += "⚠ Developing Area";
}

        if (count > 20) {
            result = "🔥 Excellent Location (High facilities nearby)";
        } else if (count > 10) {
            result = "👍 Good Location";
        } else {
            result = "⚠ Developing Area";
        }

        document.getElementById("result").innerText = result;

    } catch (error) {
        document.getElementById("result").innerText =
            "Error fetching data. Check internet!";
    }
}
function zoomToPlace(lat, lng) {
    map.setView([lat, lng], 16); // zoom level 16
}