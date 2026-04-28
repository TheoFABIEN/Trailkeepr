<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="map-popup-anchor"
      :style="{ left: position.x + 'px', top: position.y + 'px' }"
    >
      <div class="map-popup" ref="popupEl">
        <button class="popup-close" @click="$emit('close')">✕</button>
        <div class="popup-name">{{ item.name }}</div>
        <div v-if="item.notes" class="popup-notes">{{ item.notes }}</div>
        <div v-if="item.itemType === 'gpx_hikes'" class="popup-stats">
          <span v-if="item.distance_km">{{ item.distance_km }} km</span>
          <span v-if="item.elevation_gain"> · ↗ {{ item.elevation_gain }}m</span>
          <span v-if="item.elevation_loss"> · ↘ {{ item.elevation_loss }}m</span>
        </div>
        <div class="popup-actions">
          <button class="popup-btn" @click="$emit('edit', item)">✏️ Edit</button>
          <button class="popup-btn danger" @click="$emit('delete', item)">🗑 Delete</button>
        </div>
        <PhotoGallery :itemType="item.itemType" :itemId="item.id" />
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import PhotoGallery from "@/components/PhotoGallery.vue"

const props = defineProps({
  visible: { type: Boolean, default: false },
  item: { type: Object, default: () => ({}) },
  position: { type: Object, default: () => ({ x: 0, y: 0 }) },
})

defineEmits(["close", "edit", "delete"])
</script>


<style scoped>
.map-popup-anchor {
  position: fixed;
  z-index: 2000;
  pointer-events: none;
  transform: translate(-50%, calc(-100% - 41px - 8px));
}

.map-popup {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(6px);
  border-radius: 10px;
  padding: 14px 16px 12px;
  min-width: 220px;
  max-width: 300px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.18);
  pointer-events: all;
  font-size: 14px;
}

.popup-close {
  position: absolute;
  top: 8px;
  right: 10px;
  background: none;
  border: none;
  font-size: 13px;
  color: #888;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  &:hover { background: #eee; color: #333; }
}

.popup-name {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 4px;
  padding-right: 20px;
  color: var(--ui-dark);
}

.popup-notes {
  font-size: 13px;
  color: #555;
  margin-bottom: 6px;
  white-space: pre-wrap;
}

.popup-stats {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  background: var(--ui-grey);
  border-radius: 6px;
  padding: 4px 8px;
  display: inline-block;
}

.popup-actions {
  display: flex;
  gap: 6px;
  margin-bottom: 4px;
}

.popup-btn {
  flex: 1;
  padding: 5px 8px;
  font-size: 12px;
  border: 1px solid var(--ui-border);
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: background 0.15s;
  &:hover { background: var(--ui-grey); }
}

.popup-btn.danger {
  &:hover { background: #fee2e2; border-color: #fca5a5; }
}
</style>