<template>
    <div id="sidebar">
        <h1>My Outdoor Archive</h1>

        <div id="upload-gpx">
          <div id="secondary-text-header">Upload your track data and add it to the database.</div>
          <button id="openGPXModal" @click="showModal">Import GPX file</button>
        </div>

        <div id="newTypeBox">
        <h3>ADD OTHER ELEMENT</h3>
        <select id="newType" class="selectButton-alt" v-model="tempObjectType">
          <option value="point">Point of interest</option>
          <option value="area">Area</option>
        </select>
        <button id="startAdd" class="applyButton" @click="addObject">
            ⚐ &ensp; Add on the map
        </button>
        </div>

        <div id="filtersBox">
        <h3>HIKE FILTERS</h3>
        <DistanceSlider/>
        <p class="secondary-text">Difficulty</p>
        <p>
        <select id="difficulty" class="selectButton"
        v-model="tempDifficulty">
          <option value="">All</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
        </select>
        </p>
        <p class="secondary-text">Exposure to void</p>
        <p>
        <select id="gaz" class="selectButton"
        v-model="tempExposure">
          <option value="">All</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
        </p>
        <button id="applyFilters" class="applyButton"
        @click="exportFilters">Apply</button>
        </div>

        <div id="layersBox">
        <h3>MAP OBJECTS</h3>
        <ToggleButton 
            id="toggleGPX" 
            label="GPX tracks" 
            sliderClass="gpx-slider"
            v-model="filterStore.showGpxLayer"/>
        <ToggleButton 
            id="togglePoints" 
            label="Points of interest" 
            sliderClass="points-slider"
            v-model="filterStore.showPointsLayer"/>
        <ToggleButton 
            id="toggleAreas" 
            label="Areas" 
            sliderClass="areas-slider"
            v-model="filterStore.showAreasLayer"/>
        </div>
    </div>
</template>


<script setup>
import ToggleButton from './ToggleButton.vue'
import DistanceSlider from './DistanceSlider.vue'
import { useFilterStore } from '@/stores/useFilters'
import { drawModeStore } from '@/stores/drawMode'
import { ref } from 'vue'

const emit = defineEmits([
    'openModal'
])
function showModal() {
    emit('openModal')
}
const filterStore = useFilterStore()
const drawStore = drawModeStore()
const tempObjectType = ref("point")

function addObject() {
    drawStore.objectType = tempObjectType.value
}

const tempDifficulty = ref('')
const tempExposure = ref('')

function exportFilters() {
    filterStore.selectedDifficulty = tempDifficulty.value
    filterStore.selectedExposure = tempExposure.value
}
</script>


<style scoped>
#sidebar {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 300px;
    background: var(--ui-light);
    overflow-y: auto;
    overflow-x: hidden;
    box-shadow: 2px 0 5px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    padding-top: 10px;
    padding-left: 30px;
    padding-right: 30px;
}
#upload-gpx {
    width: 100%;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    background-color: white;
    border-radius: 8px;
    margin-top: 10px;
    padding-bottom: 15px;
    padding-top: 5px;
    padding-left: 5px;
    margin: 0 auto;
    display: block;
}
#secondary-text-header {
    color: var(--ui-darkgrey);
    width: 90%;
    text-align: left;
    margin: 5px auto 8px auto;
    display: block;
}
#openGPXModal {
    width: 90%;
    padding: 20px 14px;
    background: var(--ui-darkgreen);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    margin: 0 auto;
    display: block;
}
#openGPXModal:hover {
    background: transparent;
    color: var(--ui-dark);
    outline: 3px #181717 solid;
}
.selectButton-alt {
    width: 100%;
    padding: 10px;
    background: var(--ui-grey);
    color: black;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    text-align: left;
    margin: 0 auto;
    display: block;
}
.selectButton-alt:hover {
    outline: 1px var(--ui-dark) solid;
}
.selectButton {
    width: 100%;
    padding: 5px;
    background: var(--ui-light);
    color: black;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    text-align: left;
    margin: 0 auto;
    display: block;
}
.selectButton:hover {
    background: transparent;
    color: var(--ui-dark);
    outline: 1px var(--ui-dark) solid;
}
@media (max-width: 768px) {
  #sidebar {
    width: 100% !important;
    padding-left: 20px;
    padding-right: 20px;
    box-sizing: border-box;
  }
}
</style>