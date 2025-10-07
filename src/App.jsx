import {Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import UploadPage from './Components/UploadPage'
import FlipbookPreview from './Components/FlipbookPreview'

function App() {
  return (
    <>
    <Router>
      <Routes>
        <Route path='/Flip_Book_Customize' element={<UploadPage/>}/>
        <Route path='/Flip_Book_Customize/flipbook' element={<FlipbookPreview/>}/>
      </Routes>
    </Router>
    {/* <FlipbookSplit/> */}
    </>
  )
}

export default App
