import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from './Layout.jsx'
import Home from './pages/Home/Home.jsx'
import VerbList from './pages/VerbList/VerbList.jsx'
import Help from './pages/Help/Help.jsx'
import Test from './pages/Test/Test.jsx'
import FillGaps from './pages/FillGaps/FillGaps.jsx'
import Crossword from './pages/Crossword/Crossword.jsx'

const Progress = lazy(() => import('./pages/Progress/Progress.jsx'))

function App() {
  const { t } = useTranslation()

  return (
    <Layout>
      <Suspense fallback={<p className="app-loading">{t('common.loading')}</p>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/verbs" element={<VerbList />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/help" element={<Help />} />
          <Route path="/test" element={<Test />} />
          <Route path="/fill-gaps" element={<FillGaps />} />
          <Route path="/crossword" element={<Crossword />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

export default App
