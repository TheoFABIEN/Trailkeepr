<template>
  <div class="modal">
    <div class="modal-content">
      <h3>New element</h3>
      <input
        v-model="name"
        type="text"
        placeholder="Name of the new element"
        ref="nameInput"
      />
      <textarea
        id="notesArea"
        v-model="notes"
        rows="6"
        placeholder="Notes (optional)"
      ></textarea>
      <div class="modal-buttons">
        <button class="applyButton" @click="submit" :disabled="!name.trim()">Add</button>
        <button class="applyButton" @click="$emit('close')">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { drawModeStore } from '@/stores/drawMode'

const emit = defineEmits(['close', 'created'])
const drawStore = drawModeStore()

const name = ref('')
const notes = ref('')
const nameInput = ref(null)

onMounted(() => nameInput.value?.focus())

async function submit() {
  if (!name.value.trim()) return
  try {
    await drawStore.onConfirm(name.value.trim(), notes.value.trim())
    emit('created')
  } catch (err) {
    console.error('Creation failed', err)
    alert('Error while saving: ' + err.message)
  } finally {
    drawStore.pendingFeature = null
    drawStore.onConfirm = null
    emit('close')
  }
}
</script>

<style scoped>
.modal {
  z-index: 5000;
}
.modal-content input,
.modal-content textarea {
  width: 100%;
  padding: 6px;
  font-size: 14px;
  box-sizing: border-box;
}
#notesArea {
    margin-top: 20px;
}
</style>