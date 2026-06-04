import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)
  const [displayCount, setDisplayCount] = useState(0) // Bug: 使用了不同的变量来显示

  function increment() {
    setCount(count + 1)
  }

  function decrement() {
    setCount(count - 1)
  }

  // Bug: 重置按钮样式设为不可见
  function reset() {
    setCount(0)
    setDisplayCount(0)
  }

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
      <h2>计数器</h2>
      {/* Bug: 显示的是 displayCount 而不是 count */}
      <div style={{ fontSize: 48, fontWeight: 'bold', textAlign: 'center', margin: '16px 0' }}>
        {displayCount}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
        <button
          onClick={decrement}
          style={{ padding: '8px 16px', background: '#E74C3C', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          -1
        </button>
        <button
          onClick={reset}
          style={{ padding: '8px 16px', background: '#95A5A6', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', visibility: 'hidden' }}
        >
          重置
        </button>
        <button
          onClick={increment}
          style={{ padding: '8px 16px', background: '#2ECC71', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          +1
        </button>
      </div>
    </div>
  )
}
