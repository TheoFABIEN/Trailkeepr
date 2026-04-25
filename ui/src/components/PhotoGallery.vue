<template>
  <div class="photo-gallery">

    <div v-if="photos.length" class="photo-grid">
      <div
        v-for="(photo, index) in visiblePhotos"
        :key="photo.id"
        class="photo-item"
      >
        <img
          :src="`/uploads/${photo.filename}`"
          :alt="photo.caption || ''"
          @click="openLightbox(index)"
        />
        <button class="photo-delete" @click.stop="handleDelete(photo.id)">🗑</button>
      </div>

      <div v-if="photos.length > 2" class="photo-item photo-more" @click="openLightbox(2)">
        <img :src="`/uploads/${photos[2].filename}`" alt="" class="photo-more-bg" />
        <span>+{{ photos.length - 2 }}</span>
      </div>
    </div>
    <p v-else class="no-photos">No photos yet.</p>

    <div class="photo-upload">
      <label class="upload-label">
        📷 {{ pendingFiles.length ? `${pendingFiles.length} file(s) selected` : "Choose photos" }}
        <input type="file" accept="image/*" multiple ref="fileInput" @change="handleFiles" />
      </label>
      <input
        v-if="pendingFiles.length"
        type="text"
        v-model="caption"
        placeholder="Caption (optional)"
        class="caption-input"
      />
      <button
        v-if="pendingFiles.length"
        class="applyButton"
        @click="submitPhotos"
        :disabled="uploading"
      >
        {{ uploading ? "Uploading..." : "Add photos" }}
      </button>
    </div>

    <teleport to="body">
      <div
        v-if="lightboxIndex !== null"
        class="lightbox"
        @click.self="lightboxIndex = null"
      >
        <button class="lightbox-close" @click="lightboxIndex = null">✕</button>
        <button
          v-if="photos.length > 1"
          class="lightbox-nav left"
          @click.stop="prevPhoto"
        >‹</button>
          <div class="lightbox-inner" @click.stop>
            <img
              :src="`/uploads/${photos[lightboxIndex].filename}`"
              :alt="photos[lightboxIndex].caption || ''"
            />
            <p v-if="photos[lightboxIndex].caption" class="lightbox-caption">
              {{ photos[lightboxIndex].caption }}
            </p>
            <p class="lightbox-counter">{{ lightboxIndex + 1 }} / {{ photos.length }}</p>
            <button class="lightbox-delete" @click="handleDelete(photos[lightboxIndex].id)">🗑 Delete</button>
          </div>
        <button
          v-if="photos.length > 1"
          class="lightbox-nav right"
          @click.stop="nextPhoto"
        >›</button>
      </div>
    </teleport>

  </div>
</template>


<script setup>
import { ref, computed, onMounted } from 'vue'
import { getPhotos, uploadPhoto, deletePhoto } from '@/utils/api'

const props = defineProps({ hikeId: Number })
const emit = defineEmits(['updated'])

const photos = ref([])
const pendingFiles = ref([])
const caption = ref("")
const uploading = ref(false)
const lightboxIndex = ref(null)
const fileInput = ref(null)

const visiblePhotos = computed(() => photos.value.slice(0, 2))

async function loadPhotos() {
  photos.value = await getPhotos(props.hikeId)
}

function handleFiles(e) {
  pendingFiles.value = Array.from(e.target.files)
}

async function submitPhotos() {
  if (!pendingFiles.value.length) return
  uploading.value = true
  try {
    for (const file of pendingFiles.value) {
      await uploadPhoto(props.hikeId, file, caption.value)
    }
    pendingFiles.value = []
    caption.value = ""
    fileInput.value.value = ""
    await loadPhotos()
    emit('updated')
  } catch (err) {
    alert("Upload failed: " + err.message)
  } finally {
    uploading.value = false
  }
}

async function handleDelete(photoId) {
  if (!confirm("Delete this photo?")) return
  await deletePhoto(photoId)
  lightboxIndex.value = null
  await loadPhotos()
}

function openLightbox(index) {
  lightboxIndex.value = index
}

function prevPhoto() {
  lightboxIndex.value = (lightboxIndex.value - 1 + photos.value.length) % photos.value.length
}

function nextPhoto() {
  lightboxIndex.value = (lightboxIndex.value + 1) % photos.value.length
}

onMounted(loadPhotos)
</script>


<style scoped>
.photo-gallery {
  margin-top: 12px;
  border-top: 1px solid #eee;
  padding-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.photo-grid {
  display: flex;
  gap: 6px;
}

.photo-item {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    cursor: pointer;
    transition: opacity 0.2s;
    display: block;
  }
}

.photo-item img:hover {
  opacity: 0.85;
}

.photo-delete {
  position: absolute;
  top: 3px;
  right: 3px;
  background: rgba(0,0,0,0.5);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 10px;
  cursor: pointer;
  padding: 2px 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.photo-item:hover .photo-delete {
  opacity: 1;
}

/* Button "..." */
.photo-more {
  cursor: pointer;
  background: #000;
  span {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 18px;
    font-weight: 700;
  }
}

.photo-more-bg {
  opacity: 0.4;
  filter: blur(1px);
}

/* Upload */
.photo-upload {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.upload-label {
  display: inline-block;
  cursor: pointer;
  font-size: 13px;
  color: var(--ui-darkgreen);
  font-weight: 600;
}

.upload-label input {
  display: none;
}

.caption-input {
  padding: 5px 8px;
  font-size: 13px;
  border: 1px solid var(--ui-border);
  border-radius: 6px;
  width: 100%;
  box-sizing: border-box;
}

.no-photos {
  color: #aaa;
  font-size: 12px;
  margin: 0;
}

/* Lightbox */
.lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.9);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: calc(100vw - 120px);
  padding: 40px 0 20px;
  img {
    max-width: 100%;
    max-height: 80vh;
    object-fit: contain;
    border-radius: 8px;
  }
}


.lightbox-caption {
  color: white;
  margin-top: 10px;
  font-size: 14px;
  text-align: center;
}

.lightbox-counter {
  color: #aaa;
  font-size: 12px;
  margin-top: 4px;
}

.lightbox-close {
  position: absolute;
  top: 14px;
  right: 14px;
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  opacity: 0.7;
  z-index: 1;
  &:hover {
    opacity: 1;
  }
}


.lightbox-nav {
  background: none;
  border: none;
  color: white;
  font-size: 52px;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
  user-select: none;
  padding: 0 16px;
  flex-shrink: 0;
  &:hover {
    opacity: 1;
  }
}

.lightbox-delete {
  margin-top: 12px;
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.3);
  color: white;
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 13px;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
  &:hover {
    opacity: 1;
  }
}

</style>