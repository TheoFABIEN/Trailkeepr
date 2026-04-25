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
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	})
}
export function addArea(data) {
	return request("add_area", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	})
}

export function deleteItem(type, id) {
	return request(`${type}/${id}`, { method: "DELETE" })
}

export function uploadGPX(formData) {
	return fetch(`${BASE_URL}/upload_gpx`, { method: "POST", body: formData })
}

export function updateItem(type, id, data) {
	return request(`${type}/${id}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	})
}

export function getPhotos(itemType, itemId) {
	return request(`photos/${itemType}/${itemId}`)
}

export function deletePhoto(photoId) {
	return request(`photos/${photoId}`, { method: "DELETE" })
}

export function uploadPhoto(itemType, itemId, file, caption = "") {
	const formData = new FormData()
	formData.append("item_type", itemType)
	formData.append("item_id", itemId)
	formData.append("file", file)
	formData.append("caption", caption)
	return fetch(`${BASE_URL}/photos`, {
		method: "POST",
		body: formData,
	}).then((res) => {
		if (!res.ok) throw new Error(`API error: ${res.status}`)
		return res.json()
	})
}
