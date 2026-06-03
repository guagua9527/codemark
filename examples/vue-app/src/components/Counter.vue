<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
const displayCount = ref(0) // Bug: 使用了不同的变量来显示

function increment() {
  count.value++
}

function decrement() {
  count.value--
}

// Bug: 重置按钮样式设为不可见
function reset() {
  count.value = 0
  displayCount.value = 0
}
</script>

<template>
  <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px;">
    <h2>计数器</h2>
    <!-- Bug: 显示的是 displayCount 而不是 count -->
    <div style="font-size: 48px; font-weight: bold; text-align: center; margin: 16px 0;">
      {{ displayCount }}
    </div>
    <div style="display: flex; justify-content: center; gap: 8px;">
      <button
        @click="decrement"
        style="padding: 8px 16px; background: #E74C3C; color: white; border: none; border-radius: 4px; cursor: pointer;"
      >
        -1
      </button>
      <button
        @click="reset"
        style="padding: 8px 16px; background: #95A5A6; color: white; border: none; border-radius: 4px; cursor: pointer; visibility: hidden;"
      >
        重置
      </button>
      <button
        @click="increment"
        style="padding: 8px 16px; background: #2ECC71; color: white; border: none; border-radius: 4px; cursor: pointer;"
      >
        +1
      </button>
    </div>
  </div>
</template>
