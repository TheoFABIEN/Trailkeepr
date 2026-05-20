/*
Helper code for Map.vue

This file contains the code that allows the user to add new points and draw new 
areas on the map.
*/

import MapboxDraw from "@mapbox/mapbox-gl-draw"
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css"
import { watch } from "vue"
import { drawModeStore } from "@/stores/drawMode"
import { addPoint, addArea, getPoints, getAreas } from "@/utils/api"

export function useMapDraw(map, layers, points, areas) {
	const drawStore = drawModeStore()
	let draw = null

	function initDraw() {
		draw = new MapboxDraw({
			displayControlsDefault: false,
			styles: [
				{
					id: "gl-draw-polygon-fill",
					type: "fill",
					filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
					paint: { "fill-color": "orange", "fill-opacity": 0.5 },
				},
				{
					id: "gl-draw-polygon-stroke",
					type: "line",
					filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
					paint: { "line-color": "orange", "line-width": 2 },
				},
				{
					id: "gl-draw-polygon-and-line-vertex",
					type: "circle",
					filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"]],
					paint: {
						"circle-radius": 6,
						"circle-color": "white",
						"circle-stroke-color": "orange",
						"circle-stroke-width": 2,
					},
				},
				{
					id: "gl-draw-line",
					type: "line",
					filter: [
						"all",
						["==", "$type", "LineString"],
						["!=", "mode", "static"],
					],
					paint: {
						"line-color": "orange",
						"line-width": 2,
						"line-dasharray": [2, 2],
					},
				},
			],
		})
		map.addControl(draw)
	}

	async function handleAddPoint(e) {
		if (e.defaultPrevented) return
		const { lat, lng } = e.lngLat
		cancelDraw()
		drawStore.pendingFeature = { lat, lon: lng }
		drawStore.onConfirm = async (name, notes) => {
			await addPoint({ name, notes, lat, lon: lng })
			points.value = await getPoints()
			layers.value.renderPoints(points.value)
		}
	}

	let touchStartPos = null

	function handleTouchStart(e) {
		touchStartPos =
			e.touches.length === 1
				? { x: e.touches[0].clientX, y: e.touches[0].clientY }
				: null
	}

	function handleTouchEnd(e) {
		if (!touchStartPos) return
		const touch = e.changedTouches[0]
		const dx = Math.abs(touch.clientX - touchStartPos.x)
		const dy = Math.abs(touch.clientY - touchStartPos.y)
		// On ignore si c'est un glissement (pan)
		if (dx > 8 || dy > 8) return

		// Convertir les coordonnées écran en coordonnées géo
		const canvas = map.getCanvas()
		const rect = canvas.getBoundingClientRect()
		const point = {
			x: touch.clientX - rect.left,
			y: touch.clientY - rect.top,
		}
		const lngLat = map.unproject(point)
		handleAddPoint({ defaultPrevented: false, lngLat })
	}

	function attachPointListeners() {
		map.once("click", handleAddPoint)
		map
			.getCanvas()
			.addEventListener("touchstart", handleTouchStart, { passive: true })
		map.getCanvas().addEventListener("touchend", handleTouchEnd)
	}

	function detachPointListeners() {
		map.off("click", handleAddPoint)
		map.getCanvas().removeEventListener("touchstart", handleTouchStart)
		map.getCanvas().removeEventListener("touchend", handleTouchEnd)
	}

	async function handleAreaCreated(e) {
		const geometry = e.features[0].geometry
		draw.deleteAll()
		cancelDraw()

		drawStore.pendingFeature = { geometry }
		drawStore.onConfirm = async (name, notes) => {
			await addArea({ name, notes, geometry })
			areas.value = await getAreas()
			layers.value.renderAreas(areas.value)
		}
	}

	function cancelDraw() {
		map.getCanvas().style.cursor = ""
		drawStore.objectType = ""
		detachPointListeners()
		map.off("draw.create", handleAreaCreated)
	}

	watch(
		() => drawStore.objectType,
		async (mode) => {
			if (!map) return
			detachPointListeners()
			map.off("draw.create", handleAreaCreated)
			draw?.deleteAll()
			draw?.changeMode("simple_select")
			map.getCanvas().style.cursor = ""

			if (mode === "point") {
				map.getCanvas().style.cursor = "crosshair"
				attachPointListeners()
			}
			if (mode === "area") {
				map.getCanvas().style.cursor = "crosshair"
				if (!map.isStyleLoaded()) {
					await new Promise((resolve) => map.once("style.load", resolve))
				}
				draw.changeMode("draw_polygon")
				map.on("draw.create", handleAreaCreated)
			}
		},
	)

	return { initDraw }
}
