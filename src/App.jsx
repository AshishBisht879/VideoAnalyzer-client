import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import Dropdown from './components/Dropdown/Dropdown.jsx';
import DropdownItem from './components/DropdownItem/DropdownItem.jsx';
const ServerURL = process.env.REACT_APP_SERVER_URL
function App() {
  const [videoUrl, setVideoUrl] = useState('');
  const inputRef = useRef();
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [progess, setProgess] = useState(0);
  const [uploadStatus, setUploadStatus] = useState();
  const [analysisData, setAnalysisData] = useState(null);
  const [pastAnalyzedVideos, setPastAnalyzedVideos] = useState([]);
  // const [selectedVideo, setSelectedVideo] = useState('');
  const [DropdownText,setDropDownText] = useState('Choose Video')

  useEffect(() => {
    fetchPastAnalyzedVideos();
    const intervalID = setInterval(fetchPastAnalyzedVideos, 4000) //called every 4 seconds
    return () => clearInterval(intervalID)
  }, []);

  const fetchPastAnalyzedVideos = async () => {
    try {
      const response = await axios.get(`${ServerURL}/records`);
      setPastAnalyzedVideos(response.data);
    } catch (error) {
      console.error("There was an error fetching the videos!", error);
    }
  };

  const handleVideoUpload = async (event) => {
    try {
      if (event.target.files && event.target.files.length > 0) {
        const file = event.target.files[0];
        setUploadedVideo(file)
        setAnalysisData(null); // Clear the old analysis result
        setUploadStatus("Uploding");
        setDropDownText('Choose Video')
        const formData = new FormData();
        formData.append("video", file)

        const response = await axios.post(`${ServerURL}/upload`, formData, {
          headers: {
            'Content-Type':'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round(progressEvent.loaded * 100) / progressEvent.total
            setProgess(percent)
          }
        })
        console.log("Video Upload Response", response)
        setUploadStatus("Done")

        setTimeout(() => {
          setUploadedVideo(null); // make the status bar of uploading video disapper after 7 seconds of uploading
        }, 7000); 
      }
    }
    catch (e) {
      console.log(e)
      setUploadStatus("Error")
      setTimeout(() => {
        setUploadedVideo(null);
      }, 7000);
    }
  };  

  const handleVideoSelect = async (video_data) => {
    const selectedName = video_data.video_path;
    const selectedVideoData = pastAnalyzedVideos.find(video => video.video_path === selectedName);
    // setSelectedVideo(selectedName);
    const video_name = selectedName.split('/')[1]
    setDropDownText(video_name)
    const response = await axios.get(`${ServerURL}/getSignedUrl/${video_name}`);
    console.log("Video Select Signed Response = ", response)
    setVideoUrl(response.data.signedUrl);
    console.log(selectedVideoData)
    setAnalysisData(selectedVideoData);
  };


  return (
    <div className="App">
      <header className="header">
        <h1 className="tagline">Video Analyzer Tool</h1>
      </header>
        <div className="control-panel">
          <div className="upload-btn">
            <label htmlFor="videoUpload">Upload Video</label>
            <input id="videoUpload" ref={inputRef} type="file" accept="video/*" onChange={handleVideoUpload} />
          </div>
          {uploadedVideo && (
            <div className='file-info'>
              <div>
                <div>{uploadedVideo.name}</div>
                <div style={{ color: "#FF5833" }}>{uploadStatus}...</div>
                <div className='progress-bar'>
                  <div className='progress' style={{ width: `${progess}%` }} />
                </div>
              </div>
            </div>
          )}
          <Dropdown buttonText={DropdownText} content={
            <>
              {pastAnalyzedVideos.map((video, index) => (
                <DropdownItem key={index} onClick={() => handleVideoSelect(video)}>
                  {/* {`${video.video_path.split('/')[1]}`} */}
                  <span className={`${video.status === 1 ? 'status status-green' : video.status===0 ? 'status status-orange' : 'status'}`}>{`${video.status?(video.status===1?"Done":video.status===0?"Analyzing":"Unknown"):"Unknown"}`}</span>
                </DropdownItem>
              ))
              }
            </>
          } />
          {/* <select className="video-select" onChange={handleVideoSelect} value={selectedVideo}>
            <option value="" disabled>Select Past Analyzed Video</option>
            {pastAnalyzedVideos.map((video, index) => (
              <option key={index} value={video.filename}>
                {video.filename.split('.')[0]}
                {' - '}
                {video.status}
              </option>
            ))}
          </select> */}
        </div>
      {(videoUrl && analysisData) && (
        <div className="content">
          <div className="video-container">
            <video controls className="video-player">
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
          <div className="analysis-container">
            {
              <>
                <h1>Analysis Result:</h1>
                {analysisData?(
                  <>
                  <div className="analysis-column">
                  <h3>Video Intelligence (Visual Text + Detected Brands):</h3>
                  {analysisData.brands_video_gcp?(
                  <ul>
                    {/* {analysisData.brands_video_gcp.detectedTexts.map((text, index) => (
                      <li key={index}>{text}</li>
                    ))} */}
                    {Object.keys(analysisData.brands_video_gcp).map((logo, index) => (
                      <li key={index}>{logo} - {(analysisData.brands_video_gcp[logo] * 100).toFixed(1) + '%'}</li>
                    ))}
                  </ul>
                  ):(<p>Analyzing or Some Internal Error</p>)
                    }
                </div>
                <div className="analysis-column">
                  <h3>Gemini (Audio Transcript Brands):</h3>
                  {analysisData.brands_audio.gemini_results?(<ul>
                    {analysisData.brands_audio.gemini_results.map((brand, index) => (
                      <li key={index}>{brand}</li>
                    ))}
                  </ul>):(<p>Analyzing or Some Internal Error</p>)}
                  
                </div>
                <div className="analysis-column">
                  <h3>Comprehend (Audio Transcript Brands):</h3>
                  {analysisData.brands_audio.comprehend_results?(<ul>
                    {
                      analysisData.brands_audio.comprehend_results.map((brand, index) => (
                        <li key={index}>{brand}</li>
                      ))}
                  </ul>):(<p>Analyzing or Some Internal Error</p>)}
                </div>
                <div className="analysis-column">
                  <h3>Category (IAB Categorization):</h3>
                  {analysisData.iab_category?(<ul>
                    {analysisData.iab_category.category.map((brand, index) => (
                      <li key={index}>{brand}</li>
                    ))}
                  </ul>):(<p>Analyzing or Some Internal Error</p>)}
                  
                </div>
                </>
                ):(<p>No Analysis data available.</p>)}
              </>
            }
          </div>
        </div>
      )}
    </div>
  );
}

export default App;