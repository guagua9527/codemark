import TodoList from './components/TodoList'
import Counter from './components/Counter'

export default function App() {
  return (
    <div style={{ maxWidth: 600, margin: '40px auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ color: '#333' }}>CodeMark React Demo</h1>
      <p style={{ color: '#666' }}>这个页面包含故意的 bug，请使用 CodeMark 批注来修复它们。</p>

      <div style={{ marginTop: 30 }}>
        <TodoList />
      </div>

      <div style={{ marginTop: 30 }}>
        <Counter />
      </div>
    </div>
  )
}
