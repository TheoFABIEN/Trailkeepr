<template>
  <div class="modal">
    <div class="modal-content">
      <h3>Edit</h3>
      <label>Name</label>
      <input v-model="name" placeholder="Name" />
      <label>Notes</label>
      <textarea rows="6" v-model="notes" placeholder="Notes"></textarea>
      <div v-if="item.type === 'gpx_hikes'">
        <label>Difficulty</label>
        <select v-model="difficulty">
          <option value="">Unknown</option>
          <option value="1">1 - Easy</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5 - Hard</option>
        </select>
        <label>Exposure</label>
        <select v-model="gaz">
          <option value="">Unknown</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </div>
      <button class="applyButton" @click="submit">Save</button>
      <button class="applyButton" @click="$emit('close')">Cancel</button>
    </div>
  </div>
</template>


<script setup>
import { ref, watch } from 'vue'
import { updateItem } from "@/utils/api"

const props = defineProps({
    item: Object
})

const emit = defineEmits(["updated", "close"])

const name = ref("")
const notes = ref("")
const difficulty = ref("")
const gaz = ref("")

watch(() => props.item, (newItem) => {
  if (newItem) {
    name.value = newItem.name || ""
    notes.value = newItem.notes || ""
    difficulty.value = newItem.difficulty || ""
    gaz.value = String(newItem.gaz) || "false"
  }
}, { immediate: true })


async function submit() {
  try {
    const payload = {
      name: name.value,
      notes: notes.value,
      difficulty: props.item.type === 'gpx_hikes' ? parseInt(difficulty.value) || null : null,
      gaz: props.item.type === 'gpx_hikes' ? (gaz.value === 'true' || gaz.value === true) : null
    }

    await updateItem(props.item.type, props.item.id, payload)
    
    emit("updated")
    emit("close")
  } catch (e) {
    console.error("Update failed", e)
    alert("Error while saving: " + e.message)
  }
}
</script>


<style scoped>
.modal {
  z-index: 5000;
}
.modal-content input, select, textarea {
    width: 100%;
    padding: 6px;
    font-size: 14px;
    margin-bottom: 20px;
}
</style>