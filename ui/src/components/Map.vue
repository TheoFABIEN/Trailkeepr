<template>
  <div ref="mapContainer" class="map"></div>

  <MapPopup
    ref="mapPopupRef"
    :visible="popupState.visible"
    :item="popupState.item"
    :position="popupState.position"
    @close="closePopup"
    @edit="onEdit"
    @delete="onDelete"
  />

  <EditModal
    v-if="isEditModalOpen"
    :item="editingItem"
    @close="isEditModalOpen = false"
    @updated="reloadAll"
  />
</template>

<script setup>
import { ref, reactive, onMounted, watch, defineExpose, nextTick } from "vue"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import MapboxDraw from "@mapbox/mapbox-gl-draw"
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css"

import { useFilterStore } from "@/stores/useFilters"
import { drawModeStore } from "@/stores/drawMode"
import { getPoints, getAreas, getGPX, addPoint, addArea, deleteItem } from "@/utils/api"
import MapPopup from "@/components/MapPopup.vue"
import EditModal from "@/components/EditModal.vue"

const filterStore = useFilterStore()
const drawStore = drawModeStore()
const props = defineProps(["isSidebarOpen", "isMobile"])

const mapContainer = ref(null)
let map = null
let draw = null
let dataLoaded = false

const points = ref([])
const areas = ref([])
const gpx = ref([])

const editingItem = ref(null)
const isEditModalOpen = ref(false)
const pendingJump = ref(null)
const mapPopupRef = ref(null)

// Terrain elevation
const is3D = ref(false)
const TERRAIN_SOURCE = {
  type: "raster-dem",
  tiles: ["https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png"],
  tileSize: 256,
  encoding: "terrarium",
  maxzoom: 14
}

// ── Popup state ───────────────────────────────────────────────────
const popupState = reactive({
  visible: false,
  item: {},
  position: { x: 0, y: 0 },
  lngLat: null,
})

function getPopupPosition(lngLat) {
  const point = map.project(lngLat)
  const rect = map.getCanvas().getBoundingClientRect()
  return {
    x: rect.left + point.x,
    y: rect.top + point.y,
  }
}

async function openPopup(properties, lngLat) {
  popupState.item = { ...properties }
  popupState.lngLat = lngLat
  popupState.visible = true
  await nextTick()
  const popupHeight = mapPopupRef.value?.getHeight() ?? 200
  const totalOffsetPx = ~~(popupHeight/2)
  const markerPixel = map.project(lngLat)
  const targetPixel = {
    x: markerPixel.x,
    y: markerPixel.y - totalOffsetPx,
  }
  const targetLngLat = map.unproject([targetPixel.x, targetPixel.y])

  map.flyTo({ center: targetLngLat, duration: 400 })

  popupState.position = getPopupPosition(lngLat)
}



function trackPopupOnMove() {
  map.on("move", () => {
    if (!popupState.visible || !popupState.lngLat) return
    popupState.position = getPopupPosition(popupState.lngLat)
  })
}

function closePopup() { popupState.visible = false }


// ── Edit / Delete ─────────────────────────────────────────────────
function onEdit(item) {
  editingItem.value = { ...item, type: item.type ?? item.itemType }
  isEditModalOpen.value = true
  closePopup()
}

async function onDelete(item) {
  if (!confirm("Delete this element ?")) return
  try {
    await deleteItem(item.itemType, item.id)
    if (item.itemType === "points") { points.value = await getPoints(); renderPoints() }
    if (item.itemType === "areas") { areas.value = await getAreas(); renderAreas() }
    if (item.itemType === "gpx_hikes") { gpx.value = await getGPX(); renderGPX() }
    closePopup()
  } catch (err) { console.error(err) }
}

// ── Marker icons ────────────────────────────────────────────────────

