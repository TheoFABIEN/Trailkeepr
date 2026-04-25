export const standardPopup = (item, type = "points") => `
    <div class="popup-content">
        <b>${item.name || "Sans nom"}</b><br>${item.notes || ""}
        <div class="popup-actions">
            <button class="popup-edit" data-id="${item.id}" data-type="${type}">✏️</button>
            <button class="popup-delete" data-id="${item.id}" data-type="${type}">🗑</button>
        </div>
        <div id="photo-gallery-${type}-${item.id}"></div>
    </div>`

export const gpxPopup = (hike) => {
	const stats = [
		hike.distance_km ? `${hike.distance_km} km` : "",
		hike.elevation_gain ? `↗ ${hike.elevation_gain}m` : "",
		hike.elevation_loss ? `↘ ${hike.elevation_loss}m` : "",
	]
		.filter(Boolean)
		.join(" | ")

	return `
    <div class="popup-content">
        <b>${hike.name}</b><br>${hike.notes || ""}
        <div class="popup-footer">
            <div class="popup-stats">${stats}</div>
            <button class="popup-edit" data-id="${hike.id}" data-type="gpx_hikes">✏️</button>
            <button class="popup-delete" data-id="${hike.id}" data-type="gpx_hikes">🗑</button>
        </div>
        <div id="photo-gallery-gpx_hikes-${hike.id}"></div>
    </div>`
}
