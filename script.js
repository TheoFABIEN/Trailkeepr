// =========================
// MAP INITIALISATION
// =========================

var map = L.map('map').setView([45.924, 6.868], 9);

var hikesLayer = L.layerGroup().addTo(map);
var gpxLayer = L.layerGroup().addTo(map);
var climbingLayer = L.layerGroup().addTo(map);

L.tileLayer(
'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
).addTo(map);

// =========================
// GEOLOCATION
// =========================

function locateUser() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                map.setView([latitude, longitude], 9);
            }
        );
    } else {
        alert("The browser does not support geolocation.")
    }
}
window.onload = locateUser;

// =========================
// ICONS
// =========================

const orangeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
const violetIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});


// =========================
// LOAD HIKES
// =========================

function loadHikes() {

  const difficulty = document.getElementById("difficulty").value;
  const gaz = document.getElementById("gaz").value;

  let url = "http://localhost:8000/hikes?";

  if (difficulty) url += `difficulty=${difficulty}&`;
  if (gaz) url += `gaz=${gaz}&`;

  fetch(url)
  .then(res => res.json())
  .then(data => {

    hikesLayer.clearLayers();

    data.forEach(hike => {

      L.marker([hike.lat, hike.lon])
      .addTo(hikesLayer)
      .bindPopup(`
        <div class="popup-content">
          <b>${hike.name}</b><br>
          ${hike.notes || ""}
          <br><br>
          <button class="popup-delete" 
          onclick="deleteItem('hikes', ${hike.id}, loadHikes)">🗑</button>
        </div>
      `);
    });
  });
}


// =========================
// LOAD CLIMBING SPOTS
// =========================

function loadClimbingSpots() {

  fetch("http://localhost:8000/climbing_spots")
  .then(res => res.json())
  .then(data => {

    climbingLayer.clearLayers();

    data.forEach(spot => {

      const geom = JSON.parse(spot.geom);

      const layer = L.geoJSON(geom, {color: "orange"})
      .addTo(climbingLayer);

      const center = layer.getBounds().getCenter();

      L.marker(center, {icon: orangeIcon})
      .addTo(climbingLayer)
      .bindPopup(`
        <div class="popup-content">
          <b>${spot.name}</b><br>
          ${spot.notes || ""}
          <br><br>
          <button class="popup-delete" 
          onclick="deleteItem('climbing_spots', ${spot.id}, loadClimbingSpots)">🗑</button>
        </div>
      `);
    });
  });
}


// =========================
// LOAD GPX FILE
// =========================

function loadGPXHikes() {
  fetch("http://localhost:8000/gpx_hikes")
    .then(res => res.json())
    .then(data => {
      gpxLayer.clearLayers();

      data.forEach(hike => {
        const geom = JSON.parse(hike.geom);

        const line = L.geoJSON(geom, {
          color: "purple",
          weight: 4
        }).addTo(gpxLayer);

        // Get the center of the line
        const center = line.getBounds().getCenter();

        // Add a marker at the center
        L.marker(center, { icon: violetIcon })
          .addTo(gpxLayer)
          .bindPopup(`
            <div class="popup-content">
              <b>${hike.name}</b><br>
              ${hike.notes || ""}
              <br><br>
              <button class="popup-delete" 
              onclick="deleteItem('gpx_hikes', ${hike.id}, loadGPXHikes)">🗑</button>
            </div>
        `);
      });
    });
}


// =========================
// INITIAL LOAD
// =========================

loadHikes();
loadClimbingSpots();
loadGPXHikes();


// =========================
// FILTERS
// =========================

document.getElementById("applyFilters")
.addEventListener("click", loadHikes);

document.getElementById("toggleHikes")
.addEventListener("change", function() {
  this.checked ? map.addLayer(hikesLayer) : map.removeLayer(hikesLayer);
});
document.getElementById("toggleGPX")
.addEventListener("change", function() {
  this.checked ? map.addLayer(gpxLayer) : map.removeLayer(gpxLayer);
});
document.getElementById("toggleClimbing")
.addEventListener("change", function() {
  this.checked ? map.addLayer(climbingLayer) : map.removeLayer(climbingLayer);
});