async function loadMapIcons() {
  const icons = [
    { id: "icon-blue",   url: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png" },
    { id: "icon-violet", url: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png" },
    { id: "icon-orange", url: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png" },
  ]

  await Promise.all(
    icons.map(async ({ id, url }) => {
      const { data } = await map.loadImage(url)
      if (map.hasImage(id)) map.removeImage(id)
      map.addImage(id, data)
    })
  )
}


// ── Sources & layers ──────────────────────────────────────────────
function initSourcesAndLayers() {
  const empty = { type: "FeatureCollection", features: [] }

  map.addSource("points-source", { type: "geojson", data: empty })
  map.addLayer({
    id: "points-layer", type: "symbol", source: "points-source",
    layout: { "icon-image": "icon-blue", "icon-size": 1, "icon-anchor": "bottom", "icon-allow-overlap": true },
  })

  map.addSource("areas-source", { type: "geojson", data: empty })
  map.addLayer({
    id: "areas-fill", type: "fill", source: "areas-source",
    filter: ["==", "$type", "Polygon"],
    paint: { "fill-color": "orange", "fill-opacity": 0.25 },
  })
  map.addLayer({
    id: "areas-outline", type: "line", source: "areas-source",
    filter: ["==", "$type", "Polygon"],
    paint: { "line-color": "orange", "line-width": 2 },
  })

  map.addSource("areas-labels-source", { type: "geojson", data: empty })
  map.addLayer({
    id: "areas-markers", type: "symbol", source: "areas-labels-source",
    layout: { "icon-image": "icon-orange", "icon-size": 1, "icon-anchor": "bottom", "icon-allow-overlap": true },
  })

  map.addSource("gpx-source", { type: "geojson", data: empty })
  map.addLayer({
    id: "gpx-lines", type: "line", source: "gpx-source",
    filter: ["==", "$type", "LineString"],
    paint: { "line-color": "#8b5cf6", "line-width": 4 },
  })

  map.addSource("gpx-labels-source", { type: "geojson", data: empty })
  map.addLayer({
    id: "gpx-markers", type: "symbol", source: "gpx-labels-source",
    layout: { "icon-image": "icon-violet", "icon-size": 1, "icon-anchor": "bottom", "icon-allow-overlap": true },
  })
}

// ── 3D terrain toggle ───────────────────────────────────────────────

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



// ── GeoJSON helpers ───────────────────────────────────────────────
function pointsToGeoJSON(data) {
  return {
    type: "FeatureCollection",
    features: data.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lon, p.lat] },
      properties: { id: p.id, name: p.name, notes: p.notes, itemType: "points" },
    })),
  }
}

function areasToGeoJSON(data) {
  return {
    type: "FeatureCollection",
    features: data.map((a) => ({
      type: "Feature",
      geometry: JSON.parse(a.geom),
      properties: { id: a.id, name: a.name, notes: a.notes, itemType: "areas" },
    })),
  }
}

function areasCentroidsGeoJSON(data) {
  return {
    type: "FeatureCollection",
    features: data.map((a) => {
      const coords = JSON.parse(a.geom).coordinates[0]
      const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length
      const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [lng, lat] },
        properties: { id: a.id, name: a.name, notes: a.notes, itemType: "areas" },
      }
    }),
  }
}

function gpxFilter(data) {
  return data.filter((h) => {
    if (!h.distance_km) return false
    if (!filterStore.isUnlimited && h.distance_km > filterStore.maxDistance) return false
    if (filterStore.selectedDifficulty && h.difficulty != filterStore.selectedDifficulty) return false
    if (filterStore.selectedExposure && String(h.gaz) !== filterStore.selectedExposure) return false
    return true
  })
}

function gpxToGeoJSON(data) {
  return {
    type: "FeatureCollection",
    features: gpxFilter(data).map((h) => ({
      type: "Feature",
      geometry: JSON.parse(h.geom),
      properties: {
        id: h.id, name: h.name, notes: h.notes, itemType: "gpx_hikes",
        distance_km: h.distance_km, elevation_gain: h.elevation_gain,
        elevation_loss: h.elevation_loss, difficulty: h.difficulty, gaz: h.gaz,
      },
    })),
  }
}

function gpxCentroidsGeoJSON(data) {
  return {
    type: "FeatureCollection",
    features: gpxFilter(data).map((h) => {
      const coords = JSON.parse(h.geom).coordinates
      const mid = coords[Math.floor(coords.length / 2)]
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: mid },
        properties: {
          id: h.id, name: h.name, notes: h.notes, itemType: "gpx_hikes",
          distance_km: h.distance_km, elevation_gain: h.elevation_gain,
          elevation_loss: h.elevation_loss, difficulty: h.difficulty, gaz: h.gaz,
        },
      }
    }),
  }
}

