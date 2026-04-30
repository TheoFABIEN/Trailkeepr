/*
Helper code for Map.vue

This file contains the code necessary to draw and control basemaps used for the 
project. 
*/

import { ref } from "vue"

export const BASEMAPS = [
  {
    id: "osm", label: "🌍", maxZoom: 18,
    style: {
      version: 8,
      sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, maxzoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' } },
      layers: [{ id: "osm-layer", type: "raster", source: "osm" }],
    },
  },
  {
    id: "topo", label: "🗺", maxZoom: 16,
    style: {
      version: 8,
      sources: { topo: { type: "raster", tiles: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"], tileSize: 256, maxzoom: 17, attribution: '© <a href="https://opentopomap.org">OpenTopoMap</a> · © OpenStreetMap contributors' } },
      layers: [{ id: "topo-layer", type: "raster", source: "topo" }],
    },
  },
  {
    id: "satellite", label: "📷", maxZoom: 19,
    style: {
      version: 8,
      sources: { ign: { type: "raster", tiles: ["https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}"], tileSize: 256, maxzoom: 19, attribution: '© <a href="https://www.ign.fr">IGN Géoportail</a>' } },
      layers: [{ id: "satellite-layer", type: "raster", source: "ign" }],
    },
  },
]

export function useMapBasemaps(map, is3D, toggle3D, pendingJump) {
  const currentBasemap = ref(BASEMAPS[0])
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

  class BasemapControl {
    onAdd(m) {
      this._map = m
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
      btn3d.title = is3D.value ? "Disable 3D relief" : "Enable 3D relief"
      btn3d.className = "basemap-btn" + (is3D.value ? " active" : "")
      btn3d.onclick = () => { toggle3D(); this.refresh() }
      this._container.appendChild(btn3d)
    }
    refresh() { this._render() }
  }

  function initBasemapControl() {
    basemapControl = new BasemapControl()
    map.addControl(basemapControl, "bottom-right")
    return basemapControl
  }

  function refreshControl() {
    basemapControl?.refresh()
  }

  return {
    currentBasemap,
    initBasemapControl,
    refreshControl,
    switchBasemap,
  }
}