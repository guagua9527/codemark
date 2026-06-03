<script setup lang="ts">
import { ref } from 'vue'

const todos = ref<string[]>(['学习 Vue', '搭建 CodeMark'])
const newTodo = ref('')

// Bug: 这个函数没有被调用
function addTodo() {
  if (newTodo.value.trim()) {
    todos.value.push(newTodo.value.trim())
    newTodo.value = ''
  }
}

// Bug: 删除时索引计算错误（删的是最后一个而不是指定的）
function removeTodo(index: number) {
  todos.value.splice(todos.value.length - 1, 1)
}
</script>

<template>
  <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px;">
    <h2>待办列表</h2>
    <div style="display: flex; gap: 8px; margin-bottom: 12px;">
      <input
        v-model="newTodo"
        placeholder="添加新任务..."
        style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"
      />
      <!-- Bug: 按钮没有绑定点击事件 -->
      <button style="padding: 8px 16px; background: #4A90D9; color: white; border: none; border-radius: 4px; cursor: pointer;">
        添加
      </button>
    </div>
    <ul style="list-style: none; padding: 0;">
      <li
        v-for="(todo, index) in todos"
        :key="index"
        style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #eee;"
      >
        <span>{{ todo }}</span>
        <button
          @click="removeTodo(index)"
          style="background: #E74C3C; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer;"
        >
          删除
        </button>
      </li>
    </ul>
  </div>
</template>