// ── Render ────────────────────────────────────────────────────────
function renderPoints() { map.getSource("points-source").setData(pointsToGeoJSON(points.value)) }
function renderAreas() {
  map.getSource("areas-source").setData(areasToGeoJSON(areas.value))
  map.getSource("areas-labels-source").setData(areasCentroidsGeoJSON(areas.value))
}
function renderGPX() {
  map.getSource("gpx-source").setData(gpxToGeoJSON(gpx.value))
  map.getSource("gpx-labels-source").setData(gpxCentroidsGeoJSON(gpx.value))
}

// ── Interactions layers ───────────────────────────────────────────
const INTERACTIVE_LAYERS = ["points-layer", "areas-markers", "gpx-markers"]

function setupLayerInteractions() {
  INTERACTIVE_LAYERS.forEach((layerId) => {
    map.on("mouseenter", layerId, () => { map.getCanvas().style.cursor = "pointer" })
    map.on("mouseleave", layerId, () => { map.getCanvas().style.cursor = "" })

    const handleMarkerTap = (e) => {
      e.preventDefault()
      const feature = e.features[0]
      const coords = feature.geometry.coordinates
      const lngLat = new maplibregl.LngLat(coords[0], coords[1])
      openPopup(feature.properties, lngLat)
    }

    map.on("click", layerId, handleMarkerTap)
    map.on("touchend", layerId, handleMarkerTap)
  })


  map.on("click", (e) => { if (!e.defaultPrevented) closePopup() })
  
  let touchStartPos = null
  map.getCanvas().addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    } else {
      touchStartPos = null // pinch-to-zoom → ignorer
    }
  }, { passive: true })
  
  map.getCanvas().addEventListener("touchend", (e) => {
    if (!touchStartPos) return
    const touch = e.changedTouches[0]
    const dx = Math.abs(touch.clientX - touchStartPos.x)
    const dy = Math.abs(touch.clientY - touchStartPos.y)
    if (dx > 8 || dy > 8) return
    if (!e.defaultPrevented) closePopup()
  })
}

// ── Draw mode ───────────────────────────────────────────────────

function initDraw() {
  draw = new MapboxDraw({
    displayControlsDefault: false,
    styles: [
      {
        id: "gl-draw-polygon-fill",
        type: "fill",
        filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
        paint: {"fill-color": "orange", "fill-opacity": 0.5}
      },
      {
        id: "gl-draw-polygon-stroke",
        type: "line",
        filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
        paint: {"line-color": "orange", "line-width": 2}
      },
      {
        id: "gl-draw-polygon-and-line-vertex",
        type: "circle",
        filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"]],
        paint: {"circle-radius": 6, "circle-color": "white", "circle-stroke-color": "orange", "circle-stroke-width": 2,}
      },
      {
        id: "gl-draw-line",
        type: "line",
        filter: ["all", ["==", "$type", "LineString"], ["!=", "mode", "static"]],
        paint: {"line-color": "orange", "line-width": 2, "line-dasharray": [2, 2]}
      }
    ]
  })
  map.addControl(draw)
  const layersToPatch = [
    "gl-draw-lines.cold",
    "gl-draw-lines.hot",
    "gl-draw-polygon-stroke.cold",
    "gl-draw-polygon-stroke.hot",
  ]
  layersToPatch.forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, "line-dasharray", [2, 2])
    }
  })
}

async function handleAddPoint(e) {
  if (e.defaultPrevented) return
  const { lat, lng } = e.lngLat
  const name = prompt("Name of this place ?")
  if (!name) { cancelDraw(); return }
  const notes = prompt("Notes ?") || ""
  try {
    await addPoint({ name, notes, lat, lon: lng })
    points.value = await getPoints()
    renderPoints()
  } catch (err) { console.error(err) }
  cancelDraw()
}

async function handleAreaCreated(e) {
  const geojson = e.features[0]
  const name = prompt("Name of this area ?")
  if (!name) { draw.deleteAll(); cancelDraw(); return }
  const notes = prompt("Notes ?") || ""
  try {
    await addArea({ name, notes, geometry: geojson.geometry })
    areas.value = await getAreas()
    renderAreas()
  } catch (err) { console.error(err) }
  draw.deleteAll()
  cancelDraw()
}

function cancelDraw() {
  map.getCanvas().style.cursor = ""
  drawStore.objectType = ""
  map.off("click", handleAddPoint)
  map.off("draw.create", handleAreaCreated)
}

