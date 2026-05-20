<template>
  <div ref="mapContainer" class="map"></div>

  <MapPopup
    ref="mapPopupRef"
    :visible="interactions?.popupState.visible"
    :item="interactions?.popupState.item"
    :position="interactions?.popupState.position"
    @close="interactions?.closePopup()"
    @edit="onEdit"
    @delete="onDelete"
  />

  <CreateModal
    v-if="drawStore.pendingFeature"
    @close="drawStore.pendingFeature = null; drawStore.onConfirm = null"
    @created="reloadAll"
  />

  <EditModal
    v-if="isEditModalOpen"
    :item="editingItem"
    @close="isEditModalOpen = false"
    @updated="reloadAll"
  />

  <DeleteModal
    v-if="isDeleteModalOpen"
    :item="deletingItem"
    @close="isDeleteModalOpen = false"
    @deleted="reloadAll"
  />
</template>


<script setup>
import { ref, onMounted, watch, defineExpose } from "vue"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"

import { useFilterStore } from "@/stores/useFilters"
import { getPoints, getAreas, getGPX } from "@/utils/api"
import { useMapLayers } from "@/utils/useMapLayers"
import { useMapInteractions } from "@/utils/useMapInteractions"
import { useMapDraw } from "@/utils/useMapDraw"
import { useMapBasemaps, BASEMAPS } from "@/utils/useMapBasemaps"
import MapPopup from "@/components/MapPopup.vue"
import CreateModal from "./CreateModal.vue"
import EditModal from "@/components/EditModal.vue"
import DeleteModal from "@/components/DeleteModal.vue"

import { drawModeStore } from "@/stores/drawMode"
const drawStore = drawModeStore()

const filterStore = useFilterStore()
const props = defineProps(["isSidebarOpen", "isMobile"])

const mapContainer = ref(null)
const drawHandler = ref(null)
const basemaps = ref(null)
let map = null
let dataLoaded = false

const points = ref([])
const areas = ref([])
const gpx = ref([])

const editingItem = ref(null)
const deletingItem = ref(null)
const isEditModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const pendingJump = ref(null)
const mapPopupRef = ref(null)

const layers = ref(null)
const interactions = ref(null)

const is3D = ref(false)

// ── Edit / Delete ─────────────────────────────────────────────────
function onEdit(item) {
  editingItem.value = { ...item, type: item.type ?? item.itemType }
  isEditModalOpen.value = true
  interactions.value.closePopup()
}

async function onDelete(item) {
  deletingItem.value = { ...item, type: item.type ?? item.itemType }
  isDeleteModalOpen.value = true
  interactions.value.closePopup()
}

// ── 3D terrain ────────────────────────────────────────────────────
function enable3D() {
  map.setTerrain({ source: "terrain", exaggeration: 1.5 })
  map.easeTo({ pitch: 60, duration: 800 })
  is3D.value = true
}

function disable3D() {
  map.setTerrain(null)
  map.easeTo({ pitch: 0, bearing: 0, duration: 800 })
  is3D.value = false
}

function toggle3D() {
  is3D.value ? disable3D() : enable3D()
}

// ── Geolocation ───────────────────────────────────────────────────
function locateUser() {
  if (!navigator.geolocation) return
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    map.flyTo({ center: [coords.longitude, coords.latitude], zoom: 9 })
  })
}

// ── fitBounds ─────────────────────────────────────────────────────
function fitMapToData() {
  const allCoords = []
  points.value.forEach((p) => allCoords.push([p.lon, p.lat]))
  areas.value.forEach((a) => JSON.parse(a.geom).coordinates[0].forEach((c) => allCoords.push(c)))
  gpx.value.forEach((h) => JSON.parse(h.geom).coordinates.forEach((c) => allCoords.push(c)))
  if (!allCoords.length) { map.setCenter([6.868, 45.924]); map.setZoom(6); return }
  const bounds = allCoords.reduce(
    (b, c) => b.extend(c),
    new maplibregl.LngLatBounds(allCoords[0], allCoords[0])
  )
  map.fitBounds(bounds, { padding: 50 })
}

// ── flyToResult ───────────────────────────────────────────────────
function flyToResult({ bbox, center }) {
  if (bbox) {
    map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 40, maxZoom: 14 })
  } else {
    map.flyTo({ center, zoom: 12 })
  }
}

