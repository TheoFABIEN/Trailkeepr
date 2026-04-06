<template>
  <div class="modal">
    <div class="modal-content">
      <h3>Edit</h3>
      <input v-model="name" placeholder="Name" />
      <textarea rows="6" v-model="notes" placeholder="Notes"></textarea>
      <div v-if="item.type === 'gpx_hikes'">
        <input v-model="difficulty" placeholder="Difficulty" />
        <input v-model="gaz" placeholder="Exposure" />
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
    alert("Erreur lors de la sauvegarde : " + e.message)
  }
}
</script>


<style scoped>
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  z-index: 5000;
  display: flex;
  justify-content: center;
  align-items: center;
}
.modal-content {
  background: white;
  padding: 25px;
  border-radius: 8px;
  width: 420px;
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