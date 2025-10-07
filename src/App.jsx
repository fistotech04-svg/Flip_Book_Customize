import {Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import UploadPage from './Components/UploadPage'
import FlipbookPreview from './Components/FlipbookPreview'

function App() {
  return (
    <>
    <Router basename="/Flip_Book_Customize">
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/flipbook" element={<FlipbookPreview />} />
      </Routes>
    </Router>
    {/* <FlipbookSplit/> */}
    </>
  )
}

export default App
