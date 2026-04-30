/*
Helper code for Map.vue

This file contains the code that allow users to interact with elements of the
map, including everything that handles popups behavior. 
*/

import { reactive, nextTick } from "vue"
import maplibregl from "maplibre-gl"

export function useMapInteractions(map, mapPopupRef) {

	const popupState = reactive({
		visible: false,
		item: {},
		position: { x: 0, y: 0 },
		lngLat: null,
	})

	function getPopupPosition(lngLat) {
		const point = map.project(lngLat)
		const rect = map.getCanvas().getBoundingClientRect()
		return { x: rect.left + point.x, y: rect.top + point.y }
	}

	async function openPopup(properties, lngLat) {
		popupState.item = { ...properties }
		popupState.lngLat = lngLat
		popupState.visible = true
		await nextTick()
		const popupHeight = mapPopupRef.value?.getHeight() ?? 200
		const totalOffsetPx = ~~(popupHeight / 2)
		const markerPixel = map.project(lngLat)
		const targetLngLat = map.unproject([
			markerPixel.x,
			markerPixel.y - totalOffsetPx,
		])
		map.flyTo({ center: targetLngLat, duration: 400 })
		popupState.position = getPopupPosition(lngLat)
	}

	function closePopup() {
		popupState.visible = false
	}

	function trackPopupOnMove() {
		map.on("move", () => {
			if (!popupState.visible || !popupState.lngLat) return
			popupState.position = getPopupPosition(popupState.lngLat)
		})
	}

	const INTERACTIVE_LAYERS = ["points-layer", "areas-markers", "gpx-markers"]

	function setupLayerInteractions() {
		INTERACTIVE_LAYERS.forEach((layerId) => {
			map.on("mouseenter", layerId, () => {
				map.getCanvas().style.cursor = "pointer"
			})
			map.on("mouseleave", layerId, () => {
				map.getCanvas().style.cursor = ""
			})

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

		map.on("click", (e) => {
			if (!e.defaultPrevented) closePopup()
		})

		let touchStartPos = null
		map.getCanvas().addEventListener(
			"touchstart",
			(e) => {
				touchStartPos =
					e.touches.length === 1
						? { x: e.touches[0].clientX, y: e.touches[0].clientY }
						: null
			},
			{ passive: true },
		)

		map.getCanvas().addEventListener("touchend", (e) => {
			if (!touchStartPos) return
			const touch = e.changedTouches[0]
			const dx = Math.abs(touch.clientX - touchStartPos.x)
			const dy = Math.abs(touch.clientY - touchStartPos.y)
			if (dx > 8 || dy > 8) return
			if (!e.defaultPrevented) closePopup()
		})
	}

	return {
		popupState,
		openPopup,
		closePopup,
		trackPopupOnMove,
		setupLayerInteractions,
	}
}