// =========================
// DELETE ITEM
// =========================

function deleteItem(type, id, reloadFunction) {

  if (!confirm(`Delete this ${type}?`)) return;

  fetch(`http://localhost:8000/${type}/${id}`, { method: "DELETE" })
    .then(res => res.json())
    .then(() => {
      alert(`${type} deleted`);
      reloadFunction();
    })
    .catch(err => console.error(err));
}


// =========================
// ADD HIKE MODE
// =========================

let addingMode = false;

document.getElementById("startAdd").addEventListener("click", () => {

  const type = document.getElementById("newType").value;

  if (type !== "hike") {
    alert("Pour les spots d'escalade, utilise l'outil polygon.");
    return;
  }

  addingMode = true;

  map.getContainer().style.cursor = "crosshair";

  alert("Click on the map to add a hike");

});


// =========================
// MAP CLICK EVENT
// =========================

map.on("click", function(e) {

  if (!addingMode) return;

  const lat = e.latlng.lat;
  const lon = e.latlng.lng;

  console.log("Map click:", lat, lon);

  const name = prompt("Name of the hike ?");
  if (!name) {
    addingMode = false;
    map.getContainer().style.cursor = "";
    return;
  }

  const notes = prompt("Notes ?") || "";

  const difficultyInput = prompt("Difficulty (1-5) ?");
  const difficulty = difficultyInput ? parseInt(difficultyInput) : null;

  const gazInput = prompt("Exposure to void ? (yes/no)");
  const gaz = gazInput ? gazInput.toLowerCase() === "yes" : null;

  const payload = {
    name: name,
    difficulty: difficulty,
    gaz: gaz,
    notes: notes,
    lat: lat,
    lon: lon
  };

  console.log("Sending:", payload);

  fetch("http://localhost:8000/add_hike", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(data => {

    console.log("API response:", data);

    alert("Hike added!");

    loadHikes();

    addingMode = false;
    map.getContainer().style.cursor = "";

  })
  .catch(err => console.error("API error:", err));

});


// =========================
// DRAW CLIMBING SPOTS
// =========================

var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

var drawControl = new L.Control.Draw({
  draw: {
    polygon: true,
    polyline: false,
    rectangle: false,
    circle: false,
    marker: false
  },
  edit: {
    featureGroup: drawnItems
  }
});

map.addControl(drawControl);

map.on(L.Draw.Event.CREATED, function (event) {

  var layer = event.layer;

  drawnItems.addLayer(layer);

  const geojson = layer.toGeoJSON();

  const name = prompt("Name of the spot ?");
  const notes = prompt("Notes ?");

  fetch("http://localhost:8000/add_climbing_spot", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: name,
      notes: notes,
      geometry: geojson.geometry
    })
  })
  .then(res => res.json())
  .then(() => {

    alert("Spot ajouté !");

    loadClimbingSpots();

  });

});


// =========================
// SEND GPX FILE
// =========================

document.getElementById("uploadGPX").addEventListener("click", () => {

  const fileInput = document.getElementById("gpxFile");

  if (!fileInput.files.length) {
    alert("Select a GPX file first");
    return;
  }

  const name = prompt("Name of the GPX track ?");
  const notes = prompt("Notes ?") || "";

  const difficultyInput = prompt("Difficulty (1-5) ?");
  const difficulty = difficultyInput ? parseInt(difficultyInput) : null;

  const gazInput = prompt("Exposure to void ? (yes/no)");
  const gaz = gazInput ? gazInput.toLowerCase() === "yes" : null;

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);
  formData.append("name", name);
  formData.append("notes", notes);
  formData.append("difficulty", difficulty);
  formData.append("gaz", gaz);

  fetch("http://localhost:8000/upload_gpx", {
    method: "POST",
    body: formData
  })
  .then(res => res.json())
  .then(() => {
    alert("GPX imported!");
    loadGPXHikes();
  });
});
