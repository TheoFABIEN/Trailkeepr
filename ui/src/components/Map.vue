<template>
	<div ref="mapContainer" class="map"></div>
  <EditModal 
  v-if="isEditModalOpen"
  :item="editingItem"
  @close="isEditModalOpen = false"
  @updated="reloadAll" />
</template>

<script setup>
import { ref, onMounted, watch, defineExpose, createApp } from "vue"
import PhotoGallery from "@/components/PhotoGallery.vue"
import L from "leaflet"

import { useFilterStore } from "@/stores/useFilters"
import { drawModeStore } from "@/stores/drawMode"
import { standardPopup, gpxPopup } from "@/utils/popupTemplate"
import { orangeIcon, violetIcon, blueIcon } from "@/utils/leafletIcons"
import {
  getPoints, getAreas, getGPX, addPoint, addArea, deleteItem
} from '@/utils/api'

import "leaflet/dist/leaflet.css"
import "leaflet-control-geocoder"
import "leaflet-control-geocoder/dist/Control.Geocoder.css"
import "leaflet-draw/dist/leaflet.draw.css"
import "leaflet-draw"
import EditModal from "@/components/EditModal.vue"

const filterStore = useFilterStore()
const drawStore = drawModeStore()

let drawControl = null
let drawLayer = null

const mapContainer = ref(null)
let map = null
let pointsLayer = null
let areasLayer = null
let gpxLayer = null

const points = ref([])
const areas = ref([])
const gpx = ref([])

const editingItem = ref(null)
const isEditModalOpen = ref(false)

function locateUser() {
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition((position) => {
			const { latitude, longitude } = position.coords
			map.setView([latitude, longitude], 9)
		})
	} else {
		alert("The browser does not support geolocation.")
	}
}

function fitMapToData() {
	const allLayers = []
	pointsLayer.eachLayer((layer) => allLayers.push(layer))
	gpxLayer.eachLayer((layer) => allLayers.push(layer))
	areasLayer.eachLayer((layer) => allLayers.push(layer))
	if (allLayers.length == 0) {
		map.setView([45.924, 6.868], 6)
		return
	}
	const group = L.featureGroup(allLayers)
	map.fitBounds(group.getBounds(), { padding: [50, 50] })
}

function renderPoints() {
    pointsLayer.clearLayers()
    points.value.forEach((point) => {
        L.marker([point.lat, point.lon], {icon: blueIcon})
            .bindPopup(standardPopup(point, "points"))
            .addTo(pointsLayer)
    })
}
function renderAreas() {
    areasLayer.clearLayers()
    areas.value.forEach((area) => {
        const geom = JSON.parse(area.geom)
        const layer = L.geoJSON(geom, { color: "orange" }).addTo(areasLayer)
        const center = layer.getBounds().getCenter()
        L.marker(center, { icon: orangeIcon })
            .bindPopup(standardPopup(area, "areas"))
            .addTo(areasLayer)
    })
}

function renderGPX() {
	gpxLayer.clearLayers()
	gpx.value.forEach((hike) => {
		const distance = hike.distance_km
		if (distance == null) return
		if (!filterStore.isUnlimited && distance > filterStore.maxDistance) return
		if (filterStore.selectedDifficulty && hike.difficulty != filterStore.selectedDifficulty)
			return
		if (filterStore.selectedExposure && String(hike.gaz) !== filterStore.selectedExposure)
			return
		const geom = JSON.parse(hike.geom)
		const line = L.geoJSON(geom, {
			color: "purple",
			weight: 4,
		}).addTo(gpxLayer)
		const center = line.getBounds().getCenter()
		L.marker(center, { icon: violetIcon, hikeId: hike.id })
    .bindPopup(gpxPopup(hike))
    .addTo(gpxLayer)
	})
}

