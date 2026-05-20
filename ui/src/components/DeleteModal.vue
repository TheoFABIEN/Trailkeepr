<template>
<div class="modal">
    <div class="modal-content">
        <label>Delete this element ?</label>
        <div class="modal-buttons">
            <button id="deleteElement" class="applyButton" @click="submitDelete">Delete</button>
            <button id="cancelDelete" class="applyButton" @click="$emit('close')">Cancel</button>
        </div>
    </div>
</div>
</template>


<script setup>
import { deleteItem } from '@/utils/api'

const props = defineProps({
    item: Object
})

const emit = defineEmits(["close", "deleted"])

async function submitDelete() {
    try {
        await deleteItem(props.item.type, props.item.id)
        emit("deleted")
        emit("close")
    } catch (err) { console.error(err) }
}

</script>


<style scoped>
.modal {
    z-index: 5000;
}
#deleteElement {
    background: #fff;
    color: #D10000;
    border: 1px solid #D10000;
    &:hover { 
        background: #fee2e2; 
        outline: none;
    }
}
@media (max-width: 768px) {
    .modal-content {
        width: 80%;
    }
    .modal-buttons {
        display: block;
    }
}
</style>