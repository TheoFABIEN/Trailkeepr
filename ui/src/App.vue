<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Map from "@/components/Map.vue"
import Sidebar from "@/components/Sidebar.vue"
import Modal from "@/components/Modal.vue"

const isModalOpen = ref(false)
const isSidebarOpen = ref(false)
const isMobile = ref(false)
const mapRef = ref(null)

function updateResponsiveMode() {
  isMobile.value = window.matchMedia("(max-width: 768px)").matches
  if (!isMobile.value) {
    isSidebarOpen.value = false
  }
}
onMounted(() => {
  updateResponsiveMode()
  window.addEventListener("resize", updateResponsiveMode)
})
onUnmounted(() => {
  window.removeEventListener("resize", updateResponsiveMode)
})

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value
  if (!isSidebarOpen.value) {
    setTimeout(() => {
      mapRef.value?.invalidateSize()
    }, 200)
  }
}

function openModal() { isModalOpen.value = true }
function closeModal() { isModalOpen.value = false }
function handleUploaded() { mapRef.value?.reloadGPX() }
</script>


<template>
  <div :class="['app-container', { 'mobile-mode': isMobile, 'sidebar-open': isSidebarOpen }]">
    <button id="mobileToggle" @click="toggleSidebar" v-if="isMobile">
      {{ isSidebarOpen ? '✕' : '☰' }}
    </button>
    <Map ref="mapRef" :is-sidebar-open="isSidebarOpen" :is-mobile="isMobile"></Map>
    <Sidebar 
      v-show="!isMobile || isSidebarOpen" 
      @openModal="openModal"
    ></Sidebar>
    <Modal v-if="isModalOpen" @close="closeModal" @uploaded="handleUploaded"></Modal>
  </div>
</template>


<style>
#mobileToggle {
  position: fixed;
  top: 15px;
  left: 15px;
  z-index: 3000;
  background: var(--ui-darkgreen);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 18px;
  cursor: pointer;
}
.app-container.mobile-mode.sidebar-open .map {
  display: none;
}
.app-container.mobile-mode .map {
  left: 0 !important;
  width: 100%;
}
</style>