import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { StoreContext, rootStore } from './stores'

function App() {
  return (
    <StoreContext.Provider value={rootStore}>
      <RouterProvider router={router} />
    </StoreContext.Provider>
  )
}

export default App
