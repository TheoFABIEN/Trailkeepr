/*
Helper code for Map.vue

This file contains the code that handles the way layers (points, areas, gpx) are
displayed.
*/

import { useFilterStore } from "@/stores/useFilters"

export function useMapLayers(map) {
	const filterStore = useFilterStore()

	function initSourcesAndLayers() {
		const empty = { type: "FeatureCollection", features: [] }

		map.addSource("points-source", { type: "geojson", data: empty })
		map.addLayer({
			id: "points-layer",
			type: "symbol",
			source: "points-source",
			layout: {
				"icon-image": "icon-blue",
				"icon-size": 1,
				"icon-anchor": "bottom",
				"icon-allow-overlap": true,
			},
		})

		map.addSource("areas-source", { type: "geojson", data: empty })
		map.addLayer({
			id: "areas-fill",
			type: "fill",
			source: "areas-source",
			filter: ["==", "$type", "Polygon"],
			paint: { "fill-color": "orange", "fill-opacity": 0.25 },
		})
		map.addLayer({
			id: "areas-outline",
			type: "line",
			source: "areas-source",
			filter: ["==", "$type", "Polygon"],
			paint: { "line-color": "orange", "line-width": 2 },
		})

		map.addSource("areas-labels-source", { type: "geojson", data: empty })
		map.addLayer({
			id: "areas-markers",
			type: "symbol",
			source: "areas-labels-source",
			layout: {
				"icon-image": "icon-orange",
				"icon-size": 1,
				"icon-anchor": "bottom",
				"icon-allow-overlap": true,
			},
		})

		map.addSource("gpx-source", { type: "geojson", data: empty })
		map.addLayer({
			id: "gpx-lines",
			type: "line",
			source: "gpx-source",
			filter: ["==", "$type", "LineString"],
			paint: { "line-color": "#8b5cf6", "line-width": 4 },
		})

		map.addSource("gpx-labels-source", { type: "geojson", data: empty })
		map.addLayer({
			id: "gpx-markers",
			type: "symbol",
			source: "gpx-labels-source",
			layout: {
				"icon-image": "icon-violet",
				"icon-size": 1,
				"icon-anchor": "bottom",
				"icon-allow-overlap": true,
			},
		})
	}

	async function loadMapIcons() {
		const icons = [
			{
				id: "icon-blue",
				url: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
			},
			{
				id: "icon-violet",
				url: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png",
			},
			{
				id: "icon-orange",
				url: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
			},
		]
		await Promise.all(
			icons.map(async ({ id, url }) => {
				const { data } = await map.loadImage(url)
				if (map.hasImage(id)) map.removeImage(id)
				map.addImage(id, data)
			}),
		)
	}

	function pointsToGeoJSON(data) {
		return {
			type: "FeatureCollection",
			features: data.map((p) => ({
				type: "Feature",
				geometry: { type: "Point", coordinates: [p.lon, p.lat] },
				properties: {
					id: p.id,
					name: p.name,
					notes: p.notes,
					itemType: "points",
				},
			})),
		}
	}

	function areasToGeoJSON(data) {
		return {
			type: "FeatureCollection",
			features: data.map((a) => ({
				type: "Feature",
				geometry: JSON.parse(a.geom),
				properties: {
					id: a.id,
					name: a.name,
					notes: a.notes,
					itemType: "areas",
				},
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
					properties: {
						id: a.id,
						name: a.name,
						notes: a.notes,
						itemType: "areas",
					},
				}
			}),
		}
	}

	function gpxFilter(data) {
		return data.filter((h) => {
			if (!h.distance_km) return false
			if (!filterStore.isUnlimited && h.distance_km > filterStore.maxDistance)
				return false
			if (
				filterStore.selectedDifficulty &&
				h.difficulty != filterStore.selectedDifficulty
			)
				return false
			if (
				filterStore.selectedExposure &&
				String(h.gaz) !== filterStore.selectedExposure
			)
				return false
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
					id: h.id,
					name: h.name,
					notes: h.notes,
					itemType: "gpx_hikes",
					distance_km: h.distance_km,
					elevation_gain: h.elevation_gain,
					elevation_loss: h.elevation_loss,
					difficulty: h.difficulty,
					gaz: h.gaz,
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
						id: h.id,
						name: h.name,
						notes: h.notes,
						itemType: "gpx_hikes",
						distance_km: h.distance_km,
						elevation_gain: h.elevation_gain,
						elevation_loss: h.elevation_loss,
						difficulty: h.difficulty,
						gaz: h.gaz,
					},
				}
			}),
		}
	}

	function renderPoints(data) {
		map.getSource("points-source").setData(pointsToGeoJSON(data))
	}
	function renderAreas(data) {
		map.getSource("areas-source").setData(areasToGeoJSON(data))
		map.getSource("areas-labels-source").setData(areasCentroidsGeoJSON(data))
	}
	function renderGPX(data) {
		map.getSource("gpx-source").setData(gpxToGeoJSON(data))
		map.getSource("gpx-labels-source").setData(gpxCentroidsGeoJSON(data))
	}

	function applyLayerVisibility(showPoints, showAreas, showGpx) {
		const vis = (v) => (v ? "visible" : "none")
		map.setLayoutProperty("points-layer", "visibility", vis(showPoints))
		map.setLayoutProperty("areas-fill", "visibility", vis(showAreas))
		map.setLayoutProperty("areas-outline", "visibility", vis(showAreas))
		map.setLayoutProperty("areas-markers", "visibility", vis(showAreas))
		map.setLayoutProperty("gpx-lines", "visibility", vis(showGpx))
		map.setLayoutProperty("gpx-markers", "visibility", vis(showGpx))
	}

	return {
		loadMapIcons,
		initSourcesAndLayers,
		renderPoints,
		renderAreas,
		renderGPX,
		applyLayerVisibility,
	}
}