// ── onMounted ─────────────────────────────────────────────────────
onMounted(async () => {
  map = new maplibregl.Map({
    container: mapContainer.value,
    style: BASEMAPS[0].style,
    center: [6.868, 45.924],
    zoom: 6,
    maxZoom: BASEMAPS[0].maxZoom,
    pixelRatio: window.devicePixelRatio || 1,
  })

  layers.value = useMapLayers(map)
  interactions.value = useMapInteractions(map, mapPopupRef)
  basemaps.value = useMapBasemaps(map, is3D, toggle3D, pendingJump)
  basemaps.value.initBasemapControl()

  map.dragRotate.disable()
  map.touchZoomRotate.disableRotation()
  layers.value = useMapLayers(map)
  interactions.value = useMapInteractions(map, mapPopupRef)

  map.addControl(new maplibregl.NavigationControl(), "bottom-right")
  basemaps.value = useMapBasemaps(map, is3D, toggle3D, pendingJump)
  basemaps.value.initBasemapControl()

  drawHandler.value = useMapDraw(map, layers, points, areas)
  drawHandler.value.initDraw()

  const dataPromise = Promise.all([getPoints(), getAreas(), getGPX()])
    .then(([p, a, g]) => {
      points.value = p
      areas.value = a
      gpx.value = g
      dataLoaded = true
    })

  map.on("style.load", async () => {
    await layers.value.loadMapIcons()
    layers.value.initSourcesAndLayers()

    if (!map.getSource("terrain")) {
      map.addSource("terrain", {
        type: "raster-dem",
        tiles: ["https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png"],
        tileSize: 256,
        encoding: "terrarium",
        maxzoom: 14,
      })
    }

    interactions.value.setupLayerInteractions()
    interactions.value.trackPopupOnMove()

    if (!dataLoaded) await dataPromise

    layers.value.renderPoints(points.value)
    layers.value.renderAreas(areas.value)
    layers.value.renderGPX(gpx.value)

    if (pendingJump.value) {
      const { center, zoom, bearing, pitch } = pendingJump.value
      map.jumpTo({ center, zoom, bearing, pitch })
      pendingJump.value = null
    } else {
      fitMapToData()
    }

    basemaps.value?.refreshControl()

    if (is3D.value) {
      map.setTerrain({ source: "terrain", exaggeration: 1.5 })
    }

    layers.value.applyLayerVisibility(
      filterStore.showPointsLayer,
      filterStore.showAreasLayer,
      filterStore.showGpxLayer
    )
  })

  locateUser()
})

// ── Reload ────────────────────────────────────────────────────────
async function reloadGPX() {
  gpx.value = await getGPX()
  if (map?.isStyleLoaded()) layers.value.renderGPX(gpx.value)
}

async function reloadAll() {
  points.value = await getPoints()
  areas.value = await getAreas()
  gpx.value = await getGPX()
  if (map?.isStyleLoaded()) {
    layers.value.renderPoints(points.value)
    layers.value.renderAreas(areas.value)
    layers.value.renderGPX(gpx.value)
  }
}

function invalidateSize() { if (map) map.resize() }
defineExpose({ reloadGPX, invalidateSize, flyToResult, toggle3D })

// ── Watchers ──────────────────────────────────────────────────────
watch(
  () => [filterStore.maxDistance, filterStore.selectedDifficulty, filterStore.selectedExposure],
  () => { if (map?.isStyleLoaded()) layers.value.renderGPX(gpx.value) }
)
watch(
  () => [filterStore.showPointsLayer, filterStore.showAreasLayer, filterStore.showGpxLayer],
  ([p, a, g]) => { if (map?.isStyleLoaded()) layers.value.applyLayerVisibility(p, a, g) }
)
watch(() => [props.isSidebarOpen, props.isMobile], () => {
  setTimeout(() => map?.resize(), 200)
})
watch(is3D, (val) => {
  if (val) {
    map.dragRotate.enable()
    map.touchZoomRotate.enableRotation()
  } else {
    map.dragRotate.disable()
    map.touchZoomRotate.disableRotation()
  }
})
</script>


<style scoped>
.map {
  position: absolute;
  top: 0; bottom: 0;
  left: 250px; right: 0;
}

.basemap-control {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin-bottom: 4px !important;
}

.maplibregl-ctrl-bottom-right {
  z-index: 1500;
}

.basemap-btn {
  width: 100%;
  padding: 6px 12px;
  background: white;
  border: none;
  border-bottom: 1px solid #ddd;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  color: #333;
  transition: background 0.15s;
  text-align: center;
  &:last-child { border-bottom: none; }
  &:hover { background: #f0f0f0; }
  &.active { background: #e8f5e3; color: #2D5A27; font-weight: 600; }
}

.basemap-sep {
  height: 1px;
  background: #ddd;
}

@media (max-width: 768px) {
  .map { left: 0; }
}
</style>