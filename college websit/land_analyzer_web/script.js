/**
 * Advanced Land Analyzer Application
 * Production-ready version with error handling, validation, and best practices
 */

const LandAnalyzer = (() => {
    'use strict';

    // Configuration
    const CONFIG = {
        DEFAULT_LAT: 28.6139,
        DEFAULT_LNG: 77.2090,
        DEFAULT_ZOOM: 12,
        API_TIMEOUT: 15000, // 15 seconds timeout
        NOMINATIM_API: 'https://nominatim.openstreetmap.org/search',
        OVERPASS_API: 'https://overpass-api.de/api/interpreter',
        MIN_SEARCH_LENGTH: 2,
        DEBOUNCE_DELAY: 300
    };

    // State management
    const state = {
        map: null,
        marker: null,
        radiusCircle: null,
        placeMarkers: [],
        allFetchedPlaces: [],
        currentLat: null,
        currentLng: null,
        isLoading: false,
        searchTimeout: null
    };

    /**
     * Initialize the application
     */
    function init() {
        try {
            initMap();
            setupEventListeners();
            logMessage('Application initialized successfully', 'info');
        } catch (error) {
            logMessage('Initialization failed: ' + error.message, 'error');
            console.error('Initialization error:', error);
        }
    }

    /**
     * Initialize Leaflet map
     */
    function initMap() {
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            throw new Error('Map container not found');
        }

        state.map = L.map('map').setView([CONFIG.DEFAULT_LAT, CONFIG.DEFAULT_LNG], CONFIG.DEFAULT_ZOOM);

        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(state.map);

        // Add map click listener
        state.map.on('click', handleMapClick);
    }

    /**
     * Setup all event listeners
     */
    function setupEventListeners() {
        const searchForm = document.getElementById('searchForm');
        const radiusSelect = document.getElementById('radiusSelect');
        const analyzeBtn = document.getElementById('analyzeBtn');
        const tabButtons = document.querySelectorAll('.tab-btn');

        if (searchForm) {
            searchForm.addEventListener('submit', handleSearchSubmit);
        }

        if (radiusSelect) {
            radiusSelect.addEventListener('change', handleRadiusChange);
        }

        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', handleAnalyzeClick);
        }

        // Setup tab button delegation
        tabButtons.forEach(btn => {
            btn.addEventListener('click', handleTabClick);
        });
    }

    /**
     * Handle search form submission
     */
    function handleSearchSubmit(e) {
        e.preventDefault();
        const addressInput = document.getElementById('addressInput');
        
        if (!addressInput || !validateSearchInput(addressInput.value)) {
            showStatus('Please enter a valid address (at least 2 characters)', 'error');
            return;
        }

        searchAddress(addressInput.value);
    }

    /**
     * Validate search input
     */
    function validateSearchInput(query) {
        return query && query.trim().length >= CONFIG.MIN_SEARCH_LENGTH;
    }

    /**
     * Handle map click event
     */
    function handleMapClick(e) {
        state.currentLat = e.latlng.lat;
        state.currentLng = e.latlng.lng;

        updateMainMarker(state.currentLat, state.currentLng);
        fetchDataAndAnalyze();
    }

    /**
     * Handle radius change
     */
    function handleRadiusChange() {
        if (state.currentLat && state.currentLng) {
            updateMainMarker(state.currentLat, state.currentLng);
            fetchDataAndAnalyze();
        }
    }

    /**
     * Handle analyze button click
     */
    function handleAnalyzeClick() {
        if (!state.currentLat || !state.currentLng) {
            showStatus('Please select a location on the map or search first', 'error');
            return;
        }

        if (state.allFetchedPlaces.length === 0) {
            showStatus('No data available for analysis', 'warning');
            return;
        }

        const message = `✅ Total Indicators Analysed: <b>${state.allFetchedPlaces.length}</b> within selected boundary. Property is suitable for dynamic investment.`;
        showStatus(message, 'success');
    }

    /**
     * Handle tab button click with proper event delegation
     */
    function handleTabClick(e) {
        const button = e.currentTarget;
        const category = button.getAttribute('data-category');

        if (!category) {
            console.warn('No category attribute found on tab button');
            return;
        }

        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
        });
        button.classList.add('active');
        button.setAttribute('aria-selected', 'true');

        filterCategory(category);
    }

    /**
     * Search for address using Nominatim API with timeout
     */
    async function searchAddress(query) {
        if (state.isLoading) return;

        state.isLoading = true;
        showStatus('Searching location...', 'loading');

        try {
            const url = new URL(CONFIG.NOMINATIM_API);
            url.searchParams.append('q', query);
            url.searchParams.append('format', 'json');
            url.searchParams.append('limit', '1');

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);

            const response = await fetch(url.toString(), {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json'
                }
            });

            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            if (!data || data.length === 0) {
                showStatus('❌ Location not found. Try typing city or area name.', 'error');
                state.isLoading = false;
                return;
            }

            const result = data[0];
            state.currentLat = parseFloat(result.lat);
            state.currentLng = parseFloat(result.lon);

            if (isNaN(state.currentLat) || isNaN(state.currentLng)) {
                throw new Error('Invalid coordinates received');
            }

            state.map.setView([state.currentLat, state.currentLng], 14);
            updateMainMarker(state.currentLat, state.currentLng);

            showStatus(`📍 Found: <b>${escapeHtml(result.display_name)}</b>`, 'success');
            await fetchDataAndAnalyze();

        } catch (error) {
            if (error.name === 'AbortError') {
                showStatus('Search timed out. Please try again.', 'error');
            } else {
                console.error('Search error:', error);
                showStatus('Error searching location. Please try again.', 'error');
            }
        } finally {
            state.isLoading = false;
        }
    }

    /**
     * Update main marker and radius circle on map
     */
    function updateMainMarker(lat, lng) {
        if (!state.map) return;

        const radius = parseInt(document.getElementById('radiusSelect')?.value || 3000);

        // Update or create main marker
        if (state.marker) {
            state.marker.setLatLng([lat, lng]);
        } else {
            state.marker = L.marker([lat, lng], {
                title: 'Selected Location'
            }).addTo(state.map);
        }

        // Update or create radius circle
        if (state.radiusCircle) {
            state.map.removeLayer(state.radiusCircle);
        }

        state.radiusCircle = L.circle([lat, lng], {
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.15,
            radius: radius,
            weight: 2
        }).addTo(state.map);
    }

    /**
     * Fetch data from Overpass API
     */
    async function fetchDataAndAnalyze() {
        if (!state.currentLat || !state.currentLng || state.isLoading) return;

        state.isLoading = true;
        const container = document.getElementById('nearby');
        if (container) {
            container.innerHTML = '<p>Fetching nearby analytical data...</p>';
        }

        try {
            const radius = document.getElementById('radiusSelect')?.value || 3000;

            const query = `
                [out:json][timeout:15];
                (
                    node["amenity"="hospital"](around:${radius}, ${state.currentLat}, ${state.currentLng});
                    node["amenity"="school"](around:${radius}, ${state.currentLat}, ${state.currentLng});
                    node["amenity"="college"](around:${radius}, ${state.currentLat}, ${state.currentLng});
                    node["shop"](around:${radius}, ${state.currentLat}, ${state.currentLng});
                    node["amenity"="marketplace"](around:${radius}, ${state.currentLat}, ${state.currentLng});
                    
                    way["amenity"="hospital"](around:${radius}, ${state.currentLat}, ${state.currentLng});
                    way["amenity"="school"](around:${radius}, ${state.currentLat}, ${state.currentLng});
                    way["amenity"="college"](around:${radius}, ${state.currentLat}, ${state.currentLng});
                    way["shop"](around:${radius}, ${state.currentLat}, ${state.currentLng});
                    way["landuse"="commercial"](around:${radius}, ${state.currentLat}, ${state.currentLng});
                );
                out center;
            `;

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);

            const response = await fetch(CONFIG.OVERPASS_API, {
                method: 'POST',
                body: query,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'text/plain'
                }
            });

            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`Overpass API error: ${response.status}`);
            }

            const data = await response.json();

            if (!data.elements || !Array.isArray(data.elements)) {
                throw new Error('Invalid API response format');
            }

            // Process fetched places
            state.allFetchedPlaces = data.elements
                .map(element => ({
                    lat: element.lat || element.center?.lat,
                    lon: element.lon || element.center?.lon,
                    tags: element.tags || {}
                }))
                .filter(el => el.lat && el.lon && !isNaN(el.lat) && !isNaN(el.lon));

            displayPlaces(state.allFetchedPlaces);
            calculateLivabilityScore(state.allFetchedPlaces);

            logMessage(`Fetched ${state.allFetchedPlaces.length} places`, 'info');

        } catch (error) {
            if (error.name === 'AbortError') {
                showStatus('Data fetch timed out. Please try again.', 'error');
            } else {
                console.error('Fetch error:', error);
                showStatus('Error fetching data. Please try again.', 'error');
            }
        } finally {
            state.isLoading = false;
        }
    }

    /**
     * Display places on map and in list
     */
    function displayPlaces(places) {
        const container = document.getElementById('nearby');
        if (!container) return;

        // Clear old markers
        state.placeMarkers.forEach(marker => {
            if (state.map) {
                state.map.removeLayer(marker);
            }
        });
        state.placeMarkers = [];
        container.innerHTML = '';

        if (!places || places.length === 0) {
            container.innerHTML = '<p>No points found for selected filter.</p>';
            return;
        }

        const fragment = document.createDocumentFragment();

        places.forEach(place => {
            try {
                const name = place.tags?.name || 'Unnamed Infrastructure';
                const type = place.tags?.amenity || place.tags?.shop || 
                           (place.tags?.landuse === 'commercial' ? 'Commercial Area' : 'Place');

                // Calculate distance
                const distance = (state.map.distance([state.currentLat, state.currentLng], 
                                [place.lat, place.lon]) / 1000).toFixed(2);

                // Determine marker class
                let markerClass = 'shop-marker';
                if (type === 'hospital') markerClass = 'hospital-marker';
                if (type === 'school' || type === 'college') markerClass = 'school-marker';

                const customIcon = L.divIcon({
                    className: markerClass,
                    iconSize: [12, 12]
                });

                // Add marker to map
                const marker = L.marker([place.lat, place.lon], { icon: customIcon })
                    .addTo(state.map)
                    .bindPopup(`<b>${escapeHtml(name)}</b><br>(${escapeHtml(type)})<br>Distance: ${distance} km`);

                state.placeMarkers.push(marker);

                // Create list card
                const card = document.createElement('div');
                card.className = 'place-card';
                card.innerHTML = `
                    <strong>${escapeHtml(name)}</strong> 
                    <span style="text-transform: capitalize; color:#666;">(${escapeHtml(type)})</span><br>
                    <small>Distance: ${distance} km</small>
                `;
                fragment.appendChild(card);

            } catch (error) {
                console.error('Error displaying place:', error);
            }
        });

        container.appendChild(fragment);
    }

    /**
     * Filter places by category
     */
    function filterCategory(category) {
        let filtered = state.allFetchedPlaces;

        if (category !== 'all') {
            filtered = state.allFetchedPlaces.filter(place => {
                const type = place.tags?.amenity || place.tags?.shop || 
                           (place.tags?.landuse === 'commercial' ? 'commercial' : '');

                if (category === 'school') {
                    return type === 'school' || type === 'college';
                }
                if (category === 'shop') {
                    return type !== 'hospital' && type !== 'school' && 
                          type !== 'college' && type !== '';
                }
                return type === category;
            });
        }

        displayPlaces(filtered);
    }

    /**
     * Calculate livability score
     */
    function calculateLivabilityScore(places) {
        if (!places || places.length === 0) {
            updateScoreDisplay(0, '⭐ Underdeveloped');
            return;
        }

        const hospitals = places.filter(p => p.tags?.amenity === 'hospital').length;
        const schools = places.filter(p => 
            p.tags?.amenity === 'school' || p.tags?.amenity === 'college'
        ).length;
        const shops = places.filter(p => 
            p.tags?.shop || p.tags?.amenity === 'marketplace' || 
            p.tags?.landuse === 'commercial'
        ).length;

        // Calculate score
        let score = 0;
        if (hospitals > 0) score += 35;
        if (schools > 0) score += 35;
        if (shops > 0) score += 30;

        // Bonus for multiple facilities
        if (hospitals > 1) score += 5;
        if (schools > 1) score += 5;

        score = Math.min(score, 100);

        // Determine rating
        let rating = '⭐ Underdeveloped';
        if (score >= 80) rating = '⭐⭐⭐⭐⭐ Excellent';
        else if (score >= 60) rating = '⭐⭐⭐⭐ Developed';
        else if (score >= 40) rating = '⭐⭐⭐ Moderate';
        else if (score >= 10) rating = '⭐⭐ Developing';

        updateScoreDisplay(score, rating);
    }

    /**
     * Update score display
     */
    function updateScoreDisplay(score, rating) {
        const scoreElement = document.getElementById('livabilityScore');
        const ratingElement = document.getElementById('areaRating');

        if (scoreElement) {
            scoreElement.textContent = score + '%';
        }
        if (ratingElement) {
            ratingElement.textContent = rating;
        }
    }

    /**
     * Show status message
     */
    function showStatus(message, type = 'info') {
        const resultElement = document.getElementById('result');
        if (!resultElement) return;

        resultElement.innerHTML = message;
        resultElement.className = 'result-' + type;
        
        // Map type to color
        const colorMap = {
            'success': '#10b981',
            'error': '#ef4444',
            'warning': '#f59e0b',
            'loading': '#3b82f6',
            'info': '#6b7280'
        };

        resultElement.style.color = colorMap[type] || colorMap['info'];
    }

    /**
     * Log message (for debugging)
     */
    function logMessage(message, level = 'log') {
        console.log(`[${level.toUpperCase()}] ${message}`);
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Public API
     */
    return {
        init: init
    };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', LandAnalyzer.init);
} else {
    LandAnalyzer.init();
}
