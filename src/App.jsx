
import { BrowserRouter, Routes, Route} from 'react-router-dom';
import SearchAds from './SearchAds';
import AdsClassifictionTool from './AdsClassification';

function App() {
  
  return (
  <BrowserRouter>
    <Routes>
          <Route path="/" element={<AdsClassifictionTool />} /> {/* Main App component */}
          <Route path="/ad-search" element={<SearchAds />} />
        </Routes>
  </BrowserRouter>
);
}

export default App;
