import { Route, Routes } from 'react-router-dom'
import Layout from './Layout.jsx'
import Home from './pages/Home/Home.jsx'
import VerbList from './pages/VerbList/VerbList.jsx'
import Progress from './pages/Progress/Progress.jsx'
import Test from './pages/Test/Test.jsx'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/verbs" element={<VerbList />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/test" element={<Test />} />
      </Routes>
    </Layout>
  )
}

export default App
