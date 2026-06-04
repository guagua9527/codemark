import { useState } from 'react'

export default function TodoList() {
  const [todos, setTodos] = useState<string[]>(['学习 React', '搭建 CodeMark'])
  const [newTodo, setNewTodo] = useState('')

  // Bug: 这个函数没有被调用
  function addTodo() {
    if (newTodo.trim()) {
      setTodos([...todos, newTodo.trim()])
      setNewTodo('')
    }
  }

  // Bug: 删除时索引计算错误（删的是最后一个而不是指定的）
  function removeTodo(index: number) {
    setTodos(todos.filter((_, i) => i !== todos.length - 1))
  }

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
      <h2>待办列表</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={newTodo}
          onChange={e => setNewTodo(e.target.value)}
          placeholder="添加新任务..."
          style={{ flex: 1, padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
        />
        {/* Bug: 按钮没有绑定点击事件 */}
        <button style={{ padding: '8px 16px', background: '#4A90D9', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          添加
        </button>
      </div>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {todos.map((todo, index) => (
          <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, borderBottom: '1px solid #eee' }}>
            <span>{todo}</span>
            <button
              onClick={() => removeTodo(index)}
              style={{ background: '#E74C3C', color: 'white', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}
            >
              删除
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
