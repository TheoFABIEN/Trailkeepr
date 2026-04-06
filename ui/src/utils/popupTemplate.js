export const standardPopup = (point) => `
    <div class="popup-content">
        <b>${point.name}</b><br>${point.notes || ""}
        <button class="popup-delete" data-id="${point.id}" data-type="points">🗑</button>
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
            <button class="popup-delete" data-id="${hike.id}" data-type="gpx_hikes">🗑</button>
        </div>
    </div>`
}