function handleEdit(type, id) {
  let item = null
  const numericId = Number(id)
  if (type === "points") { item = points.value.find(p => p.id == numericId) }
  if (type === "areas") { item = areas.value.find(a => a.id == numericId) }
  if (type === "gpx_hikes") { item = gpx.value.find(g => g.id == numericId) }
  if (item) {
    editingItem.value = { ...item, type }
    isEditModalOpen.value = true
  }
}

onMounted(async () => {
  map = L.map(mapContainer.value)
  map.zoomControl.setPosition("bottomright")
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map)
 
  map.on("popupopen", (e) => {
    const marker = e.popup._source
    if (marker.getLatLng) {
      map.flyTo(marker.getLatLng(), map.getZoom())
    }
    const container = e.popup.getElement()
    const deleteBtn = container.querySelector(".popup-delete")
    if (deleteBtn) {
      deleteBtn.onclick = () => {
        handleDelete(deleteBtn.dataset.type, deleteBtn.dataset.id)
      }
    }
    const editBtn = container.querySelector(".popup-edit")
    if (editBtn) {
      editBtn.onclick = () => {
        handleEdit(editBtn.dataset.type, editBtn.dataset.id)
        map.closePopup()
      }
    }
    const source = e.popup._source
    const hikeId = source?.options?.hikeId
    if (hikeId) {
      const mountPoint = container.querySelector(`#photo-gallery-${hikeId}`)
      if (mountPoint) {
        const galleryApp = createApp(PhotoGallery, { hikeId })
        galleryApp.mount(mountPoint)
      }
    }
  })  

  locateUser()

  L.Control.geocoder({
    defaultMarkGeocode: false,
    collapsed: false,
    placeholder: "Search adventures",
  })
    .on("markgeocode", (e) => {
      map.fitBounds(e.geocode.bbox)
    })
    .addTo(map)
  pointsLayer = L.layerGroup().addTo(map)
  areasLayer = L.layerGroup().addTo(map)
  gpxLayer = L.layerGroup().addTo(map)
  points.value = await getPoints()
  renderPoints()
  areas.value = await getAreas()
  renderAreas()
  gpx.value = await getGPX()
  renderGPX()
  fitMapToData()
})

async function handleAddPoint(e) {
  const { lat, lng } = e.latlng
  const name = prompt("Name of this place?")
  const notes = prompt("Notes?") || ""
  try {
    await addPoint({ name, notes, lat, lon: lng })
    alert("Point added!")
    points.value = await getPoints()
    renderPoints()
  } catch (err) {
    console.error(err)
  }
  map.off("click", handleAddPoint)
  map.getContainer().style.cursor = ""
  drawStore.objectType = ""
}


async function enableDrawArea() {
  drawLayer = new L.FeatureGroup()
  map.addLayer(drawLayer)
  const polygonDrawer = new L.Draw.Polygon(map, {
    shapeOptions: { color: "orange" }
  })
  polygonDrawer.enable()
  map.off(L.Draw.Event.CREATED)
  map.on(L.Draw.Event.CREATED, async (e) => {
    const layer = e.layer
    drawLayer.addLayer(layer)
    const geojson = layer.toGeoJSON()
    const name = prompt("Name of the area?")
    const notes = prompt("Notes?") || ""
    try {
      await addArea({ name, notes, geometry: geojson.geometry })
      alert("Area added!")
      areas.value = await getAreas()
      renderAreas()
    } catch (err) {
      console.error(err)
    }
    map.removeLayer(drawLayer)
    map.getContainer().style.cursor = ""
    drawStore.objectType = ""
  })
}

async function handleDelete(type, id) {
  if (!confirm(`Delete this '${type}' element ?`)) return
  try {
    await deleteItem(type, id)
    alert(`${type} deleted`)
    if (type === "points") {
      points.value = await getPoints()
      renderPoints()
    }
    if (type === "areas") {
      areas.value = await getAreas()
      renderAreas()
    }
    if (type === "gpx_hikes") {
      gpx.value = await getGPX()
      renderGPX()
    }
  } catch (err) {
    console.error(err)
  }
}

