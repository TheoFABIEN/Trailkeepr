<template>
<div id="gpxModal" class="modal">
  <div class="modal-content">
    <h3>Import GPX file</h3>
    <input type="file" id="gpxFile" accept=".gpx" @change="handleFile"><br><br>
    <label>Name</label>
    <input type="text" id="gpxName" v-model="name" placeholder="Name of the hike">
    <label>Difficulty</label>
    <select  v-model="difficulty" id="gpxDifficulty">
      <option value="">Unknown</option>
      <option value="1">1 - Easy</option>
      <option value="2">2</option>
      <option value="3">3</option>
      <option value="4">4</option>
      <option value="5">5 - Hard</option>
    </select>
    <label>Exposure</label>
    <select v-model="gaz" id="gpxGaz">
      <option value="">Unknown</option>
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
    <label>Notes</label>
    <textarea id="gpxNotes" v-model="notes" rows="6" placeholder="Notes about the hike..."></textarea>
    <div class="modal-buttons">
      <button id="submitGPX" class="applyButton" @click="submit">Import</button>
      <button id="cancelGPX" class="applyButton" @click="close">Cancel</button>
    </div>
  </div>
</div>
</template>


<script setup>

import { ref } from "vue"
import { BASE_URL } from "@/utils/api"

const emit = defineEmits(["close", "uploaded"])

const file = ref(null)
const name = ref("")
const difficulty = ref("")
const gaz = ref("")
const notes = ref("")

function handleFile(e) {
  file.value = e.target.files[0]
  if (file.value) {
    name.value = file.value.name.replace(".gpx", "")
  }
}

function submit() {
  if (!file.value) {
    alert("Select a GPX file")
    return
  }

  const formData = new FormData()
  formData.append("file", file.value)
  formData.append("name", name.value)
  formData.append("difficulty", difficulty.value)
  formData.append("gaz", gaz.value)
  formData.append("notes", notes.value)

  fetch(`${BASE_URL}/upload_gpx`, {
    method: "POST",
    body: formData
  })
  .then(() => {
    alert("GPX imported!")

    file.value = null
    name.value = ""
    difficulty.value = ""
    gaz.value = ""
    notes.value = ""

    emit("uploaded")
    emit("close")
  })
  .catch(err => console.error(err))
}
function close() {
  emit("close")
}

</script>


<style scoped>
.modal {
    display: flex;
    position: fixed;
    z-index: 2000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    justify-content: center;
    align-items: center;
}

.modal-content {
    background: white;
    padding: 25px;
    border-radius: 8px;
    width: 420px;
    max-width: 90%;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.modal-content input,
.modal-content select,
.modal-content textarea {
    width: 100%;
    padding: 6px;
    font-size: 14px;
}

.modal-buttons {
    margin-top: 10px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}
</style>