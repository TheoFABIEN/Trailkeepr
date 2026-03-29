let layersLoaded = 0;
const TOTAL_LAYERS = 3;

// =========================
// MAP INITIALISATION
// =========================

var map = L.map('map', {
    zoomControl: false
});
L.control.zoom({
  position: 'topright'
}).addTo(map);

var pointsLayer = L.layerGroup().addTo(map);
var gpxLayer = L.layerGroup().addTo(map);
var areasLayer = L.layerGroup().addTo(map);

L.tileLayer(
'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
).addTo(map);

function fitMapToData() {
  const allLayers = [];
  pointsLayer.eachLayer(layer => allLayers.push(layer));
  gpxLayer.eachLayer(layer => allLayers.push(layer));
  areasLayer.eachLayer(layer => allLayers.push(layer));
  if (allLayers.length === 0) {
    // fallback
    map.setView([45.924, 6.868], 6);
    return;
  }
  const group = L.featureGroup(allLayers);
  map.fitBounds(group.getBounds(), { padding: [50, 50] });
}

function checkAllLoaded() {
  if (layersLoaded === TOTAL_LAYERS) {
    fitMapToData();
    layersLoaded = 0;
  }
}


// =========================
// RESPONSIVE MODE
// =========================

let isMobile = false;
let isSidebarVisible = false;
const mobileToggle = document.getElementById("mobileToggle");

function updateResponsiveMode() {
  const wasMobile = isMobile;
  isMobile = window.matchMedia("(max-width: 768px)").matches;

  if (isMobile) {
    document.body.classList.add("mobile-mode");

    if (!wasMobile) {
      isSidebarVisible = false;
      document.body.classList.remove("sidebar-open");
    }

  } else {
    document.body.classList.remove("mobile-mode");
    document.body.classList.remove("sidebar-open");

    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }
  updateLeafletControlsVisibility();
}

mobileToggle.addEventListener("click", () => {
  isSidebarVisible = !isSidebarVisible;

  if (isSidebarVisible) {
    document.body.classList.add("sidebar-open");
  } else {
    document.body.classList.remove("sidebar-open");

    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }
  updateLeafletControlsVisibility();
});

function updateLeafletControlsVisibility() {
  const controls = document.querySelectorAll(
    ".leaflet-control-container"
  );

  controls.forEach(ctrl => {
    if (isMobile && isSidebarVisible) {
      ctrl.style.display = "none";
    } else {
      ctrl.style.display = "";
    }
  });
}
window.addEventListener("resize", updateResponsiveMode);

updateResponsiveMode();


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
  iconAnchor: [12, 41],
  popupAnchor: [0, -34]
});
const violetIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -34]
});


// =========================
// LOAD POINTS
// =========================

function loadPoints() {

  let url = "http://localhost:8000/points?";
  fetch(url)
  .then(res => res.json())
  .then(data => {

    pointsLayer.clearLayers();

    data.forEach(point => {

      L.marker([point.lat, point.lon])
      .addTo(pointsLayer)
      .bindPopup(`
        <div class="popup-content">
          <b>${point.name}</b><br>
          ${point.notes || ""}
          <br><br>
          <button class="popup-delete" 
          onclick="deleteItem('points', ${point.id}, loadPoints)">🗑</button>
        </div>
      `);
    });
  layersLoaded++;
  checkAllLoaded();
  });
}


// =========================
// LOAD AREAS
// =========================

function loadAreas() {

  fetch("http://localhost:8000/areas")
  .then(res => res.json())
  .then(data => {

    areasLayer.clearLayers();

    data.forEach(area => {

      const geom = JSON.parse(area.geom);
      const layer = L.geoJSON(geom, {color: "orange"}).addTo(areasLayer);
      const center = layer.getBounds().getCenter();

      L.marker(center, {icon: orangeIcon})
      .addTo(areasLayer)
      .bindPopup(`
        <div class="popup-content">
          <b>${area.name}</b><br>
          ${area.notes || ""}
          <br><br>
          <button class="popup-delete" 
          onclick="deleteItem('areas', ${area.id}, loadAreas)">🗑</button>
        </div>
      `);
    });
  layersLoaded++;
  checkAllLoaded();
  });
}


// =========================
// LOAD GPX FILE
// =========================

function loadGPXHikes() {
  const difficulty = document.getElementById("difficulty").value;
  const gaz = document.getElementById("gaz").value;

  const maxDistance = parseFloat(distanceSlider.value);
  const isUnlimited = maxDistance === parseFloat(distanceSlider.max);

  let url = "http://localhost:8000/gpx_hikes?";
  if (difficulty) url += `difficulty=${difficulty}&`;
  if (gaz) url += `gaz=${gaz}&`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      gpxLayer.clearLayers();
      data.forEach(hike => {
        const distance = hike.distance_km;
        if (distance == null) return;
        if (!isUnlimited && distance > maxDistance) return;
        const geom = JSON.parse(hike.geom);
        const line = L.geoJSON(geom, {
          color: "purple",
          weight: 4
        }).addTo(gpxLayer);
        const center = line.getBounds().getCenter();

        L.marker(center, { icon: violetIcon })
          .addTo(gpxLayer)
          .bindPopup(`
            <div class="popup-content">
              <b>${hike.name}</b><br>
              ${hike.notes || ""}
              <br><br>
              <div class="popup-footer">
                <div class="popup-stats">
                  ${hike.distance_km ? hike.distance_km + " km" : ""}
                  ${hike.elevation_gain ? " | " 
                    + "<span class='arrow-up'>↗</span> " 
                    + hike.elevation_gain + " m" : ""}
                  ${hike.elevation_loss ? " | " 
                    + "<span class='arrow-down'>↘</span> " 
                    + hike.elevation_loss + " m" : ""}
                </div>
                <button class="popup-delete"
                onclick="deleteItem('gpx_hikes', ${hike.id}, loadGPXHikes)">🗑</button>
              </div>
            </div>
          `);
      });
      layersLoaded++;
      checkAllLoaded();
  });
}