watch(
  () => drawStore.objectType,
  async (mode) => {
    if (!map) return
    map.off("click", handleAddPoint)
    map.off("draw.create", handleAreaCreated)
    draw?.deleteAll()
    draw?.changeMode("simple_select")
    map.getCanvas().style.cursor = ""

    if (mode === "point") {
      map.getCanvas().style.cursor = "crosshair"
      map.once("click", handleAddPoint)
    }

    if (mode === "area") {
      map.getCanvas().style.cursor = "crosshair"
      if (!map.isStyleLoaded()) {
        await new Promise(resolve => map.once("style.load", resolve))
      }
      draw.changeMode("draw_polygon")
      map.on("draw.create", handleAreaCreated)
    }
  }
)


// ── Geolocation ───────────────────────────────────────────────
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

// ── flyToResult ─────────────
function flyToResult({ bbox, center }) {
  if (bbox) {
    map.fitBounds(
      [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
      { padding: 40, maxZoom: 14 }
    )
  } else {
    map.flyTo({ center, zoom: 12 })
  }
}

// ── Map backgrounds ────────────────────────────────────────────────
const BASEMAPS = [
  {
    id: "osm",
    label: "🌍",
    maxZoom: 18,
    style: {
      version: 8,
      sources: {
        osm: {
          type: "raster",
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          maxzoom: 19,
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        },
      },
      layers: [{ id: "osm-layer", type: "raster", source: "osm" }],
    },
  },
  {
    id: "topo",
    label: "🗺",
    maxZoom: 16,
    style: {
      version: 8,
      sources: {
        topo: {
          type: "raster",
          tiles: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          maxzoom: 17,
          attribution: '© <a href="https://opentopomap.org">OpenTopoMap</a> · © OpenStreetMap contributors',
        },
      },
      layers: [{ id: "topo-layer", type: "raster", source: "topo" }],
    },
  },
  {
    id: "satellite",
    label: "📷",
    maxZoom: 19,
    style: {
      version: 8,
      sources: {
        ign: {
          type: "raster",
          tiles: [
            "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
          ],
          tileSize: 256,
          maxzoom: 19,
          attribution: '© <a href="https://www.ign.fr">IGN Géoportail</a>',
        },
      },
      layers: [{ id: "satellite-layer", type: "raster", source: "ign" }],
    },
  },
]

const currentBasemap = ref(BASEMAPS[0])


// ── Map background selector ────────────────────────────────────
class BasemapControl {
  onAdd(map) {
    this._map = map
    this._container = document.createElement("div")
    this._container.className = "maplibregl-ctrl maplibregl-ctrl-group basemap-control"
    this._render()
    return this._container
  }

  onRemove() {
    this._container.parentNode?.removeChild(this._container)
    this._map = null
  }

_render() {
  this._container.innerHTML = ""

  BASEMAPS.forEach((bm) => {
    const btn = document.createElement("button")
    btn.textContent = bm.label
    btn.title = bm.label
    btn.className = "basemap-btn" + (currentBasemap.value.id === bm.id ? " active" : "")
    btn.onclick = () => switchBasemap(bm)
    this._container.appendChild(btn)
  })

  const sep = document.createElement("div")
  sep.className = "basemap-sep"
  this._container.appendChild(sep)

  const btn3d = document.createElement("button")
  btn3d.textContent = "3D"
  btn3d.title = is3D.value ? "Désactiver le relief 3D" : "Activer le relief 3D"
  btn3d.className = "basemap-btn" + (is3D.value ? " active" : "")
  btn3d.onclick = () => { toggle3D(); this.refresh() }
  this._container.appendChild(btn3d)
}

  refresh() { this._render() }
}

let basemapControl = null

function switchBasemap(bm) {
  if (currentBasemap.value.id === bm.id) return

  const center = map.getCenter()
  const zoom = Math.min(map.getZoom(), bm.maxZoom)
  const bearing = map.getBearing()
  const pitch = map.getPitch()

  currentBasemap.value = bm
  map.setMaxZoom(bm.maxZoom)
  map.setStyle(bm.style)
  pendingJump.value = { center, zoom, bearing, pitch }
}

onMounted(async () => {
  map = new maplibregl.Map({
    container: mapContainer.value,
    style: currentBasemap.value.style,
    center: [6.868, 45.924],
    zoom: 6,
    maxZoom: currentBasemap.value.maxZoom,
    pixelRatio: window.devicePixelRatio || 1,
  })

  map.addControl(new maplibregl.NavigationControl(), "bottom-right")
  basemapControl = new BasemapControl()
  map.addControl(basemapControl, "bottom-right")

  initDraw()

  const dataPromise = Promise.all([getPoints(), getAreas(), getGPX()])
    .then(([p, a, g]) => {
      points.value = p
      areas.value = a
      gpx.value = g
      dataLoaded = true
    })

  map.on("style.load", async () => {
    await loadMapIcons()
    initSourcesAndLayers()

    if (!map.getSource("terrain")) {
      map.addSource("terrain", {
        type: "raster-dem",
        tiles: [
          "https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png"
        ],
        tileSize: 256,
        encoding: "terrarium",
        maxzoom: 14
      })
    }
    setupLayerInteractions()
    trackPopupOnMove()

    if (!dataLoaded) await dataPromise

    renderPoints()
    renderAreas()
    renderGPX()

    if (pendingJump.value) {
      const { center, zoom, bearing, pitch } = pendingJump.value
      map.jumpTo({ center, zoom, bearing, pitch })
      pendingJump.value = null
    } else {
      fitMapToData()
    }

    basemapControl?.refresh()

    if (is3D.value) {
      map.setTerrain({ source: "terrain", exaggeration: 1.5 })
    }

    const vis = (v) => (v ? "visible" : "none")
    map.setLayoutProperty("points-layer", "visibility", vis(filterStore.showPointsLayer))
    map.setLayoutProperty("areas-fill", "visibility", vis(filterStore.showAreasLayer))
    map.setLayoutProperty("areas-outline", "visibility", vis(filterStore.showAreasLayer))
    map.setLayoutProperty("areas-markers", "visibility", vis(filterStore.showAreasLayer))
    map.setLayoutProperty("gpx-lines", "visibility", vis(filterStore.showGpxLayer))
    map.setLayoutProperty("gpx-markers", "visibility", vis(filterStore.showGpxLayer))
  })

  locateUser()
})



// ── Reload ────────────────────────────────────────────────────────
async function reloadGPX() {
  gpx.value = await getGPX()
  if (map?.isStyleLoaded()) renderGPX()
}

async function reloadAll() {
  points.value = await getPoints()
  areas.value = await getAreas()
  gpx.value = await getGPX()
  if (map?.isStyleLoaded()) { renderPoints(); renderAreas(); renderGPX() }
}

function invalidateSize() { if (map) map.resize() }
defineExpose({ reloadGPX, invalidateSize, flyToResult, toggle3D })

// ── Watchers ──────────────────────────────────────────────────────
watch(
  () => [filterStore.maxDistance, filterStore.selectedDifficulty, filterStore.selectedExposure],
  () => { if (map?.isStyleLoaded()) renderGPX() }
)
watch(
  () => [filterStore.showPointsLayer, filterStore.showAreasLayer, filterStore.showGpxLayer],
  ([p, a, g]) => {
    if (!map?.isStyleLoaded()) return
    const vis = (v) => (v ? "visible" : "none")
    map.setLayoutProperty("points-layer", "visibility", vis(p))
    map.setLayoutProperty("areas-fill", "visibility", vis(a))
    map.setLayoutProperty("areas-outline", "visibility", vis(a))
    map.setLayoutProperty("areas-markers", "visibility", vis(a))
    map.setLayoutProperty("gpx-lines", "visibility", vis(g))
    map.setLayoutProperty("gpx-markers", "visibility", vis(g))
  }
)
watch(() => [props.isSidebarOpen, props.isMobile], () => {
  setTimeout(() => map?.resize(), 200)
})
</script>


<style>
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
  text-align: left;
  white-space: nowrap;
  color: #333;
  transition: background 0.15s;
  text-align: center;
  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: #f0f0f0;
  }
  &.active {
    background: #e8f5e3;
    color: #2D5A27;
    font-weight: 600;
  }
}

.basemap-sep {
  height: 1px;
  background: #ddd;
  margin: 0;
}

@media (max-width: 768px) {
  .map { left: 0; }
}
</style>
