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
					await new Promise((resolve) => map.once("style.load", resolve))
				}
				draw.changeMode("draw_polygon")
				map.on("draw.create", handleAreaCreated)
			}
		},
	)

	return { initDraw }
}
