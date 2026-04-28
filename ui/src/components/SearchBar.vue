<template>
  <div class="searchbar-wrapper" ref="wrapperEl">
    <div class="searchbar-input-row">
      <span class="searchbar-icon">🔍</span>
      <input
        ref="inputEl"
        v-model="query"
        type="text"
        placeholder="Search places…"
        @input="onInput"
        @keydown.enter="selectFirst"
        @keydown.escape="clear"
        @focus="showResults = true"
        autocomplete="off"
        spellcheck="false"
      />
      <button v-if="query" class="searchbar-clear" @click="clear">✕</button>
    </div>

    <ul v-if="showResults && results.length" class="searchbar-results">
      <li
        v-for="r in results"
        :key="r.place_id"
        @mousedown.prevent="select(r)"
      >
        {{ r.display_name }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue"

const emit = defineEmits(["select"])

const query = ref("")
const results = ref([])
const showResults = ref(false)
const wrapperEl = ref(null)
const inputEl = ref(null)

let debounceTimer = null

async function onInput() {
  clearTimeout(debounceTimer)
  if (query.value.trim().length < 2) { results.value = []; return }
  debounceTimer = setTimeout(async () => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.value)}&limit=5`
      const res = await fetch(url, { headers: { "Accept-Language": "en" } })
      results.value = await res.json()
    } catch { results.value = [] }
  }, 300)
}

function select(result) {
  query.value = result.display_name
  showResults.value = false
  results.value = []
  emit("select", {
    bbox: [
      parseFloat(result.boundingbox[2]),
      parseFloat(result.boundingbox[0]),
      parseFloat(result.boundingbox[3]),
      parseFloat(result.boundingbox[1]),
    ],
    center: [parseFloat(result.lon), parseFloat(result.lat)],
  })
}

function selectFirst() {
  if (results.value.length) select(results.value[0])
}

function clear() {
  query.value = ""
  results.value = []
  showResults.value = false
}

function onClickOutside(e) {
  if (wrapperEl.value && !wrapperEl.value.contains(e.target)) {
    showResults.value = false
  }
}
onMounted(() => document.addEventListener("mousedown", onClickOutside))
onUnmounted(() => document.removeEventListener("mousedown", onClickOutside))
</script>

<style scoped>
.searchbar-wrapper {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  width: 320px;
  max-width: calc(100vw - 32px);
  z-index: 1500;
  font-size: 14px;
}

.searchbar-input-row {
  display: flex;
  align-items: center;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
  padding: 0 10px;
  height: 40px;
  gap: 6px;
}

.searchbar-icon {
  font-size: 14px;
  color: #aaa;
  flex-shrink: 0;
}

input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  background: transparent;
  min-width: 0;
}

.searchbar-clear {
  background: none;
  border: none;
  font-size: 13px;
  color: #aaa;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  line-height: 1;
  &:hover { color: #333; }
}

.searchbar-results {
  margin: 4px 0 0;
  padding: 4px 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  list-style: none;
  max-height: 280px;
  overflow-y: auto;
}

.searchbar-results li {
  padding: 8px 14px;
  cursor: pointer;
  line-height: 1.4;
  color: #333;
  font-size: 13px;
  &:hover { background: var(--ui-grey); }
}

@media (max-width: 768px) {
  .searchbar-wrapper {
    top: 8px;
    width: calc(100vw - 80px);
    left: 50%;
    transform: translateX(calc(-50% + 20px));
  }
}
</style>