async function reloadGPX() {
  gpx.value = await getGPX()
  renderGPX()
}
defineExpose({
  reloadGPX,
  invalidateSize
})

async function reloadAll() {
  points.value = await getPoints()
  areas.value = await getAreas()
  gpx.value = await getGPX()

  renderPoints()
  renderAreas()
  renderGPX()
}

watch(
	() => [filterStore.maxDistance, 
    filterStore.selectedDifficulty, 
    filterStore.selectedExposure
  ],
	() => { renderGPX() },
)

watch(() => [filterStore.showPointsLayer, filterStore.showAreasLayer, filterStore.showGpxLayer],
  ([p, a, g]) => {
    p ? pointsLayer.addTo(map) : map.removeLayer(pointsLayer)
    a ? areasLayer.addTo(map) : map.removeLayer(areasLayer)
    g ? gpxLayer.addTo(map) : map.removeLayer(gpxLayer)
})

watch(
  () => drawStore.objectType,
  (mode) => {
    console.log("DRAW MODE:", mode)
    if (!map) return
    map.off("click", handleAddPoint)
    if (drawControl) {
      map.removeControl(drawControl)
      drawControl = null
    }
    if (drawLayer) {
      map.removeLayer(drawLayer)
      drawLayer = null
    }
    if (mode === "point") {
      map.getContainer().style.cursor = "crosshair"
      map.on("click", handleAddPoint)
    }
    if (mode === "area") {
      map.getContainer().style.cursor = "crosshair"
      enableDrawArea()
    }
  }
)

// Elements that make the app responsive:

function invalidateSize() {
  if (map) map.invalidateSize()
}
const props = defineProps(['isSidebarOpen', 'isMobile'])
watch(() => [props.isSidebarOpen, props.isMobile], () => {
  const controls = document.querySelectorAll(".leaflet-control-container");
  controls.forEach(ctrl => {
    ctrl.style.display = (props.isMobile && props.isSidebarOpen) ? "none" : "";
  });
})
</script>


<style>
.map {
	position: absolute;
	top: 0;
	bottom: 0;
	left: 250px;
	right: 0px;
}
.leaflet-top.leaflet-right {
	left: 0;
	right: 0;
	display: flex;
	justify-content: center;
}
.leaflet-control-geocoder {
	position: absolute !important;
	top: 20px;
	left: 50%;
	transform: translateX(-50%);
	width: 320px;
	max-width: 60%;
	z-index: 1000;
}
.leaflet-popup-tip {
	background: rgba(255, 255, 255, 0) !important;
	box-shadow: none !important;
	border: none !important;
}
.leaflet-popup:hover .leaflet-popup-content-wrapper{
	background: rgba(255, 255, 255, 1) !important;
}
.leaflet-popup-content-wrapper {
	background: rgba(255, 255, 255, 0.7) !important;
	backdrop-filter: blur(3px);
	transition: background 0.2s ease;
}
.leaflet-popup-content {
	background: transparent !important;
	position: relative;
	font-size: 16px;
}
.popup-footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-top: 6px;
	font-size: 16px;
}
.popup-stats {
	font-size: 14px;
	color: #444;
	padding-right: 30px;
}
.popup-delete {
	position: absolute;
	bottom: -10px;
	right: -15px;
	background: none;
	border: none;
	font-size: 14px;
	opacity: 0.5;
	cursor: pointer;
}
.popup-edit {
	position: absolute;
	bottom: -8px;
	right: 0px;
	background: none;
	border: none;
	font-size: 12px;
	opacity: 0.5;
	cursor: pointer;
}
.popup-edit:hover .popup-delete:hover{
  opacity: 1;
}
@media (max-width: 768px) {
  .map {
    left: 0;
  }
}
@media (max-width: 768px) {
  .leaflet-control-geocoder-icon {
    display: none !important;
  }
  .leaflet-control-geocoder {
    top: 8px;
  }
    .leaflet-control-geocoder-form input {
    height: 36px;         
    line-height: 36px;    
    padding: 0 10px;      
  }
}
</style>
