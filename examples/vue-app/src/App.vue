<script setup lang="ts">
import TodoList from './components/TodoList.vue'
import Counter from './components/Counter.vue'
</script>

<template>
  <div style="max-width: 600px; margin: 40px auto; font-family: system-ui, sans-serif;">
    <h1 style="color: #333;">CodeMark Demo</h1>
    <p style="color: #666;">这个页面包含故意的 bug，请使用 CodeMark 批注来修复它们。</p>

    <div style="margin-top: 30px;">
      <TodoList />
    </div>

    <div style="margin-top: 30px;">
      <Counter />
    </div>
  </div>
</template>
