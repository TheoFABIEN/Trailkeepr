import { defineStore } from "pinia"
import { ref } from "vue"

export const drawModeStore = defineStore("drawMode", () => {
	const objectType = ref("")
	const pendingFeature = ref(null)
	const onConfirm = ref(null)
	return {
		objectType,
		pendingFeature,
		onConfirm,
	}
})