// =========================
// FILTERS
// =========================

const distanceSlider = document.getElementById("distanceSlider");
const distanceLabel = document.getElementById("distanceValue");

function updateDistanceLabel() {
  const value = parseInt(distanceSlider.value);

  if (value === parseInt(distanceSlider.max)) {
    distanceLabel.textContent = value + "+ km";
  } else {
    distanceLabel.textContent = value + " km";
  }
}

distanceSlider.addEventListener("input", updateDistanceLabel);
distanceSlider.addEventListener("change", loadGPXHikes);
updateDistanceLabel();

document.getElementById("applyFilters")
.addEventListener("click", loadGPXHikes);

document.getElementById("togglePoints")
.addEventListener("change", function() {
  this.checked ? map.addLayer(pointsLayer) : map.removeLayer(pointsLayer);
});
document.getElementById("toggleGPX")
.addEventListener("change", function() {
  this.checked ? map.addLayer(gpxLayer) : map.removeLayer(gpxLayer);
});
document.getElementById("toggleAreas")
.addEventListener("change", function() {
  this.checked ? map.addLayer(areasLayer) : map.removeLayer(areasLayer);
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

  if (type !== "point") {
    alert("For areas, use the polygon tool.");
    return;
  }

  addingMode = true;

  map.getContainer().style.cursor = "crosshair";

  alert("Click on the map to add a point");

});


// =========================
// MAP CLICK EVENT
// =========================

map.on("click", function(e) {

  if (!addingMode) return;

  const lat = e.latlng.lat;
  const lon = e.latlng.lng;

  console.log("Map click:", lat, lon);

  const name = prompt("Name of this place ?");
  if (!name) {
    addingMode = false;
    map.getContainer().style.cursor = "";
    return;
  }

  const notes = prompt("Notes ?") || "";
  const payload = {
    name: name,
    notes: notes,
    lat: lat,
    lon: lon
  };

  console.log("Sending:", payload);

  fetch("http://localhost:8000/add_point", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(data => {

    console.log("API response:", data);

    alert("Point of interest added!");

    loadPoints();

    addingMode = false;
    map.getContainer().style.cursor = "";

  })
  .catch(err => console.error("API error:", err));

});


// =========================
// DRAW AREAS
// =========================

var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

var drawControl = new L.Control.Draw({
  position: 'topright',
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
  const name = prompt("Name of the area ?");
  const notes = prompt("Notes ?");

  fetch("http://localhost:8000/add_area", {
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

    alert("Area added !");
    loadAreas();
  });
});


// =========================
// SEND GPX FILE
// =========================

document.getElementById("openGPXModal").addEventListener("click", () => {
  document.getElementById("gpxModal").style.display = "flex";
});

document.getElementById("cancelGPX").addEventListener("click", () => {
  document.getElementById("gpxModal").style.display = "none";
});

document.getElementById("gpxFile").addEventListener("change", function() {

  if (!this.files.length) return;

  document.getElementById("gpxName").value =
    this.files[0].name.replace(".gpx","");
});

document.getElementById("submitGPX").addEventListener("click", () => {

  const fileInput = document.getElementById("gpxFile");

  if (!fileInput.files.length) {
    alert("Select a GPX file");
    return;
  }

  const name = document.getElementById("gpxName").value;
  const difficulty = document.getElementById("gpxDifficulty").value;
  const gaz = document.getElementById("gpxGaz").value;
  const notes = document.getElementById("gpxNotes").value;

  const formData = new FormData();

  formData.append("file", fileInput.files[0]);
  formData.append("name", name);
  formData.append("difficulty", difficulty);
  formData.append("gaz", gaz);
  formData.append("notes", notes);

  fetch("http://localhost:8000/upload_gpx", {
    method: "POST",
    body: formData
  })
  .then(res => res.json())
  .then(() => {

    alert("GPX imported!");

    document.getElementById("gpxModal").style.display = "none";

    document.getElementById("gpxFile").value = "";
    document.getElementById("gpxName").value = "";
    document.getElementById("gpxDifficulty").value = "";
    document.getElementById("gpxGaz").value = "";
    document.getElementById("gpxNotes").value = "";

    loadGPXHikes();
  });
});


// =========================
// MOVE MAP ON CLICK
// =========================

map.on("popupopen", function(e) {

  const marker = e.popup._source;

  if (marker.getLatLng) {
    map.flyTo(marker.getLatLng(), map.getZoom());
  }

});


// =========================
// INITIAL LOAD
// =========================

loadPoints();
loadAreas();
loadGPXHikes();
