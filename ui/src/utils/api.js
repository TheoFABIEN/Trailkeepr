export const BASE_URL = "/api"

async function request(endpoint, options = {}) {
	const res = await fetch(`${BASE_URL}/${endpoint}`, options)
	if (!res.ok) {
		throw new Error(`API error: ${res.status}`)
	}
	return res.json()
}

export function getPoints() {
	return request("points")
}
export function getAreas() {
	return request("areas")
}
export function getGPX() {
	return request("gpx_hikes")
}

export function addPoint(data) {
	return request("add_point", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(data),
	})
}
export function addArea(data) {
	return request("add_area", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(data),
	})
}

export function deleteItem(type, id) {
	return request(`${type}/${id}`, {
		method: "DELETE",
	})
}

export function uploadGPX(formData) {
	return fetch(`${BASE_URL}/upload_gpx`, {
		method: "POST",
		body: formData,
	})
}
