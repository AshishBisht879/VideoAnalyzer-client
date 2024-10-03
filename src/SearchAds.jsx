import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './SearchAds.css';
import { Link } from 'react-router-dom';

const ADS_SEARCH_URL = process.env.REACT_APP_ADS_SEARCH_URL;
const ServerURL = process.env.REACT_APP_SERVER_URL;

const fetchVideoUrls = async (asset_id) => {
  const response = await axios.get(`${ServerURL}/getSignedUrl/${asset_id}.mp4`);
  if (response.status === 200) {
    return response.data.signedUrl;
  } else {
    console.log("Not Success Response while generating signed URL", response.status);
    return null
  }
};

function SearchAds() {

  const [query, setQuery] = useState('');
  const [searchResults, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const searchInputRef = useRef(null);

  const handleSearch = async (event) => {
    event.preventDefault();
    const minWordCount = 1;

    if (!query) return;

    const trimmed_query = query.trim().replace(/\s+/g,' ');

    if (trimmed_query === '' || trimmed_query.split(' ').length < minWordCount) {
      // Handle case when query is too short
      alert(`Please enter at least ${minWordCount} words for your search.`);
      return;
    }


    setIsLoading(true);
    setError(null);

    try {
      const payload = { "query": query }
      const headers = {
        'Content-Type': 'application/json'
      };
      
      const response = await axios.post(ADS_SEARCH_URL, payload, { headers });
      if (response.status === 200 && response.data) {
        const data = response.data;
   
        const updatedResults = await Promise.all(
          data.map(async (item) => {
            const videoUrl = await fetchVideoUrls(item.id);
            return { ...item, url: videoUrl }; 
          })
        );
   
        console.log(updatedResults);
        setResults(updatedResults || []);
      }
    } catch (error) {
      console.error('Error fetching search results:', error);
      setError('An error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {

    //Automatically focus on the search input when component mounts
    searchInputRef.current.focus();

    // Optional: Reset state on component unmount (cleanup)
    return () => {
      setResults([]);
      setError(null);
      setIsLoading(false);
    };
  }, []);

  const handleKeyPress = (event)=>{
    if(event.key === 'Enter'){
      handleSearch(event)
    }
  }

  return (
    <div className="App">
      <header className="header">
        <h1 className="tagline">Ads Search Tool</h1>
        <Link className="ads-search-tool" to="/" target="_blank" rel="noopener noreferrer">
          <img src="/hyperlink-icon.png" alt="Hyperlink" className="hyperlink-icon" />
          Ads Classify Tool
        </Link>
      </header>

      <div className="search-container" id="search-container">
        <input
          type="text"
          id="searchInput"
          className="search-input"
          placeholder="Search Ads..."
          value={query}
          ref={searchInputRef}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDownCapture={handleKeyPress} //Triggers when key is pressed
        />
        <button type="button" className="search-button" onClick={handleSearch}>
          Search
        </button>
      </div>

      {isLoading && <p className="loading">Loading results...</p>}
      {error && <p className="error">{error}</p>}

      {searchResults?.length > 0 && (
        <div className='results-info'>
        <p>Total Results : {searchResults.length}</p>
        </div>
      )}

      {searchResults.length > 0 && (
  <div className="results" id="results">
    <div className="results-grid"> 
      {searchResults.map((item, index) => (
        <div key={index} className="result-item">
          <video src={item["url"]} controls ></video>
          <div>
            <span>Brand: {(item.final_brand).split(':')[0]}</span>
            <span>Category: {item.final_category}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
)}

      {searchResults.length === 0 && !isLoading && <p>No results found for your search.</p>}
    </div>
  );
}

export default SearchAds;