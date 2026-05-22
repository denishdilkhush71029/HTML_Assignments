// 🔥 Initialize Map
let map = L.map('map').setView([28.6139, 77.2090], 12);

// 🌍 OpenStreetMap layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let marker;
let placeMarkers = [];

// 📍 Map click event
map.on('click', function (e) {
    let lat = e.latlng.lat;
    let lng = e.latlng.lng;

    // Marker set karo
    if (marker) {
        marker.setLatLng(e.latlng);
    } else {
        marker = L.marker(e.latlng).addTo(map);
    }

    // Nearby places fetch karo
    getNearbyPlaces(lat, lng);
});

// 🌐 Fetch nearby places (Overpass API)
async function getNearbyPlaces(lat, lng) {

    let query = `
    [out:json];
    (
      node["amenity"="hospital"](around:3000, ${lat}, ${lng});
      node["amenity"="school"](around:3000, ${lat}, ${lng});
      node["shop"](around:3000, ${lat}, ${lng});
    );
    out;
    `;

    try {
        let response = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: query
        });

        let data = await response.json();

        displayPlaces(data.elements, lat, lng);

    } catch (error) {
        console.log("Error:", error);
    }
}

// 📋 Show places + markers
function displayPlaces(places, lat, lng) {

    let container = document.getElementById("nearby");
    container.innerHTML = "<b>Nearby Places:</b><br>";

    // Old markers remove
    placeMarkers.forEach(m => map.removeLayer(m));
    placeMarkers = [];

    if (places.length === 0) {
        container.innerHTML += "No places found";
        return;
    }

    places.forEach(place => {

        let name = place.tags?.name || "Unknown";
        let type = place.tags?.amenity || place.tags?.shop || "Place";

        // 📏 Distance calculate
        let distance = map.distance(
            [lat, lng],
            [place.lat, place.lon]
        ) / 1000;

        distance = distance.toFixed(2);

        // 📍 Marker icon
        let icon;

        if (type === "hospital") {
            icon = L.icon({
                iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                iconSize: [25, 25]
            });
        } 
        else if (type === "school") {
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

        // 📍 Marker add
        let m = L.marker([place.lat, place.lon], { icon: icon })
            .addTo(map)
            .bindPopup(`<b>${name}</b><br>${type}<br>Distance: ${distance} km`);

        placeMarkers.push(m);

        // 📋 List me show
        container.innerHTML += `
            <div>
                <b>${name}</b> (${type}) - ${distance} km
            </div>
        `;
    });
}