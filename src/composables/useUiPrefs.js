import { ref, watch } from 'vue'

const KEY = 'kosurveyor.showNames'

// module-level ref so it's shared across imports
const showNames = ref(localStorage.getItem(KEY) === '1')

watch(showNames, (val) => {
  try {
    localStorage.setItem(KEY, val ? '1' : '0')
  } catch (e) {
    // ignore
  }
})

export function useUiPrefs() {
  return { showNames }
}
